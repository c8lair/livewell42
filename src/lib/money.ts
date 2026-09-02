export function cents(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n / 100);
}

export function shippingCents(
  merchandise: number,
  freeAt: number,
  flat: number,
): number {
  if (merchandise <= 0) return 0;
  return merchandise >= freeAt ? 0 : flat;
}
