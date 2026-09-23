import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { LOWER_48_CODES } from "@/lib/us-states";
import { shippingCents } from "@/lib/money";
import { mapProduct, type Product, type ProductRow } from "./types";
import { loadSettings, publicize } from "./settings";
import { ensureProfile } from "./profile";
import { nexaUrls, newClientRef } from "./helpers";

export const getBootstrap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser();
    const me = await ensureProfile(context.userId, session?.email ?? null);
    const settings = publicize(await loadSettings());
    let products: Product[] = [];
    if ((me.member || me.isAdmin) && me.legalAcceptedAt) {
      const sql = await getSql();
      const rows = await sql<ProductRow>`select id, name, size_label, category, price_cents, stock, coa_url, active, sort_order from products where active = true order by lower(name), id`;
      products = rows.map(mapProduct);
    }
    return { me, settings, products };
  });

export const acceptLegal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(context.userId, null);
    await sql`update profiles set legal_accepted_at = now() where user_id = ${context.userId}`;
    return { ok: true };
  });

export const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(async () => {
  return { siteKey: process.env.TURNSTILE_SITE_KEY?.trim() ?? "" };
});

export const verifyTurnstile = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().trim().min(1).max(2048) }))
  .handler(async ({ data }) => {
    const secret = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
    if (!secret) {
      throw new Error("Turnstile is not configured on the server.");
    }
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", data.token);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    if (!json.success) {
      throw new Error("Turnstile verification failed. Try again.");
    }
    return { ok: true as const };
  });

export const payMembership = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rail: z.enum(["card", "btc"]),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const me = await ensureProfile(context.userId, null);
    if (!me.legalAcceptedAt) throw new Error("Confirm the sign-in statements first.");
    if (me.member) return { ok: true, already: true };
    const sql = await getSql();
    const settings = await loadSettings();

    if (data.rail === "btc" && !settings.btc_enabled) {
      throw new Error("Bitcoin checkout is disabled.");
    }

    if (
      data.rail === "card" &&
      (!settings.nexapay_enabled || !settings.nexapay_api_key?.trim())
    ) {
      throw new Error("Card checkout is temporarily off.");
    }

    if (data.rail === "btc") {
      const { createBtcMembershipQuote } = await import("@/lib/btc/checkout.server");
      return createBtcMembershipQuote({
        userId: context.userId,
        email: me.email,
        ownerEmail: settings.owner_email,
      });
    }

    if (!settings.nexapay_api_key) {
      throw new Error(
        "NexaPay API key is not configured. Add it in Admin → Settings before taking card payments.",
      );
    }

    const clientRef = newClientRef();
    const urls = nexaUrls(clientRef);
    const { createPayment } = await import("@/lib/nexapay.server");
    const payment = await createPayment(settings.nexapay_api_key, {
      amount: 5,
      currency: "USD",
      crypto: "USDC",
      description: `livewell42:membership:${context.userId}`,
      customer_email: me.email || settings.support_email || "member@livewell42.com",
      success_url: urls.success_url,
      cancel_url: urls.cancel_url,
      callback_url: urls.callback_url,
    });

    await sql`insert into nexapay_sessions (kind, user_id, order_id, nexapay_order_id, client_ref, amount_cents, status)
      values ('membership', ${context.userId}, null, ${payment.order_id}, ${clientRef}, 500, 'pending')
      on conflict (nexapay_order_id) do nothing`;

    return { checkoutUrl: payment.checkout_url, nexapayOrderId: payment.order_id };
  });

const checkoutSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(99) }))
    .min(1),
  shipName: z.string().trim().min(1).max(80),
  shipStreet: z.string().trim().min(1).max(120),
  shipCity: z.string().trim().min(1).max(80),
  shipState: z.string().trim().length(2),
  shipZip: z.string().trim().regex(/^\d{5}(-\d{4})?$/),
  rail: z.enum(["card", "btc"]),
});

const ZIP_RE = /^\d{5}(-\d{4})?$/;

function validateCheckoutInput(input: unknown) {
  const raw =
    input && typeof input === "object" && "data" in (input as object)
      ? (input as { data: unknown }).data
      : input;
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const shipName = String(o.shipName ?? "").trim();
  const shipStreet = String(o.shipStreet ?? "").trim();
  const shipCity = String(o.shipCity ?? "").trim();
  const shipState = String(o.shipState ?? "").trim().toUpperCase();
  const shipZip = String(o.shipZip ?? "").trim();

  if (shipZip && !ZIP_RE.test(shipZip)) {
    throw new Error("Error: enter a 5-digit ZIP");
  }
  if (!shipState || shipState.length !== 2 || !LOWER_48_CODES.has(shipState)) {
    throw new Error("Error: choose a state we ship to");
  }
  if (!shipName || !shipStreet || !shipCity || !shipZip) {
    throw new Error("Error: please enter shipping address");
  }

  const parsed = checkoutSchema.safeParse({
    ...o,
    shipName,
    shipStreet,
    shipCity,
    shipState,
    shipZip,
  });
  if (!parsed.success) {
    throw new Error("Error: please enter shipping address");
  }
  return parsed.data;
}

export const placeOrder = createServerFn({ method: "POST" })
  .validator(validateCheckoutInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const me = await ensureProfile(context.userId, null);
    if (!me.legalAcceptedAt) throw new Error("Confirm the sign-in statements first.");
    if (!me.member && !me.isAdmin) throw new Error("Membership required.");
    const sql = await getSql();
    const settings = await loadSettings();

    if (data.rail === "btc" && !settings.btc_enabled) {
      throw new Error("Bitcoin checkout is disabled.");
    }

    if (
      data.rail === "card" &&
      (!settings.nexapay_enabled || !settings.nexapay_api_key?.trim())
    ) {
      throw new Error("Card checkout is temporarily off.");
    }

    const ids = data.items.map((i) => i.productId);
    const products = await sql<ProductRow>`select id, name, size_label, category, price_cents, stock, coa_url, active, sort_order from products`;
    const wanted = new Set(ids);
    const byId = new Map(products.filter((p) => wanted.has(p.id)).map((p) => [p.id, p]));

    let merchandise = 0;
    const lines: { product: ProductRow; qty: number }[] = [];
    for (const item of data.items) {
      const p = byId.get(item.productId);
      if (!p || !p.active) throw new Error("An item is no longer available.");
      if (p.stock < item.qty) throw new Error(`${p.name} is sold out or low on stock.`);
      merchandise += p.price_cents * item.qty;
      lines.push({ product: p, qty: item.qty });
    }

    const credit = Math.min(me.creditCents, merchandise);
    const ship = shippingCents(
      merchandise,
      settings.free_shipping_at_cents,
      settings.shipping_cents,
    );
    const total = merchandise - credit + ship;
    const seq = await sql<{ c: number }>`select count(*)::int as c from orders`;
    const orderNumber = `LW42-${String(1001 + (seq[0]?.c ?? 0))}`;

    if (data.rail === "btc") {
      const { createBtcProductOrder } = await import("@/lib/btc/checkout.server");
      return createBtcProductOrder({
        userId: context.userId,
        email: me.email,
        orderNumber,
        merchandise,
        credit,
        ship,
        total,
        shipName: data.shipName,
        shipStreet: data.shipStreet,
        shipCity: data.shipCity,
        shipState: data.shipState,
        shipZip: data.shipZip,
        lines,
        ownerEmail: settings.owner_email,
      });
    }

    if (!settings.nexapay_api_key) {
      throw new Error(
        "NexaPay API key is not configured. Add it in Admin → Settings before taking card payments.",
      );
    }

    const inserted = await sql<{ id: number }>`
      insert into orders (
        user_id, order_number, merchandise_cents, credit_cents, shipping_cents, total_cents,
        status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, payment_ref
      ) values (
        ${context.userId}, ${orderNumber}, ${merchandise}, ${credit}, ${ship}, ${total},
        'pending', ${data.shipName}, ${data.shipStreet}, ${data.shipCity}, ${data.shipState}, ${data.shipZip},
        'card', ''
      ) returning id`;
    const orderId = inserted[0].id;

    for (const line of lines) {
      await sql`insert into order_items (order_id, product_id, name, size_label, qty, price_cents)
        values (${orderId}, ${line.product.id}, ${line.product.name}, ${line.product.size_label}, ${line.qty}, ${line.product.price_cents})`;
    }

    const clientRef = newClientRef();
    const urls = nexaUrls(clientRef);
    const { createPayment } = await import("@/lib/nexapay.server");
    const payment = await createPayment(settings.nexapay_api_key, {
      amount: total / 100,
      currency: "USD",
      crypto: "USDC",
      description: `livewell42:order:${orderNumber}`,
      customer_email: me.email || settings.support_email || "member@livewell42.com",
      success_url: urls.success_url,
      cancel_url: urls.cancel_url,
      callback_url: urls.callback_url,
    });

    await sql`update orders set payment_ref = ${payment.order_id} where id = ${orderId}`;
    await sql`insert into nexapay_sessions (kind, user_id, order_id, nexapay_order_id, client_ref, amount_cents, status)
      values ('order', ${context.userId}, ${orderId}, ${payment.order_id}, ${clientRef}, ${total}, 'pending')
      on conflict (nexapay_order_id) do nothing`;

    return { checkoutUrl: payment.checkout_url, nexapayOrderId: payment.order_id, orderNumber, totalCents: total };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<{
      order_number: string;
      total_cents: number;
      status: string;
      tracking: string;
      created_at: string;
      payment_rail: string;
    }>`select order_number, total_cents, status, tracking, created_at, payment_rail
      from orders
      where user_id = ${context.userId} and deleted_at is null
      order by id desc`;
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ orderNumber: z.string().trim().min(1).max(40) }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const orders = await sql<{
      id: number;
      order_number: string;
      merchandise_cents: number;
      credit_cents: number;
      shipping_cents: number;
      total_cents: number;
      status: string;
      tracking: string;
      created_at: string;
      ship_name: string;
      ship_street: string;
      ship_city: string;
      ship_state: string;
      ship_zip: string;
      payment_rail: string;
      btc_txid: string;
    }>`select id, order_number, merchandise_cents, credit_cents, shipping_cents,
        total_cents, status, tracking, created_at, ship_name, ship_street,
        ship_city, ship_state, ship_zip, payment_rail, coalesce(btc_txid, '') as btc_txid
      from orders
      where user_id = ${context.userId}
        and order_number = ${data.orderNumber}
        and deleted_at is null
      limit 1`;
    const order = orders[0];
    if (!order) throw new Error("Order not found.");
    const items = await sql<{
      name: string;
      size_label: string;
      qty: number;
      price_cents: number;
    }>`select name, size_label, qty, price_cents from order_items where order_id = ${order.id}`;
    return { order, items };
  });
