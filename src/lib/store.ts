import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { LOWER_48_CODES } from "@/lib/us-states";
import { shippingCents } from "@/lib/money";

export type Product = {
  id: number;
  name: string;
  sizeLabel: string;
  category: string;
  priceCents: number;
  stock: number;
  coaUrl: string;
  active: boolean;
  sortOrder: number;
};

export type PublicSettings = {
  storeName: string;
  supportEmail: string;
  shippingCents: number;
  freeShippingAtCents: number;
  usdcWallet: string;
  btcWallet: string;
  nexapayConfigured: boolean;
  nexapayEnabled: boolean;
  bannerEnabled: boolean;
  bannerText: string;
  btcEnabled: boolean;
  /** Minimum order total (cents) for Bitcoin checkout. Never exposes zpub. */
  btcMinCents: number;
  btcTestnet: boolean;
  testBitcoinPayments: boolean;
};

export type Me = {
  userId: string;
  email: string;
  isAdmin: boolean;
  member: boolean;
  creditCents: number;
  legalAcceptedAt: string | null;
};

type ProductRow = {
  id: number;
  name: string;
  size_label: string;
  category: string;
  price_cents: number;
  stock: number;
  coa_url: string;
  active: boolean;
  sort_order: number;
};

type SettingsRow = {
  store_name: string;
  support_email: string;
  owner_email: string;
  shipping_cents: number;
  free_shipping_at_cents: number;
  nexapay_api_key: string;
  nexapay_webhook_secret: string;
  usdc_wallet: string;
  btc_wallet: string;
  banner_enabled: boolean;
  banner_text: string;
  btc_enabled: boolean;
  nexapay_enabled: boolean;
  btc_zpub: string;
  btc_next_index: number;
  btc_min_cents: number;
  btc_testnet: boolean;
  test_bitcoin_payments: boolean;
};

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    sizeLabel: r.size_label,
    category: r.category,
    priceCents: r.price_cents,
    stock: r.stock,
    coaUrl: r.coa_url,
    active: r.active,
    sortOrder: r.sort_order,
  };
}

async function ensureProfile(
  userId: string,
  email: string | null | undefined,
): Promise<Me> {
  const sql = await getSql();
  const existing = await sql<{
    user_id: string;
    email: string;
    is_admin: boolean;
    membership_paid_at: string | null;
    credit_cents: number;
    legal_accepted_at: string | null;
  }>`select user_id, email, is_admin, membership_paid_at, credit_cents, legal_accepted_at from profiles where user_id = ${userId}`;

  if (existing[0]) {
    const p = existing[0];
    if (!p.membership_paid_at) {
      await sql`update profiles set membership_paid_at = now() where user_id = ${userId} and membership_paid_at is null`;
      p.membership_paid_at = new Date().toISOString();
    }
    return {
      userId: p.user_id,
      email: p.email,
      isAdmin: p.is_admin,
      member: Boolean(p.membership_paid_at),
      creditCents: p.credit_cents,
      legalAcceptedAt: p.legal_accepted_at,
    };
  }

  const admins = await sql<{ c: number }>`select count(*)::int as c from profiles where is_admin = true`;
  const isAdmin = (admins[0]?.c ?? 0) === 0;
  const mail = email ?? "";
  await sql`insert into profiles (user_id, email, is_admin, membership_paid_at) values (${userId}, ${mail}, ${isAdmin}, now())`;
  return {
    userId,
    email: mail,
    isAdmin,
    member: true,
    creditCents: 0,
    legalAcceptedAt: null,
  };
}

export async function getNexapayWebhookSecret(): Promise<string> {
  try {
    const sql = await getSql();
    try {
      const rows = await sql<{ nexapay_webhook_secret: string | null }>`
        select nexapay_webhook_secret from store_settings where id = 1`;
      const fromDb = (rows[0]?.nexapay_webhook_secret ?? "").trim();
      if (fromDb) return fromDb;
    } catch {
      /* column missing or DB blip — fall through to env */
    }
  } catch {
    /* ignore */
  }
  return process.env.NEXAPAY_WEBHOOK_SECRET?.trim() ?? "";
}

async function loadSettings(): Promise<SettingsRow> {
  const sql = await getSql();
  const empty: SettingsRow = {
    store_name: "Livewell42",
    support_email: "support@example.com",
    owner_email: "",
    shipping_cents: 1500,
    free_shipping_at_cents: 25000,
    nexapay_api_key: "",
    nexapay_webhook_secret: "",
    usdc_wallet: "",
    btc_wallet: "",
    banner_enabled: false,
    banner_text: "",
    btc_enabled: false,
    nexapay_enabled: true,
    btc_zpub: "",
    btc_next_index: 0,
    btc_min_cents: 2500,
    btc_testnet: false,
    test_bitcoin_payments: false,
  };

  type Row = SettingsRow;
  let r: Row | undefined;
  try {
    const rows = await sql<Row>`select store_name, support_email, owner_email, shipping_cents, free_shipping_at_cents, nexapay_api_key, nexapay_webhook_secret, usdc_wallet, btc_wallet, banner_enabled, banner_text, btc_enabled, nexapay_enabled, btc_zpub, btc_next_index, btc_min_cents, btc_testnet, test_bitcoin_payments from store_settings where id = 1`;
    r = rows[0];
  } catch {
    // Column may be missing before migration 0010 applies — keep Admin/shop up.
    try {
      const rows = await sql<{
        store_name: string;
        support_email: string;
        owner_email: string;
        shipping_cents: number;
        free_shipping_at_cents: number;
        nexapay_api_key: string;
        usdc_wallet: string;
        btc_wallet: string;
        banner_enabled: boolean;
        banner_text: string;
        btc_enabled: boolean;
        nexapay_enabled: boolean;
      }>`select store_name, support_email, owner_email, shipping_cents, free_shipping_at_cents, nexapay_api_key, usdc_wallet, btc_wallet, banner_enabled, banner_text, btc_enabled, nexapay_enabled from store_settings where id = 1`;
      r = rows[0]
        ? {
            ...rows[0],
            nexapay_webhook_secret: "",
            btc_zpub: "",
            btc_next_index: 0,
            btc_min_cents: 2500,
            btc_testnet: false,
            test_bitcoin_payments: false,
          }
        : undefined;
    } catch {
      r = undefined;
    }
  }

  if (!r) {
    try {
      await sql`insert into store_settings (id, store_name) values (1, 'Livewell42') on conflict (id) do nothing`;
    } catch {
      /* ignore */
    }
    return empty;
  }
  if (r.store_name === "Alder") {
    await sql`update store_settings set store_name = 'Livewell42' where id = 1 and store_name = 'Alder'`;
    r.store_name = "Livewell42";
  }
  r.nexapay_webhook_secret = r.nexapay_webhook_secret ?? "";
  r.btc_zpub = r.btc_zpub ?? "";
  r.btc_next_index = r.btc_next_index ?? 0;
  r.btc_min_cents = r.btc_min_cents ?? 2500;
  r.btc_testnet = Boolean(r.btc_testnet);
  r.test_bitcoin_payments = Boolean(r.test_bitcoin_payments);
  return r;
}

function publicize(s: SettingsRow): PublicSettings {
  return {
    storeName: s.store_name,
    supportEmail: s.support_email,
    shippingCents: s.shipping_cents,
    freeShippingAtCents: s.free_shipping_at_cents,
    usdcWallet: s.usdc_wallet,
    btcWallet: s.btc_wallet,
    nexapayConfigured: Boolean(s.nexapay_api_key),
    // Card is on only when the admin toggle is on AND an API key is saved.
    nexapayEnabled: Boolean(s.nexapay_enabled) && Boolean(s.nexapay_api_key?.trim()),
    bannerEnabled: Boolean(s.banner_enabled),
    bannerText: s.banner_text ?? "",
    // Bitcoin is on only when enabled AND zpub is configured (never expose zpub).
    btcEnabled: Boolean(s.btc_enabled) && Boolean(s.btc_zpub?.trim()),
    btcMinCents: s.btc_min_cents ?? 2500,
    btcTestnet: Boolean(s.btc_testnet),
    testBitcoinPayments: Boolean(s.test_bitcoin_payments),
  };
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


const SITE_ORIGIN = "https://livewell42.com";

function nexaUrls(npRef: string) {
  return {
    success_url: `${SITE_ORIGIN}/checkout/success?np=${encodeURIComponent(npRef)}`,
    cancel_url: `${SITE_ORIGIN}/checkout/success?cancelled=1`,
    callback_url: `${SITE_ORIGIN}/api/nexapay/webhook`,
  };
}

function newClientRef() {
  return `lw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

type FinalizeResult =
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

async function finalizeOrderPaid(orderId: number, userId: string) {
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
      await sql`update products set stock = stock - ${item.qty} where id = ${item.product_id}`;
    }
  }

  if (order.credit_cents > 0) {
    await sql`update profiles set credit_cents = 0 where user_id = ${userId} and credit_cents > 0`;
  }

  const profiles = await sql<{ email: string }>`select email from profiles where user_id = ${userId}`;
  const email = profiles[0]?.email ?? "";
  const itemLines = items
    .map((l) => `${l.qty} × ${l.name} ${l.size_label}`)
    .join("\n");
  const money = (n: number) => `${(n / 100).toFixed(2)}`;
  const body = [
    `Order ${order.order_number}`,
    itemLines,
    `Ship to: ${order.ship_name}, ${order.ship_street}, ${order.ship_city}, ${order.ship_state} ${order.ship_zip}`,
    `Merchandise ${money(order.merchandise_cents)}`,
    order.credit_cents ? `Membership credit -${money(order.credit_cents)}` : null,
    `Shipping ${order.shipping_cents === 0 ? "FREE" : money(order.shipping_cents)}`,
    `Collected ${money(order.total_cents)} via ${order.payment_rail}`,
    `For laboratory research use only. Not for human consumption.`,
  ]
    .filter(Boolean)
    .join("\n");

  await queueMail(
    "order-owner",
    settings.owner_email || email,
    `Livewell42 order ${order.order_number}`,
    body,
  );
  if (email) {
    await queueMail(
      "order-customer",
      email,
      `Livewell42 receipt ${order.order_number}`,
      body,
    );
  }
}

export const confirmNexaPayPayment = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.string().trim().min(1).max(200) }))
  .handler(async ({ data }) => {
    return finalizePayment(data.orderId);
  });

export const getBootstrap = createServerFn({ method: "GET" })
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
      await sql`update profiles set membership_paid_at = now(), credit_cents = 500 where user_id = ${context.userId} and membership_paid_at is null`;
      const to = me.email || settings.owner_email;
      await queueMail(
        "membership",
        settings.owner_email || to,
        "New Livewell42 membership",
        `Member ${me.email || context.userId} paid $5 via btc. Credit of $5 will apply to their first order.`,
      );
      return { ok: true, already: false };
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
    let ship = shippingCents(
      merchandise,
      settings.free_shipping_at_cents,
      settings.shipping_cents,
    );
    let total = merchandise - credit + ship;
    // Test Bitcoin payments alone (mainnet or testnet) → $0 shipping; not tied to btc_testnet.
    if (settings.test_bitcoin_payments) {
      ship = 0;
      total = Math.max(0, merchandise - credit);
    }
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

    // Card → NexaPay: pending until finalize
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
    }>`select order_number, total_cents, status, tracking, created_at from orders where user_id = ${context.userId} and deleted_at is null order by id desc`;
  });

async function requireAdmin(userId: string) {
  const me = await ensureProfile(userId, null);
  if (!me.isAdmin) throw new Error("Admin only.");
  return me;
}

/** One-time repair: signed-in owner email (or known operator Gmail) becomes admin. */
export const repairOwnerAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const session = await getSessionUser();
    const email = (session?.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("Sign in first.");

    const settings = await loadSettings();
    const owner = (settings.owner_email || "").trim().toLowerCase();
    const knownOperator = "c8lair@gmail.com";
    if (email !== owner && email !== knownOperator) {
      throw new Error("Only the owner email can repair operator access.");
    }

    await ensureProfile(context.userId, email);
    const sql = await getSql();
    await sql`update profiles set is_admin = true, email = ${email} where user_id = ${context.userId}`;
    if (!owner) {
      await sql`update store_settings set owner_email = ${email} where id = 1`;
    }
    return { ok: true as const };
  });

export const adminGet = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const loaded = await loadSettings();
    // Never echo zpub or webhook secret to the admin client.
    const settings = {
      ...loaded,
      nexapay_webhook_secret: "",
      btc_zpub: "",
      btc_next_index: 0, // never expose derivation cursor
    };
    const products = await sql<ProductRow>`select id, name, size_label, category, price_cents, stock, coa_url, active, sort_order from products order by lower(name), id`;
    const orderCols = {
      id: 0 as number,
      order_number: "" as string,
      user_id: "" as string,
      merchandise_cents: 0 as number,
      credit_cents: 0 as number,
      shipping_cents: 0 as number,
      total_cents: 0 as number,
      status: "" as string,
      ship_name: "" as string,
      ship_street: "" as string,
      ship_city: "" as string,
      ship_state: "" as string,
      ship_zip: "" as string,
      payment_rail: "" as string,
      tracking: "" as string,
      created_at: "" as string,
      deleted_at: null as string | null,
      btc_status: null as string | null,
      btc_amount: null as string | null,
      btc_address: null as string | null,
      btc_txid: "" as string,
      btc_received: "" as string,
      quote_expires_at: null as string | null,
      payment_token: null as string | null,
    };
    type AdminOrderRow = typeof orderCols;
    let orders: AdminOrderRow[] = [];
    let archivedOrders: AdminOrderRow[] = [];
    try {
      orders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at, btc_status, btc_amount, btc_address, btc_txid, btc_received, quote_expires_at, payment_token from orders where deleted_at is null order by id desc limit 200`;
      archivedOrders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at, btc_status, btc_amount, btc_address, btc_txid, btc_received, quote_expires_at, payment_token from orders where deleted_at is not null order by deleted_at desc limit 200`;
    } catch {
      orders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at from orders where deleted_at is null order by id desc limit 200`;
      archivedOrders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at from orders where deleted_at is not null order by deleted_at desc limit 200`;
    }
    const items = await sql<{
      order_id: number;
      name: string;
      size_label: string;
      qty: number;
      price_cents: number;
    }>`select order_id, name, size_label, qty, price_cents from order_items`;
    const members = await sql<{
      email: string;
      membership_paid_at: string | null;
      credit_cents: number;
    }>`select email, membership_paid_at, credit_cents from profiles order by created_at desc`;
    const sales = await sql<{
      order_count: number;
      ytd_cents: number;
      mtd_cents: number;
    }>`select
        count(*)::int as order_count,
        coalesce(sum(total_cents), 0)::int as ytd_cents,
        coalesce(sum(case when created_at >= date_trunc('month', now()) then total_cents else 0 end), 0)::int as mtd_cents
      from orders where deleted_at is null`;
    const mail = await sql<{
      id: number;
      kind: string;
      to_email: string;
      subject: string;
      created_at: string;
      body: string;
    }>`select id, kind, to_email, subject, created_at, body from mail_log order by id desc limit 40`;
    let unmatched: Array<{
      id: number;
      address: string;
      txid: string;
      amount: string;
      confirmed: boolean;
      created_at: string;
      noted: boolean;
    }> = [];
    try {
      unmatched = await sql`
        select id, address, txid, amount, confirmed, created_at, noted
        from btc_unmatched_payments
        order by id desc limit 50`;
    } catch {
      unmatched = [];
    }

    return {
      settings,
      nexapayWebhookSecretConfigured: Boolean(
        (loaded.nexapay_webhook_secret ?? "").trim(),
      ),
      btcZpubConfigured: Boolean((loaded.btc_zpub ?? "").trim()),
      products: products.map(mapProduct),
      orders,
      archivedOrders,
      items,
      members,
      sales: sales[0] ?? { order_count: 0, ytd_cents: 0, mtd_cents: 0 },
      mail,
      unmatchedBtc: unmatched,
    };
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().optional(),
      name: z.string().trim().min(1).max(80),
      sizeLabel: z.string().trim().max(40),
      category: z.enum(["peptide", "bac_water"]),
      priceDollars: z.string().trim(),
      stock: z.number().int().min(0),
      coaUrl: z.string().trim().max(500),
      active: z.boolean(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const priceCents = Math.round(Number(data.priceDollars) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) throw new Error("Invalid price.");
    const sql = await getSql();
    if (data.id) {
      await sql`update products set name = ${data.name}, size_label = ${data.sizeLabel}, category = ${data.category}, price_cents = ${priceCents}, stock = ${data.stock}, coa_url = ${data.coaUrl}, active = ${data.active} where id = ${data.id}`;
    } else {
      await sql`insert into products (name, size_label, category, price_cents, stock, coa_url, active, sort_order) values (${data.name}, ${data.sizeLabel}, ${data.category}, ${priceCents}, ${data.stock}, ${data.coaUrl}, ${data.active}, 50)`;
    }
    return { ok: true };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeName: z.string().trim().min(1).max(40),
      supportEmail: z.string().trim().max(120),
      ownerEmail: z.string().trim().max(120),
      shippingDollars: z.string().trim(),
      freeAtDollars: z.string().trim(),
      nexapayApiKey: z.string().trim().max(200),
      nexapayWebhookSecret: z.string().max(500).default(""),
      usdcWallet: z.string().trim().max(200),
      btcWallet: z.string().trim().max(200),
      bannerEnabled: z.boolean(),
      bannerText: z.string().trim().max(280),
      btcEnabled: z.boolean(),
      nexapayEnabled: z.boolean(),
      btcZpub: z.string().max(200).default(""),
      btcMinDollars: z.string().trim().default("25"),
      btcTestnet: z.boolean().default(false),
      testBitcoinPayments: z.boolean().default(false),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const shipping = Math.round(Number(data.shippingDollars) * 100);
    const freeAt = Math.round(Number(data.freeAtDollars) * 100);
    const sql = await getSql();

    // Make sure the column exists before writing (safe if already present).
    await sql.query(
      "alter table store_settings add column if not exists nexapay_webhook_secret text",
    );

    const btcMin = Math.round(Number(data.btcMinDollars) * 100);
    if (!Number.isFinite(btcMin) || btcMin < 0) {
      throw new Error("Invalid Bitcoin minimum.");
    }

    await sql.query(
      "alter table store_settings add column if not exists btc_zpub text not null default ''",
    );
    await sql.query(
      "alter table store_settings add column if not exists btc_min_cents integer not null default 2500",
    );
    await sql.query(
      "alter table store_settings add column if not exists btc_testnet boolean not null default false",
    );
    await sql.query(
      "alter table store_settings add column if not exists test_bitcoin_payments boolean not null default false",
    );

    await sql`update store_settings set
      store_name = ${data.storeName},
      support_email = ${data.supportEmail},
      owner_email = ${data.ownerEmail},
      shipping_cents = ${shipping},
      free_shipping_at_cents = ${freeAt},
      nexapay_api_key = ${data.nexapayApiKey},
      usdc_wallet = ${data.usdcWallet},
      btc_wallet = ${data.btcWallet},
      banner_enabled = ${data.bannerEnabled},
      banner_text = ${data.bannerText},
      btc_enabled = ${data.btcEnabled},
      nexapay_enabled = ${data.nexapayEnabled},
      btc_min_cents = ${btcMin},
      btc_testnet = ${data.btcTestnet},
      test_bitcoin_payments = ${data.testBitcoinPayments}
      where id = 1`;

    const webhookSecret = String(data.nexapayWebhookSecret ?? "").trim();
    if (webhookSecret) {
      await sql`update store_settings set nexapay_webhook_secret = ${webhookSecret} where id = 1`;
    }

    const zpub = String(data.btcZpub ?? "").trim();
    if (zpub) {
      // Validate by deriving index 0 (throws on bad key)
      const { deriveAddress } = await import("@/lib/btc/zpub.server");
      deriveAddress(zpub, 0, data.btcTestnet);
      await sql`update store_settings set btc_zpub = ${zpub} where id = 1`;
    }

    const check = await sql<{
      nexapay_webhook_secret: string | null;
      btc_zpub: string | null;
    }>`
      select nexapay_webhook_secret, btc_zpub from store_settings where id = 1`;
    const nexapayWebhookSecretConfigured = Boolean(
      (check[0]?.nexapay_webhook_secret ?? "").trim(),
    );
    const btcZpubConfigured = Boolean((check[0]?.btc_zpub ?? "").trim());
    return {
      ok: true as const,
      nexapayWebhookSecretConfigured,
      btcZpubConfigured,
    };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int(),
      status: z.enum(["paid", "packed", "shipped", "reshipped"]),
      tracking: z.string().trim().max(80),
      reshipNote: z.string().trim().max(200).optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`update orders set status = ${data.status}, tracking = ${data.tracking}, reship_note = ${data.reshipNote ?? ""} where id = ${data.id}`;
    if (data.status === "shipped" && data.tracking) {
      const order = await sql<{
        order_number: string;
        user_id: string;
      }>`select order_number, user_id from orders where id = ${data.id}`;
      const profile = await sql<{ email: string }>`select email from profiles where user_id = ${order[0]?.user_id ?? ""}`;
      if (profile[0]?.email) {
        await queueMail(
          "shipped",
          profile[0].email,
          `Shipped ${order[0].order_number}`,
          `Tracking: ${data.tracking}\nFor laboratory research use only.`,
        );
      }
    }
    return { ok: true };
  });

export const adminSoftDeleteOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`update orders set deleted_at = now() where id = ${data.id} and deleted_at is null`;
    return { ok: true as const };
  });

export const adminRestoreOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    await sql`update orders set deleted_at = null where id = ${data.id} and deleted_at is not null`;
    return { ok: true as const };
  });

export const adminSalesCsv = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      created_at: string;
      order_number: string;
      merchandise_cents: number;
      credit_cents: number;
      shipping_cents: number;
      total_cents: number;
      payment_rail: string;
      status: string;
    }>`select created_at, order_number, merchandise_cents, credit_cents, shipping_cents, total_cents, payment_rail, status from orders where deleted_at is null order by id`;
    const header = "date,order,merchandise,credit,shipping,collected,rail,status";
    const lines = rows.map(
      (r) =>
        `${r.created_at},${r.order_number},${(r.merchandise_cents / 100).toFixed(2)},${(r.credit_cents / 100).toFixed(2)},${(r.shipping_cents / 100).toFixed(2)},${(r.total_cents / 100).toFixed(2)},${r.payment_rail},${r.status}`,
    );
    return [header, ...lines].join("\n");
  });

