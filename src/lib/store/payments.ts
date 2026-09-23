import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import {
  buildOrderReceiptBody,
  orderReceiptSubject,
} from "@/lib/order-receipt";
import { loadSettings } from "./settings";
import { queueMail } from "./helpers";

export type FinalizeResult =
  | { ok: true; kind: "membership" | "order"; already?: boolean }
  | { ok: false; status: string; reason: string };

async function findSessionByNp(np: string) {
  const sql = await getSql();
  const byNexa = await sql<{
    id: number;
    kind: string;
    user_id: string;
    order_id: number | null;
    status: string;
    amount_cents: number;
    nexapay_order_id: string;
    client_ref: string;
  }>`select id, kind, user_id, order_id, status, amount_cents, nexapay_order_id, client_ref from nexapay_sessions where nexapay_order_id = ${np} or client_ref = ${np} limit 1`;
  return byNexa[0] ?? null;
}

/**
 * Idempotent finalize after NexaPay reports completed.
 * Safe to call from success page and webhook. `np` may be nexapay order_id or our client_ref.
 */
export async function finalizePayment(np: string): Promise<FinalizeResult> {
  const sql = await getSql();
  const settings = await loadSettings();
  if (!settings.nexapay_api_key) {
    return { ok: false, status: "error", reason: "NexaPay API key missing." };
  }

  const session = await findSessionByNp(np);
  const nexapayOrderId = session?.nexapay_order_id ?? np;

  const { getPayment } = await import("@/lib/nexapay.server");
  const payment = await getPayment(settings.nexapay_api_key, nexapayOrderId);
  const status = String(payment.status ?? "").toLowerCase();
  if (status !== "completed") {
    return {
      ok: false,
      status: status || "unknown",
      reason:
        status === "cancelled" || status === "canceled"
          ? "Payment was cancelled."
          : `Payment is not completed (status: ${status || "unknown"}).`,
    };
  }

  if (!session) {
    const orders = await sql<{
      id: number;
      user_id: string;
      status: string;
    }>`select id, user_id, status from orders where payment_ref = ${nexapayOrderId}`;
    const order = orders[0];
    if (!order) {
      return {
        ok: false,
        status: "missing",
        reason: "No matching NexaPay session or order found.",
      };
    }
    if (order.status !== "pending") {
      return { ok: true, kind: "order", already: true };
    }
    await finalizeOrderPaid(order.id, order.user_id);
    return { ok: true, kind: "order", already: false };
  }

  if (session.status === "completed") {
    return {
      ok: true,
      kind: session.kind as "membership" | "order",
      already: true,
    };
  }

  if (session.kind === "membership") {
    const profiles = await sql<{
      membership_paid_at: string | null;
      email: string;
    }>`select membership_paid_at, email from profiles where user_id = ${session.user_id}`;
    const profile = profiles[0];
    if (profile?.membership_paid_at) {
      await sql`update nexapay_sessions set status = 'completed' where id = ${session.id}`;
      return { ok: true, kind: "membership", already: true };
    }
    await sql`update profiles set membership_paid_at = now(), credit_cents = 500 where user_id = ${session.user_id} and membership_paid_at is null`;
    const email = profile?.email ?? "";
    const to = email || settings.owner_email;
    await queueMail(
      "membership",
      settings.owner_email || to,
      "New Livewell42 membership",
      `Member ${email || session.user_id} paid $5 via card (NexaPay ${nexapayOrderId}). Credit of $5 will apply to their first order.`,
    );
    await sql`update nexapay_sessions set status = 'completed' where id = ${session.id}`;
    return { ok: true, kind: "membership", already: false };
  }

  const orderId = session.order_id;
  if (!orderId) {
    return {
      ok: false,
      status: "error",
      reason: "NexaPay session missing order_id.",
    };
  }
  const orders = await sql<{ status: string; user_id: string }>`
    select status, user_id from orders where id = ${orderId}`;
  const order = orders[0];
  if (!order) {
    return { ok: false, status: "missing", reason: "Order not found." };
  }
  if (order.status !== "pending") {
    await sql`update nexapay_sessions set status = 'completed' where id = ${session.id}`;
    return { ok: true, kind: "order", already: true };
  }
  await finalizeOrderPaid(orderId, order.user_id);
  await sql`update nexapay_sessions set status = 'completed' where id = ${session.id}`;
  return { ok: true, kind: "order", already: false };
}

export async function finalizeOrderPaid(orderId: number, userId: string) {
  const sql = await getSql();
  const settings = await loadSettings();
  const orders = await sql<{
    id: number;
    user_id: string;
    status: string;
    order_number: string;
    credit_cents: number;
    merchandise_cents: number;
    shipping_cents: number;
    total_cents: number;
    ship_name: string;
    ship_street: string;
    ship_city: string;
    ship_state: string;
    ship_zip: string;
    payment_rail: string;
  }>`select id, user_id, status, order_number, credit_cents, merchandise_cents, shipping_cents, total_cents, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail from orders where id = ${orderId}`;
  const order = orders[0];
  if (!order || order.status !== "pending") return;

  const updated = await sql<{ id: number }>`update orders set status = 'paid' where id = ${orderId} and status = 'pending' returning id`;
  if (!updated[0]) return;

  const items = await sql<{
    product_id: number | null;
    name: string;
    size_label: string;
    qty: number;
    price_cents: number;
  }>`select product_id, name, size_label, qty, price_cents from order_items where order_id = ${orderId}`;

  for (const item of items) {
    if (item.product_id != null) {
      const reserved = await sql<{ id: number }>`
        update products set stock = stock - ${item.qty}
        where id = ${item.product_id} and stock >= ${item.qty}
        returning id`;
      if (!reserved[0]) {
        await queueMail(
          "stock-short",
          settings.owner_email,
          `Stock short on ${order.order_number}`,
          `Paid order ${order.order_number} needed ${item.qty} of product ${item.product_id} (${item.name}) but stock was insufficient. Fulfill manually.`,
        );
      }
    }
  }

  if (order.credit_cents > 0) {
    await sql`update profiles set credit_cents = 0 where user_id = ${userId} and credit_cents > 0`;
  }

  const profiles = await sql<{ email: string }>`select email from profiles where user_id = ${userId}`;
  const email = profiles[0]?.email ?? "";
  const paymentMethod =
    order.payment_rail === "btc" ? ("Bitcoin" as const) : ("Card" as const);
  const receiptInput = {
    orderNumber: order.order_number,
    items,
    merchandiseCents: order.merchandise_cents,
    creditCents: order.credit_cents,
    shippingCents: order.shipping_cents,
    collectedCents: order.total_cents,
    shipName: order.ship_name,
    shipStreet: order.ship_street,
    shipCity: order.ship_city,
    shipState: order.ship_state,
    shipZip: order.ship_zip,
    paymentMethod,
  };
  const ownerBody = buildOrderReceiptBody(receiptInput, { audience: "owner" });
  const customerBody = buildOrderReceiptBody(receiptInput, {
    audience: "customer",
  });
  const subject = orderReceiptSubject(order.order_number);

  await queueMail(
    "order-owner",
    settings.owner_email || email,
    subject,
    ownerBody,
  );
  if (email) {
    try {
      await queueMail("order-customer", email, subject, customerBody);
      const { clearOrderMailError } = await import("@/lib/mail.server");
      await clearOrderMailError(orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const { setOrderMailError } = await import("@/lib/mail.server");
      await setOrderMailError(orderId, msg);
    }
  }
}

export const confirmNexaPayPayment = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    return finalizePayment(data.orderId);
  });
