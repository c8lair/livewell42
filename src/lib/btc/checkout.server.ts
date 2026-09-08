/**
 * Bitcoin product-order quote creation + payment-page server fns.
 * Never returns zpub to callers.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { deriveAddress, isZpubConfigured } from "./zpub.server";
import {
  getBtcUsdRate,
  remainingBtc,
  usdCentsToBtc,
  btcToSats,
  satsToBtc,
} from "./rates.server";
import { processBtcOrderByToken } from "./watch.server";
import { explorerTxUrl } from "./mempool.server";

const SITE_ORIGIN = "https://livewell42.com";
const QUOTE_MINUTES = 15;

export type BtcSettingsSlice = {
  btc_enabled: boolean;
  btc_zpub: string;
  btc_next_index: number;
  btc_min_cents: number;
  btc_testnet: boolean;
};

export async function loadBtcSettings(): Promise<BtcSettingsSlice> {
  const sql = await getSql();
  const empty: BtcSettingsSlice = {
    btc_enabled: false,
    btc_zpub: "",
    btc_next_index: 0,
    btc_min_cents: 2500,
    btc_testnet: false,
  };
  try {
    const rows = await sql<BtcSettingsSlice>`
      select btc_enabled, btc_zpub, btc_next_index, btc_min_cents, btc_testnet
      from store_settings where id = 1`;
    if (!rows[0]) return empty;
    return {
      btc_enabled: Boolean(rows[0].btc_enabled),
      btc_zpub: rows[0].btc_zpub ?? "",
      btc_next_index: rows[0].btc_next_index ?? 0,
      btc_min_cents: rows[0].btc_min_cents ?? 2500,
      btc_testnet: Boolean(rows[0].btc_testnet),
    };
  } catch {
    return empty;
  }
}

function newPaymentToken(): string {
  return randomBytes(24).toString("base64url");
}

async function queueMail(
  kind: string,
  to: string,
  subject: string,
  body: string,
) {
  if (!to) return;
  const sql = await getSql();
  await sql`insert into mail_log (kind, to_email, subject, body) values (${kind}, ${to}, ${subject}, ${body})`;
}

export type CreateBtcOrderInput = {
  userId: string;
  email: string;
  orderNumber: string;
  merchandise: number;
  credit: number;
  ship: number;
  total: number;
  shipName: string;
  shipStreet: string;
  shipCity: string;
  shipState: string;
  shipZip: string;
  lines: Array<{
    product: {
      id: number;
      name: string;
      size_label: string;
      price_cents: number;
    };
    qty: number;
  }>;
  ownerEmail: string;
};

/**
 * Create pending BTC quote order (no stock decrement).
 * If customer already has an open unpaid BTC order, return that payment URL instead.
 */
export async function createBtcProductOrder(
  input: CreateBtcOrderInput,
): Promise<{
  paymentUrl: string;
  orderNumber: string;
  totalCents: number;
  reused?: boolean;
}> {
  const sql = await getSql();
  const btc = await loadBtcSettings();

  if (!btc.btc_enabled) throw new Error("Bitcoin checkout is disabled.");
  if (!isZpubConfigured(btc.btc_zpub)) {
    throw new Error("Bitcoin payments are not configured yet. Try card checkout.");
  }
  if (input.total < btc.btc_min_cents) {
    throw new Error(
      `Bitcoin checkout requires a minimum of $${(btc.btc_min_cents / 100).toFixed(2)}.`,
    );
  }

  // Reuse open unpaid BTC order for this customer
  const existing = await sql<{
    payment_token: string;
    order_number: string;
    total_cents: number;
  }>`
    select payment_token, order_number, total_cents from orders
    where user_id = ${input.userId}
      and payment_rail = 'btc'
      and status = 'pending'
      and deleted_at is null
      and btc_status in ('waiting', 'seen', 'underpaid')
      and payment_token is not null
      and payment_token <> ''
    order by id desc
    limit 1`;
  if (existing[0]?.payment_token) {
    return {
      paymentUrl: `${SITE_ORIGIN}/pay/btc/${existing[0].payment_token}`,
      orderNumber: existing[0].order_number,
      totalCents: existing[0].total_cents,
      reused: true,
    };
  }

  // Assign/reuse profile.btc_address
  const profiles = await sql<{
    btc_address: string;
    btc_derivation_index: number | null;
  }>`select btc_address, btc_derivation_index from profiles where user_id = ${input.userId}`;
  let address = (profiles[0]?.btc_address ?? "").trim();
  let derIndex = profiles[0]?.btc_derivation_index;

  if (!address) {
    const locked = await sql<{
      btc_next_index: number;
      btc_zpub: string;
      btc_testnet: boolean;
    }>`
      update store_settings
      set btc_next_index = btc_next_index + 1
      where id = 1
      returning btc_next_index, btc_zpub, btc_testnet`;
    const nextAfter = locked[0]?.btc_next_index ?? 1;
    derIndex = nextAfter - 1;
    address = deriveAddress(
      locked[0]?.btc_zpub || btc.btc_zpub,
      derIndex,
      Boolean(locked[0]?.btc_testnet ?? btc.btc_testnet),
    );
    await sql`
      update profiles
      set btc_address = ${address}, btc_derivation_index = ${derIndex}
      where user_id = ${input.userId}`;
  }

  const { rate, source } = await getBtcUsdRate();
  const btcAmount = usdCentsToBtc(input.total, rate);
  const expires = new Date(Date.now() + QUOTE_MINUTES * 60_000);
  const token = newPaymentToken();

  const inserted = await sql<{ id: number }>`
    insert into orders (
      user_id, order_number, merchandise_cents, credit_cents, shipping_cents, total_cents,
      usd_total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip,
      payment_rail, payment_ref,
      btc_amount, btc_rate, btc_rate_source, quote_expires_at,
      btc_address, btc_derivation_index, btc_txid, btc_received, btc_status,
      payment_token
    ) values (
      ${input.userId}, ${input.orderNumber}, ${input.merchandise}, ${input.credit},
      ${input.ship}, ${input.total}, ${input.total},
      'pending', ${input.shipName}, ${input.shipStreet}, ${input.shipCity},
      ${input.shipState}, ${input.shipZip},
      'btc', '',
      ${btcAmount}, ${rate}, ${source}, ${expires.toISOString()},
      ${address}, ${derIndex ?? null}, '', '0', 'waiting',
      ${token}
    ) returning id`;
  const orderId = inserted[0].id;

  for (const line of input.lines) {
    await sql`
      insert into order_items (order_id, product_id, name, size_label, qty, price_cents)
      values (
        ${orderId}, ${line.product.id}, ${line.product.name},
        ${line.product.size_label}, ${line.qty}, ${line.product.price_cents}
      )`;
  }

  const paymentUrl = `${SITE_ORIGIN}/pay/btc/${token}`;
  const itemLines = input.lines
    .map((l) => `${l.qty} × ${l.product.name} ${l.product.size_label}`)
    .join("\n");
  const money = (n: number) => `$${(n / 100).toFixed(2)}`;
  const body = [
    `Order ${input.orderNumber}`,
    itemLines,
    `Pay exactly ${btcAmount} BTC (≈ ${money(input.total)}) within ${QUOTE_MINUTES} minutes.`,
    `Payment page: ${paymentUrl}`,
    `Address: ${address}`,
    `Rate: ${rate} USD/BTC (${source})`,
    `For laboratory research use only. Not for human consumption.`,
  ].join("\n");

  if (input.email) {
    await queueMail(
      "btc-quote",
      input.email,
      `Livewell42 Bitcoin payment ${input.orderNumber}`,
      body,
    );
  }
  await queueMail(
    "btc-quote-owner",
    input.ownerEmail || input.email,
    `Livewell42 BTC quote ${input.orderNumber}`,
    body,
  );

  return {
    paymentUrl,
    orderNumber: input.orderNumber,
    totalCents: input.total,
  };
}

export type BtcPaymentView = {
  orderNumber: string;
  status: string;
  btcStatus: string;
  usdTotalCents: number;
  btcAmount: string;
  btcReceived: string;
  btcRemaining: string;
  address: string;
  bip21: string;
  quoteExpiresAt: string | null;
  txid: string;
  explorerTxUrl: string | null;
  testnet: boolean;
  overpayNote: string;
  paid: boolean;
};

function buildBip21(address: string, amount: string, label = "Livewell42"): string {
  const params = new URLSearchParams();
  params.set("amount", amount);
  params.set("label", label);
  return `bitcoin:${address}?${params.toString()}`;
}

export const getBtcPayment = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().trim().min(8).max(128) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    // Trigger watcher for this order
    try {
      await processBtcOrderByToken(data.token);
    } catch {
      /* ignore poll errors — still return quote */
    }

    const btc = await loadBtcSettings();
    const rows = await sql<{
      order_number: string;
      status: string;
      btc_status: string | null;
      usd_total_cents: number | null;
      total_cents: number;
      btc_amount: string | null;
      btc_received: string;
      btc_address: string | null;
      quote_expires_at: string | null;
      btc_txid: string;
      btc_overpay_note: string;
    }>`
      select order_number, status, btc_status, usd_total_cents, total_cents,
        btc_amount, btc_received, btc_address, quote_expires_at, btc_txid,
        btc_overpay_note
      from orders
      where payment_token = ${data.token} and deleted_at is null
      limit 1`;
    const o = rows[0];
    if (!o || !o.btc_address || !o.btc_amount) {
      throw new Error("Payment not found.");
    }
    const remaining = remainingBtc(o.btc_amount, o.btc_received || "0");
    const amountForQr =
      o.btc_status === "underpaid" && btcToSats(remaining) > 0n
        ? remaining
        : o.btc_amount;
    const paid = o.status === "paid" || o.btc_status === "paid";
    const view: BtcPaymentView = {
      orderNumber: o.order_number,
      status: o.status,
      btcStatus: o.btc_status || "waiting",
      usdTotalCents: o.usd_total_cents ?? o.total_cents,
      btcAmount: o.btc_amount,
      btcReceived: o.btc_received || "0",
      btcRemaining: remaining,
      address: o.btc_address,
      bip21: buildBip21(o.btc_address, amountForQr),
      quoteExpiresAt: o.quote_expires_at,
      txid: o.btc_txid || "",
      explorerTxUrl: o.btc_txid
        ? explorerTxUrl(o.btc_txid, btc.btc_testnet)
        : null,
      testnet: btc.btc_testnet,
      overpayNote: o.btc_overpay_note || "",
      paid,
    };
    return view;
  });

export const refreshBtcQuote = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().trim().min(8).max(128) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: number;
      status: string;
      btc_status: string | null;
      btc_amount: string | null;
      btc_received: string;
      btc_address: string | null;
      usd_total_cents: number | null;
      total_cents: number;
    }>`
      select id, status, btc_status, btc_amount, btc_received, btc_address,
        usd_total_cents, total_cents
      from orders where payment_token = ${data.token} and deleted_at is null
      limit 1`;
    const o = rows[0];
    if (!o || !o.btc_address || !o.btc_amount) {
      throw new Error("Payment not found.");
    }
    if (o.status === "paid" || o.btc_status === "paid") {
      throw new Error("Already paid.");
    }
    if (o.btc_status === "cancelled") {
      throw new Error("This quote was cancelled.");
    }

    const remaining = remainingBtc(o.btc_amount, o.btc_received || "0");
    if (btcToSats(remaining) <= 0n && o.btc_status !== "underpaid") {
      // Full amount still owed — refresh full quote with new rate
    }

    const { rate, source } = await getBtcUsdRate();
    let newAmount: string;
    if (o.btc_status === "underpaid" && btcToSats(o.btc_received || "0") > 0n) {
      // Keep remaining in BTC terms; optionally reprice remaining USD
      const usdLeft =
        o.usd_total_cents ??
        o.total_cents;
      // Prefer sat difference of original quote
      newAmount = remaining;
      if (btcToSats(newAmount) <= 0n) {
        throw new Error("Nothing remaining to pay.");
      }
      void usdLeft;
    } else {
      const usd = o.usd_total_cents ?? o.total_cents;
      newAmount = usdCentsToBtc(usd, rate);
    }

    const expires = new Date(Date.now() + QUOTE_MINUTES * 60_000);
    await sql`
      update orders set
        btc_amount = ${
          o.btc_status === "underpaid"
            ? satsToBtc(btcToSats(o.btc_received || "0") + btcToSats(newAmount))
            : newAmount
        },
        btc_rate = ${rate},
        btc_rate_source = ${source},
        quote_expires_at = ${expires.toISOString()},
        btc_status = ${o.btc_status === "underpaid" ? "underpaid" : "waiting"}
      where id = ${o.id} and status = 'pending'`;

    // Return fresh view (re-run watcher + load)
    try {
      await processBtcOrderByToken(data.token);
    } catch {
      /* ignore */
    }
    const btc = await loadBtcSettings();
    const fresh = await sql<{
      order_number: string;
      status: string;
      btc_status: string | null;
      usd_total_cents: number | null;
      total_cents: number;
      btc_amount: string | null;
      btc_received: string;
      btc_address: string | null;
      quote_expires_at: string | null;
      btc_txid: string;
      btc_overpay_note: string;
    }>`
      select order_number, status, btc_status, usd_total_cents, total_cents,
        btc_amount, btc_received, btc_address, quote_expires_at, btc_txid,
        btc_overpay_note
      from orders where payment_token = ${data.token} and deleted_at is null
      limit 1`;
    const f = fresh[0];
    if (!f || !f.btc_address || !f.btc_amount) throw new Error("Payment not found.");
    const rem = remainingBtc(f.btc_amount, f.btc_received || "0");
    const amountForQr =
      f.btc_status === "underpaid" && btcToSats(rem) > 0n ? rem : f.btc_amount;
    return {
      orderNumber: f.order_number,
      status: f.status,
      btcStatus: f.btc_status || "waiting",
      usdTotalCents: f.usd_total_cents ?? f.total_cents,
      btcAmount: f.btc_amount,
      btcReceived: f.btc_received || "0",
      btcRemaining: rem,
      address: f.btc_address,
      bip21: buildBip21(f.btc_address, amountForQr),
      quoteExpiresAt: f.quote_expires_at,
      txid: f.btc_txid || "",
      explorerTxUrl: f.btc_txid ? explorerTxUrl(f.btc_txid, btc.btc_testnet) : null,
      testnet: btc.btc_testnet,
      overpayNote: f.btc_overpay_note || "",
      paid: f.status === "paid" || f.btc_status === "paid",
    } satisfies BtcPaymentView;
  });

async function requireAdminUser(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ is_admin: boolean }>`
    select is_admin from profiles where user_id = ${userId}`;
  if (!rows[0]?.is_admin) throw new Error("Admin only.");
}

export const adminCancelBtcQuote = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdminUser(context.userId);
    const sql = await getSql();
    await sql`
      update orders set btc_status = 'cancelled'
      where id = ${data.orderId}
        and payment_rail = 'btc'
        and status = 'pending'`;
    return { ok: true as const };
  });

export const adminMarkBtcPaid = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.number().int(),
      txid: z.string().trim().max(128).optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdminUser(context.userId);
    const { finalizeBtcOrderPaid } = await import("./watch.server");
    const sql = await getSql();
    const rows = await sql<{
      btc_amount: string | null;
      btc_txid: string;
      btc_received: string;
    }>`select btc_amount, btc_txid, btc_received from orders where id = ${data.orderId}`;
    const o = rows[0];
    if (!o) throw new Error("Order not found.");
    await finalizeBtcOrderPaid(data.orderId, {
      txid: (data.txid || o.btc_txid || "manual").trim(),
      receivedBtc: o.btc_received && o.btc_received !== "0"
        ? o.btc_received
        : o.btc_amount || "0",
      overpayNote: "Marked paid manually by admin",
    });
    return { ok: true as const };
  });

export const adminNoteUnmatched = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdminUser(context.userId);
    const sql = await getSql();
    await sql`update btc_unmatched_payments set noted = true where id = ${data.id}`;
    return { ok: true as const };
  });
