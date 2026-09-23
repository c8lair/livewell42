import { getSql } from "@/lib/db";
import type { PublicSettings, SettingsRow } from "./types";

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

export async function ensureStoreSettingsColumns(
  sql: Awaited<ReturnType<typeof getSql>>,
) {
  // Idempotent — production Neon does not auto-migrate on boot unless startup runs
  // db:migrate; Admin Save and every settings load must still work.
  await sql.query(
    "alter table store_settings add column if not exists nexapay_webhook_secret text",
  );
  await sql.query(
    "alter table store_settings add column if not exists btc_zpub text not null default ''",
  );
  await sql.query(
    "alter table store_settings add column if not exists btc_next_index integer not null default 0",
  );
  await sql.query(
    "alter table store_settings add column if not exists btc_min_cents integer not null default 2500",
  );
  await sql.query(
    "alter table store_settings add column if not exists btc_enabled boolean not null default false",
  );
  await sql.query(
    "alter table store_settings add column if not exists nexapay_enabled boolean not null default true",
  );
}

/** Truthy for boolean/driver quirks (pg boolean, "t"/"true"/1). */
export function asOn(v: unknown): boolean {
  return v === true || v === "t" || v === "true" || v === 1 || v === "1";
}

export async function loadSettings(): Promise<SettingsRow> {
  const sql = await getSql();
  try {
    await ensureStoreSettingsColumns(sql);
  } catch {
    /* keep going — select may still work if columns already exist */
  }
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
  };

  type Row = SettingsRow;
  let r: Row | undefined;
  try {
    const rows = await sql<Row>`select store_name, support_email, owner_email, shipping_cents, free_shipping_at_cents, nexapay_api_key, nexapay_webhook_secret, usdc_wallet, btc_wallet, banner_enabled, banner_text, btc_enabled, nexapay_enabled, btc_zpub, btc_next_index, btc_min_cents from store_settings where id = 1`;
    r = rows[0];
  } catch {
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
      let btcMinCents = 2500;
      let btcZpub = "";
      let btcNextIndex = 0;
      let webhookSecret = "";
      try {
        const extra = await sql<{
          btc_min_cents: number;
          btc_zpub: string;
          btc_next_index: number;
          nexapay_webhook_secret: string | null;
        }>`select btc_min_cents, btc_zpub, btc_next_index, nexapay_webhook_secret from store_settings where id = 1`;
        if (extra[0]) {
          btcMinCents = extra[0].btc_min_cents ?? 2500;
          btcZpub = extra[0].btc_zpub ?? "";
          btcNextIndex = extra[0].btc_next_index ?? 0;
          webhookSecret = extra[0].nexapay_webhook_secret ?? "";
        }
      } catch {
        /* columns still missing */
      }
      r = rows[0]
        ? {
            ...rows[0],
            nexapay_webhook_secret: webhookSecret,
            btc_zpub: btcZpub,
            btc_next_index: btcNextIndex,
            btc_min_cents: btcMinCents,
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
  return r;
}

export function publicize(s: SettingsRow): PublicSettings {
  return {
    storeName: s.store_name,
    supportEmail: s.support_email,
    shippingCents: s.shipping_cents,
    freeShippingAtCents: s.free_shipping_at_cents,
    usdcWallet: s.usdc_wallet,
    btcWallet: s.btc_wallet,
    nexapayConfigured: Boolean(s.nexapay_api_key),
    nexapayEnabled: Boolean(s.nexapay_enabled) && Boolean(s.nexapay_api_key?.trim()),
    bannerEnabled: Boolean(s.banner_enabled),
    bannerText: s.banner_text ?? "",
    btcEnabled: Boolean(s.btc_enabled) && Boolean(s.btc_zpub?.trim()),
    btcMinCents: s.btc_min_cents ?? 2500,
  };
}
