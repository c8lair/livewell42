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
};

export type Me = {
  userId: string;
  email: string;
  isAdmin: boolean;
  member: boolean;
  creditCents: number;
  legalAcceptedAt: string | null;
};

export type ProductRow = {
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

export type SettingsRow = {
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
};

export function mapProduct(r: ProductRow): Product {
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
