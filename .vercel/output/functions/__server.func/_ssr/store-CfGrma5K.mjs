import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { Jt as number, Qt as string, Ut as array, Vt as _enum, Wt as boolean, Yt as object } from "../_libs/@better-auth/core+[...].mjs";
import { t as authMiddleware } from "./middleware-DWM_TbXu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store-CfGrma5K.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getBootstrap = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("3c3d9b7498266ffe776c7abe4931e7d6814d83a2cc54814d1a906c8116873164"));
var acceptLegal = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("b7105fa4bf58115823b7cbe9542d404fd0c0211149f9537d34bb677cb4b4df5a"));
var payMembership = createServerFn({ method: "POST" }).validator(object({ rail: _enum([
	"card",
	"usdt_tron",
	"btc",
	"usdc"
]) })).middleware([authMiddleware]).handler(createSsrRpc("41f7404c27f56955d8d712680f170a6d0c0454d96a0844fc3cae729fbec24ed6"));
var checkoutSchema = object({
	items: array(object({
		productId: number().int(),
		qty: number().int().min(1).max(99)
	})).min(1),
	shipName: string().trim().min(1).max(80),
	shipStreet: string().trim().min(1).max(120),
	shipCity: string().trim().min(1).max(80),
	shipState: string().trim().length(2),
	shipZip: string().trim().regex(/^\d{5}(-\d{4})?$/),
	rail: _enum([
		"card",
		"usdt_tron",
		"btc",
		"usdc"
	])
});
var placeOrder = createServerFn({ method: "POST" }).validator(checkoutSchema).middleware([authMiddleware]).handler(createSsrRpc("d52cdb5312482319bc218dc17cf2ccb1bf94eb34aab37a1df68e32d7857b07e5"));
createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("daf7da1f4472cd1027e735edb884770371e0e02190fa6e52d3133d2f6beba984"));
var adminGet = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("512e4f8b397549830348b5d5c540b3e4a87895a1dabbea707b6a6d1916cd87b5"));
var adminSaveProduct = createServerFn({ method: "POST" }).validator(object({
	id: number().int().optional(),
	name: string().trim().min(1).max(80),
	sizeLabel: string().trim().max(40),
	category: _enum(["peptide", "bac_water"]),
	priceDollars: string().trim(),
	stock: number().int().min(0),
	coaUrl: string().trim().max(500),
	active: boolean()
})).middleware([authMiddleware]).handler(createSsrRpc("e9bd5391a0bc3b42821b87419c6982db35c6d192dda841d8ef95e6bc6b28eb27"));
var adminSaveSettings = createServerFn({ method: "POST" }).validator(object({
	storeName: string().trim().min(1).max(40),
	supportEmail: string().trim().max(120),
	ownerEmail: string().trim().max(120),
	shippingDollars: string().trim(),
	freeAtDollars: string().trim(),
	nexapayApiKey: string().trim().max(200),
	usdcWallet: string().trim().max(200),
	usdtTronWallet: string().trim().max(200),
	btcWallet: string().trim().max(200),
	usdcPayWallet: string().trim().max(200)
})).middleware([authMiddleware]).handler(createSsrRpc("8662d55d0f9c4a18986298cf1f639aef137675a54a70fd4bd9b34cc5901ab4de"));
var adminUpdateOrder = createServerFn({ method: "POST" }).validator(object({
	id: number().int(),
	status: _enum([
		"paid",
		"packed",
		"shipped",
		"reshipped"
	]),
	tracking: string().trim().max(80),
	reshipNote: string().trim().max(200).optional()
})).middleware([authMiddleware]).handler(createSsrRpc("d3b7b53c448e34e2ae20831ac9d26c8d0307e706bede78bcad2ef271523cad7a"));
var adminSalesCsv = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("f2b124e566eb207695960765c79e9ceece9f371548ce0fc2bd53129a7a67f84c"));
//#endregion
export { adminSaveSettings as a, payMembership as c, adminSaveProduct as i, placeOrder as l, adminGet as n, adminUpdateOrder as o, adminSalesCsv as r, getBootstrap as s, acceptLegal as t };
