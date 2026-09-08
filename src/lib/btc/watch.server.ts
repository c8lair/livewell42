/**
 * Poll open Bitcoin orders against mempool.space and settle at 1+ confirmation.
 */
import { getSql } from "@/lib/db";
import {
  addressSummary,
  listAddressTxs,
  sumConfirmedReceived,
  sumMempoolReceived,
} from "./mempool.server";
import { btcToSats, satsToBtc, shortfallWithinUsd } from "./rates.server";
import {
  queueMail,
  setOrderMailError,
  clearOrderMailError,
} from "@/lib/mail.server";
import {
  buildOrderReceiptBody,
  orderReceiptSubject,
} from "@/lib/order-receipt";

type OpenOrder = {
  id: number;
  user_id: string;
  order_number: string;
  status: string;
  merchandise_cents: number;
  credit_cents: number;
  shipping_cents: number;
  total_cents: number;
  usd_total_cents: number | null;
  ship_name: string;
  ship_street: string;
  ship_city: string;
  ship_state: string;
  ship_zip: string;
  btc_amount: string | null;
  btc_rate: string | null;
  btc_rate_source: string | null;
  quote_expires_at: string | null;
  btc_address: string | null;
  btc_txid: string;
  btc_received: string;
  btc_status: string | null;
  btc_overpay_note: string;
};

async function loadTestnet(): Promise<boolean> {
  const sql = await getSql();
  try {
    const rows = await sql<{ btc_testnet: boolean }>`
      select btc_testnet from store_settings where id = 1`;
    return Boolean(rows[0]?.btc_testnet);
  } catch {
    return false;
  }
}

async function loadOwnerEmail(): Promise<string> {
  const sql = await getSql();
  const rows = await sql<{ owner_email: string; support_email: string }>`
    select owner_email, support_email from store_settings where id = 1`;
  return rows[0]?.owner_email || rows[0]?.support_email || "";
}

/**
 * Mark a pending BTC order paid: stock, credit, emails (with BTC details).
 * Idempotent via status='pending' guard.
 */
export async function finalizeBtcOrderPaid(
  orderId: number,
  opts: {
    txid: string;
    receivedBtc: string;
    overpayNote?: string;
  },
): Promise<boolean> {
  const sql = await getSql();
  const orders = await sql<OpenOrder>`
    select id, user_id, order_number, status, merchandise_cents, credit_cents,
      shipping_cents, total_cents, usd_total_cents, ship_name, ship_street,
      ship_city, ship_state, ship_zip, btc_amount, btc_rate, btc_rate_source,
      quote_expires_at, btc_address, btc_txid, btc_received, btc_status,
      btc_overpay_note
    from orders where id = ${orderId}`;
  const order = orders[0];
  if (!order || order.status !== "pending") return false;

  const updated = await sql<{ id: number }>`
    update orders set
      status = 'paid',
      btc_status = 'paid',
      btc_txid = ${opts.txid},
      btc_received = ${opts.receivedBtc},
      btc_overpay_note = ${opts.overpayNote ?? order.btc_overpay_note ?? ""}
    where id = ${orderId} and status = 'pending'
    returning id`;
  if (!updated[0]) return false;

  const items = await sql<{
    product_id: number | null;
    name: string;
    size_label: string;
    qty: number;
    price_cents: number;
  }>`select product_id, name, size_label, qty, price_cents from order_items where order_id = ${orderId}`;

  for (const item of items) {
    if (item.product_id != null) {
      await sql`update products set stock = stock - ${item.qty} where id = ${item.product_id}`;
    }
  }

  if (order.credit_cents > 0) {
    await sql`update profiles set credit_cents = 0 where user_id = ${order.user_id} and credit_cents > 0`;
  }

  const profiles = await sql<{ email: string }>`
    select email from profiles where user_id = ${order.user_id}`;
  const email = profiles[0]?.email ?? "";
  const owner = await loadOwnerEmail();
  const usd = order.usd_total_cents ?? order.total_cents;
  const receiptInput = {
    orderNumber: order.order_number,
    items,
    merchandiseCents: order.merchandise_cents,
    creditCents: order.credit_cents,
    shippingCents: order.shipping_cents,
    collectedCents: usd,
    shipName: order.ship_name,
    shipStreet: order.ship_street,
    shipCity: order.ship_city,
    shipState: order.ship_state,
    shipZip: order.ship_zip,
    paymentMethod: "Bitcoin" as const,
    btcTxid: opts.txid,
    adminNote: opts.overpayNote ?? order.btc_overpay_note ?? "",
  };
  // Owner/admin may keep shortfall/overpay notes; customer body has none.
  const ownerBody = [
    buildOrderReceiptBody(receiptInput, { audience: "owner" }),
    `BTC amount: ${order.btc_amount ?? ""}`,
    `BTC rate: ${order.btc_rate ?? ""} USD (${order.btc_rate_source ?? ""})`,
    `BTC address: ${order.btc_address ?? ""}`,
    `BTC received: ${opts.receivedBtc}`,
  ].join("\n");
  const customerBody = buildOrderReceiptBody(receiptInput, {
    audience: "customer",
  });
  const subject = orderReceiptSubject(order.order_number);

  await queueMail("order-owner", owner || email, subject, ownerBody);
  if (email) {
    try {
      await queueMail("order-customer", email, subject, customerBody);
      await clearOrderMailError(orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await setOrderMailError(orderId, msg);
    }
  }
  return true;
}

async function noteUnmatched(opts: {
  address: string;
  txid: string;
  amount: string;
  confirmed: boolean;
}) {
  const sql = await getSql();
  const inserted = await sql<{ id: number }>`
    insert into btc_unmatched_payments (address, txid, amount, confirmed)
    values (${opts.address}, ${opts.txid}, ${opts.amount}, ${opts.confirmed})
    on conflict (txid, address) do nothing
    returning id`;
  if (!inserted[0]) return;
  const owner = await loadOwnerEmail();
  await queueMail(
    "btc-unmatched",
    owner,
    "Unmatched Bitcoin payment",
    [
      `Address: ${opts.address}`,
      `Txid: ${opts.txid}`,
      `Amount: ${opts.amount} BTC`,
      `Confirmed: ${opts.confirmed ? "yes" : "no"}`,
      `No open quote matched this payment.`,
    ].join("\n"),
  );
}

export async function processOneBtcOrder(
  orderId: number,
): Promise<{ ok: true; btcStatus: string } | { ok: false; reason: string }> {
  const sql = await getSql();
  const testnet = await loadTestnet();
  const rows = await sql<OpenOrder>`
    select id, user_id, order_number, status, merchandise_cents, credit_cents,
      shipping_cents, total_cents, usd_total_cents, ship_name, ship_street,
      ship_city, ship_state, ship_zip, btc_amount, btc_rate, btc_rate_source,
      quote_expires_at, btc_address, btc_txid, btc_received, btc_status,
      btc_overpay_note
    from orders where id = ${orderId} and deleted_at is null`;
  const order = rows[0];
  if (!order) return { ok: false, reason: "Order not found." };
  if (order.status === "paid" || order.btc_status === "paid") {
    return { ok: true, btcStatus: "paid" };
  }
  if (order.btc_status === "cancelled") {
    return { ok: true, btcStatus: "cancelled" };
  }
  if (!order.btc_address || !order.btc_amount) {
    return { ok: false, reason: "Order missing BTC quote fields." };
  }

  const now = Date.now();
  const expires = order.quote_expires_at
    ? new Date(order.quote_expires_at).getTime()
    : 0;
  const quoteOpen =
    order.btc_status !== "expired" &&
    order.btc_status !== "cancelled" &&
    (!expires || now <= expires);

  let txs;
  let summary;
  try {
    txs = await listAddressTxs(order.btc_address, testnet);
    summary = await addressSummary(order.btc_address, testnet);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "mempool lookup failed",
    };
  }

  const quoted = btcToSats(order.btc_amount);
  const confirmedRecv = sumConfirmedReceived(txs);
  const mempoolRecv = sumMempoolReceived(txs);
  const totalInbound = confirmedRecv + mempoolRecv;
    // Prefer a confirmed covering tx; else any inbound txid for display
  const coveringConfirmed = txs.find(
    (t) => t.confirmed && t.confirmations >= 1 && t.receivedSats > 0n,
  );
  const anyInbound = txs.find((t) => t.receivedSats > 0n);
  const displayTxid =
    coveringConfirmed?.txid ||
    anyInbound?.txid ||
    order.btc_txid ||
    "";

  // Paid: confirmed exact or over
  if (confirmedRecv >= quoted && quoted > 0n) {
    const over =
      confirmedRecv > quoted
        ? `Received ${confirmedRecv.toString()} sats / quoted ${quoted.toString()} sats (overpay ${satsToBtc(confirmedRecv - quoted)} BTC)`
        : "";
    await finalizeBtcOrderPaid(order.id, {
      txid: coveringConfirmed?.txid || displayTxid,
      receivedBtc: satsToBtc(confirmedRecv),
      overpayNote: over,
    });
    return { ok: true, btcStatus: "paid" };
  }

  // Paid: dust shortfall within <$1 USD at invoice btc_rate (not a later spot rate)
  if (
    confirmedRecv > 0n &&
    confirmedRecv < quoted &&
    order.btc_rate &&
    shortfallWithinUsd(quoted, confirmedRecv, order.btc_rate, 100)
  ) {
    const note = `Received ${confirmedRecv.toString()} sats / quoted ${quoted.toString()} sats (shortfall within $1)`;
    await finalizeBtcOrderPaid(order.id, {
      txid: coveringConfirmed?.txid || displayTxid,
      receivedBtc: satsToBtc(confirmedRecv),
      overpayNote: note,
    });
    return { ok: true, btcStatus: "paid" };
  }

  // Short by ≥ $1 at invoice rate: keep pending on same address; update received + txid.
  // Prefer customer-facing `seen` (do not set underpaid / no top-up UI).
  if (confirmedRecv > 0n && confirmedRecv < quoted) {
    await sql`
      update orders set
        btc_status = 'seen',
        btc_received = ${satsToBtc(confirmedRecv)},
        btc_txid = ${displayTxid}
      where id = ${order.id} and status = 'pending'`;
    return { ok: true, btcStatus: "seen" };
  }

  // Seen: mempool inbound (0-conf — do NOT mark paid). Never expire after a hit.
  if (mempoolRecv > 0n) {
    await sql`
      update orders set
        btc_status = 'seen',
        btc_received = ${satsToBtc(mempoolRecv)},
        btc_txid = ${displayTxid}
      where id = ${order.id} and status = 'pending'
        and (btc_status is null or btc_status in ('waiting', 'seen', 'underpaid', 'expired'))`;
    return { ok: true, btcStatus: "seen" };
  }

  // Never expire after any inbound mempool/confirmed activity or status `seen`
  const hasInbound =
    totalInbound > 0n ||
    order.btc_status === "seen" ||
    order.btc_status === "underpaid" ||
    btcToSats(order.btc_received || "0") > 0n;
  if (!quoteOpen && hasInbound) {
    if (order.btc_status === "underpaid" || order.btc_status === "expired") {
      await sql`
        update orders set btc_status = 'seen'
        where id = ${order.id} and status = 'pending'`;
    }
    return { ok: true, btcStatus: "seen" };
  }

  // Expired quote — only when no mempool/inbound hit ever
  if (!quoteOpen) {
    if (order.btc_status !== "expired") {
      await sql`
        update orders set btc_status = 'expired'
        where id = ${order.id} and status = 'pending'
          and btc_status is distinct from 'paid'
          and btc_status is distinct from 'seen'`;
    }
    return { ok: true, btcStatus: "expired" };
  }

  // Still waiting
  if (order.btc_status !== "waiting" && order.btc_status !== "seen") {
    await sql`
      update orders set btc_status = 'waiting'
      where id = ${order.id} and status = 'pending' and btc_status is null`;
  }

  void summary;

  return { ok: true, btcStatus: order.btc_status || "waiting" };
}

export async function processOpenBtcOrders(): Promise<{
  checked: number;
  paid: number;
  errors: string[];
}> {
  const sql = await getSql();
  const open = await sql<{ id: number }>`
    select id from orders
    where deleted_at is null
      and payment_rail = 'btc'
      and status = 'pending'
      and btc_status in ('waiting', 'seen', 'underpaid')
    order by id asc
    limit 100`;

  // Expire waiting quotes past expiry only if never seen / no inbound sats
  const stale = await sql<{ id: number }>`
    select id from orders
    where deleted_at is null
      and payment_rail = 'btc'
      and status = 'pending'
      and btc_status = 'waiting'
      and quote_expires_at is not null
      and quote_expires_at < now()
      and (btc_received is null or btc_received = '' or btc_received = '0')
    limit 50`;

  const ids = new Set<number>([
    ...open.map((r) => r.id),
    ...stale.map((r) => r.id),
  ]);

  let paid = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      const res = await processOneBtcOrder(id);
      if (res.ok && res.btcStatus === "paid") paid += 1;
      if (!res.ok) errors.push(`#${id}: ${res.reason}`);
    } catch (err) {
      errors.push(`#${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Scan customer addresses for unmatched payments (no open quote)
  try {
    await scanUnmatchedOnProfiles();
  } catch (err) {
    errors.push(
      `unmatched-scan: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return { checked: ids.size, paid, errors };
}

async function scanUnmatchedOnProfiles() {
  const sql = await getSql();
  const testnet = await loadTestnet();
  const profiles = await sql<{
    user_id: string;
    btc_address: string;
  }>`select user_id, btc_address from profiles where btc_address <> '' limit 200`;

  for (const p of profiles) {
    const open = await sql<{ id: number }>`
      select id from orders
      where user_id = ${p.user_id}
        and payment_rail = 'btc'
        and status = 'pending'
        and btc_status in ('waiting', 'seen', 'underpaid')
        and deleted_at is null
      limit 1`;
    if (open[0]) continue;

    let txs;
    try {
      txs = await listAddressTxs(p.btc_address, testnet);
    } catch {
      continue;
    }
    // Only flag recent inbound that is not already tied to a paid order txid
    for (const tx of txs.slice(0, 5)) {
      if (tx.receivedSats <= 0n) continue;
      const known = await sql<{ id: number }>`
        select id from orders
        where btc_txid = ${tx.txid} or (btc_address = ${p.btc_address} and status = 'paid')
        limit 1`;
      if (known[0]) continue;
      await noteUnmatched({
        address: p.btc_address,
        txid: tx.txid,
        amount: satsToBtc(tx.receivedSats),
        confirmed: tx.confirmed,
      });
    }
  }
}

export async function processBtcOrderByToken(token: string) {
  const sql = await getSql();
  const rows = await sql<{ id: number }>`
    select id from orders where payment_token = ${token} and deleted_at is null limit 1`;
  if (!rows[0]) return { ok: false as const, reason: "Not found" };
  return processOneBtcOrder(rows[0].id);
}
