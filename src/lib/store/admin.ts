import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { mapProduct, type ProductRow } from "./types";
import { ensureStoreSettingsColumns, loadSettings } from "./settings";
import { ensureProfile, requireAdmin } from "./profile";
import { queueMail } from "./helpers";

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
    const settings = {
      ...loaded,
      nexapay_webhook_secret: "",
      btc_zpub: "",
      btc_next_index: 0,
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
      mail_error: null as string | null,
    };
    type AdminOrderRow = typeof orderCols;
    let orders: AdminOrderRow[] = [];
    let archivedOrders: AdminOrderRow[] = [];
    try {
      orders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at, btc_status, btc_amount, btc_address, btc_txid, btc_received, quote_expires_at, payment_token, mail_error from orders where deleted_at is null order by id desc limit 200`;
      archivedOrders = await sql<AdminOrderRow>`select id, order_number, user_id, merchandise_cents, credit_cents, shipping_cents, total_cents, status, ship_name, ship_street, ship_city, ship_state, ship_zip, payment_rail, tracking, created_at, deleted_at, btc_status, btc_amount, btc_address, btc_txid, btc_received, quote_expires_at, payment_token, mail_error from orders where deleted_at is not null order by deleted_at desc limit 200`;
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
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const shipping = Math.round(Number(data.shippingDollars) * 100);
    const freeAt = Math.round(Number(data.freeAtDollars) * 100);
    const sql = await getSql();

    await ensureStoreSettingsColumns(sql);

    const btcMin = Math.round(Number(data.btcMinDollars) * 100);
    if (!Number.isFinite(btcMin) || btcMin < 0) {
      throw new Error("Invalid Bitcoin minimum.");
    }

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
      btc_min_cents = ${btcMin}
      where id = 1`;

    const webhookSecret = String(data.nexapayWebhookSecret ?? "").trim();
    if (webhookSecret) {
      await sql`update store_settings set nexapay_webhook_secret = ${webhookSecret} where id = 1`;
    }

    const zpub = String(data.btcZpub ?? "").trim();
    if (zpub) {
      const { deriveAddress } = await import("@/lib/btc/zpub.server");
      deriveAddress(zpub, 0);
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
