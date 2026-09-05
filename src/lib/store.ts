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
  bannerEnabled: boolean;
  bannerText: string;
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
  usdc_wallet: string;
  btc_wallet: string;
  banner_enabled: boolean;
  banner_text: string;
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
  await sql`insert into profiles (user_id, email, is_admin) values (${userId}, ${mail}, ${isAdmin})`;
  return {
    userId,
    email: mail,
    isAdmin,
    member: false,
    creditCents: 0,
    legalAcceptedAt: null,
  };
}

async function loadSettings(): Promise<SettingsRow> {
  const sql = await getSql();
  const rows = await sql<SettingsRow>`select store_name, support_email, owner_email, shipping_cents, free_shipping_at_cents, nexapay_api_key, usdc_wallet, btc_wallet, banner_enabled, banner_text from store_settings where id = 1`;
  const r = rows[0];
  if (!r) {
    await sql`insert into store_settings (id, store_name) values (1, 'Livewell42') on conflict (id) do nothing`;
    return {
      store_name: "Livewell42",
      support_email: "support@example.com",
      owner_email: "",
      shipping_cents: 1500,
      free_shipping_at_cents: 25000,
      nexapay_api_key: "",
      usdc_wallet: "",
      btc_wallet: "",
      banner_enabled: false,
      banner_text: "",
    };
  }
  if (r.store_name === "Alder") {
    await sql`update store_settings set store_name = 'Livewell42' where id = 1 and store_name = 'Alder'`;
    r.store_name = "Livewell42";
  }
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
    bannerEnabled: Boolean(s.banner_enabled),
    bannerText: s.banner_text ?? "",
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
      const rows = await sql<ProductRow>`select id, name, size_label, category, price_cents, stock, coa_url, active, sort_order from products where active = true order by sort_order, id`;
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
    await sql`update profiles set membership_paid_at = now(), credit_cents = 500 where user_id = ${context.userId} and membership_paid_at is null`;
    const settings = await loadSettings();
    const to = me.email || settings.owner_email;
    await queueMail(
      "membership",
      settings.owner_email || to,
      "New Livewell42 membership",
      `Member ${me.email || context.userId} paid $5 via ${data.rail}. Credit of $5 will apply to their first order.`,
    );
    return { ok: true, already: false };
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

export const placeOrder = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!LOWER_48_CODES.has(data.shipState)) {
      throw new Error("We only ship to the lower 48 states.");
    }
    const me = await ensureProfile(context.userId, null);
    if (!me.legalAcceptedAt) throw new Error("Confirm the sign-in statements first.");
    if (!me.member && !me.isAdmin) throw new Error("Membership required.");
    const sql = await getSql();
    const settings = await loadSettings();

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

    const inserted = await sql<{ id: number }>`
      insert into orders (
        user_id, order_number, merchandise_cents, credit_cents, shipping_cents, total_cents,
        status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, payment_ref
      ) values (
        ${context.userId}, ${orderNumber}, ${merchandise}, ${credit}, ${ship}, ${total},
        'paid', ${data.shipName}, ${data.shipStreet}, ${data.shipCity}, ${data.shipState}, ${data.shipZip},
        ${data.rail}, ${`demo-${Date.now()}`}
      ) returning id`;
    const orderId = inserted[0].id;

    for (const line of lines) {
      await sql`insert into order_items (order_id, product_id, name, size_label, qty, price_cents)
        values (${orderId}, ${line.product.id}, ${line.product.name}, ${line.product.size_label}, ${line.qty}, ${line.product.price_cents})`;
      await sql`update products set stock = stock - ${line.qty} where id = ${line.product.id}`;
    }

    if (credit > 0) {
      await sql`update profiles set credit_cents = 0 where user_id = ${context.userId}`;
    }

    const itemLines = lines
      .map((l) => `${l.qty} × ${l.product.name} ${l.product.size_label}`)
      .join("\n");
    const money = (n: number) => `$${(n / 100).toFixed(2)}`;
    const body = [
      `Order ${orderNumber}`,
      itemLines,
      `Ship to: ${data.shipName}, ${data.shipStreet}, ${data.shipCity}, ${data.shipState} ${data.shipZip}`,
      `Merchandise ${money(merchandise)}`,
      credit ? `Membership credit -${money(credit)}` : null,
      `Shipping ${ship === 0 ? "FREE" : money(ship)}`,
      `Collected ${money(total)} via ${data.rail}`,
      `For laboratory research use only. Not for human consumption.`,
    ]
      .filter(Boolean)
      .join("\n");

    await queueMail("order-owner", settings.owner_email || me.email, `Livewell42 order ${orderNumber}`, body);
    if (me.email) {
      await queueMail("order-customer", me.email, `Livewell42 receipt ${orderNumber}`, body);
    }

    return { orderNumber, totalCents: total };
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
    }>`select order_number, total_cents, status, tracking, created_at from orders where user_id = ${context.userId} order by id desc`;
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
    const settings = await loadSettings();
    const products = await sql<ProductRow>`select id, name, size_label, category, price_cents, stock, coa_url, active, sort_order from products order by sort_order, id`;
    const orders = await sql<{
      id: number;
      order_number: string;
      user_id: string;
      merchandise_cents: number;
      credit_cents: number;
      shipping_cents: number;
      total_cents: number;
      status: string;
      ship_name: string;
      ship_street: string;
      ship_city: string;
      ship_state: string;
      ship_zip: string;
      payment_rail: string;
      tracking: string;
      created_at: string;
    }>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at from orders order by id desc limit 200`;
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
      from orders`;
    const mail = await sql<{
      id: number;
      kind: string;
      to_email: string;
      subject: string;
      created_at: string;
      body: string;
    }>`select id, kind, to_email, subject, created_at, body from mail_log order by id desc limit 40`;
    return {
      settings,
      products: products.map(mapProduct),
      orders,
      items,
      members,
      sales: sales[0] ?? { order_count: 0, ytd_cents: 0, mtd_cents: 0 },
      mail,
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
      usdcWallet: z.string().trim().max(200),
      btcWallet: z.string().trim().max(200),
      bannerEnabled: z.boolean(),
      bannerText: z.string().trim().max(280),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const shipping = Math.round(Number(data.shippingDollars) * 100);
    const freeAt = Math.round(Number(data.freeAtDollars) * 100);
    const sql = await getSql();
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
      banner_text = ${data.bannerText}
      where id = 1`;
    return { ok: true };
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
    }>`select created_at, order_number, merchandise_cents, credit_cents, shipping_cents, total_cents, payment_rail, status from orders order by id`;
    const header = "date,order,merchandise,credit,shipping,collected,rail,status";
    const lines = rows.map(
      (r) =>
        `${r.created_at},${r.order_number},${(r.merchandise_cents / 100).toFixed(2)},${(r.credit_cents / 100).toFixed(2)},${(r.shipping_cents / 100).toFixed(2)},${(r.total_cents / 100).toFixed(2)},${r.payment_rail},${r.status}`,
    );
    return [header, ...lines].join("\n");
  });
