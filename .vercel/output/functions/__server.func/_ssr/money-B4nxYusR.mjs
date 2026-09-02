//#region node_modules/.nitro/vite/services/ssr/assets/money-B4nxYusR.js
function cents(n) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD"
	}).format(n / 100);
}
function shippingCents(merchandise, freeAt, flat) {
	if (merchandise <= 0) return 0;
	return merchandise >= freeAt ? 0 : flat;
}
//#endregion
export { shippingCents as n, cents as t };
