/**
 * Shared customer/owner order receipt body builder (card + Bitcoin).
 * Customer bodies never mention underpay / shortfall.
 * Pure helpers — safe to import from modules that also ship to the client.
 */

export type ReceiptItem = {
  qty: number;
  name: string;
  size_label: string;
};

export type ReceiptInput = {
  orderNumber: string;
  dateIso?: string;
  items: ReceiptItem[];
  merchandiseCents: number;
  creditCents: number;
  shippingCents: number;
  collectedCents: number;
  shipName: string;
  shipStreet: string;
  shipCity: string;
  shipState: string;
  shipZip: string;
  /** Card or Bitcoin */
  paymentMethod: "Card" | "Bitcoin";
  btcTxid?: string | null;
  /** Admin-only note (overpay / shortfall). Never included in customer body. */
  adminNote?: string | null;
};

function money(n: number) {
  return `$${(n / 100).toFixed(2)}`;
}

export function orderReceiptSubject(orderNumber: string): string {
  return `Livewell42 order #${orderNumber}`;
}

export function buildOrderReceiptBody(
  input: ReceiptInput,
  opts: { audience: "customer" | "owner" },
): string {
  const itemLines = input.items
    .map((l) => `${l.qty} × ${l.name}${l.size_label ? ` ${l.size_label}` : ""}`)
    .join("\n");
  const lines: Array<string | null> = [
    `Order ${input.orderNumber}`,
    `Date: ${input.dateIso ?? new Date().toISOString()}`,
    itemLines || null,
    `Ship to: ${input.shipName}, ${input.shipStreet}, ${input.shipCity}, ${input.shipState} ${input.shipZip}`,
    `Merchandise ${money(input.merchandiseCents)}`,
    input.creditCents
      ? `Membership credit -${money(input.creditCents)}`
      : null,
    `Shipping ${input.shippingCents === 0 ? "FREE" : money(input.shippingCents)}`,
    `Collected ${money(input.collectedCents)}`,
    `Payment method: ${input.paymentMethod}`,
    input.paymentMethod === "Bitcoin" && input.btcTxid
      ? `Bitcoin tx id: ${input.btcTxid}`
      : null,
  ];
  if (opts.audience === "owner") {
    const note = (input.adminNote ?? "").trim();
    if (note) lines.push(`Note: ${note}`);
  }
  lines.push(`For laboratory research use only. Not for human consumption.`);
  return lines.filter(Boolean).join("\n");
}
