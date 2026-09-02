import { o as __toESM } from "../_runtime.mjs";
import { t as cents } from "./money-B4nxYusR.mjs";
import { H as require_react, S as require_jsx_runtime, v as Link, y as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Select, i as Label, r as Input, s as useCurrentUserState, t as Button } from "./field-B6EOhC2o.mjs";
import { t as UserButton } from "./gates-REPapfLC.mjs";
import { a as adminSaveSettings, i as adminSaveProduct, n as adminGet, o as adminUpdateOrder, r as adminSalesCsv } from "./store-CfGrma5K.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-ChkElOKu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminPage() {
	const { user, isPending } = useCurrentUserState();
	const [data, setData] = (0, import_react.useState)(null);
	const [denied, setDenied] = (0, import_react.useState)(false);
	async function refresh() {
		try {
			setData(await adminGet());
			setDenied(false);
		} catch {
			setDenied(true);
		}
	}
	(0, import_react.useEffect)(() => {
		if (!isPending && user) refresh();
	}, [isPending, user]);
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-dvh bg-bg" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/login" });
	if (denied) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-md px-6 py-20 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted",
			children: "This desk is for the operator only."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/",
			className: "mt-4 inline-block text-accent",
			children: "Back"
		})]
	});
	if (!data) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-dvh bg-bg" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-3xl px-5 pb-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-center justify-between py-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "text-xs text-muted",
					children: "← Shop"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl",
					children: "Back office"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-xl border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-wide text-faint uppercase",
						children: "This year"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 font-display text-3xl tabular-nums",
						children: cents(data.sales.ytd_cents)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							data.sales.order_count,
							" orders · month ",
							cents(data.sales.mtd_cents)
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "mt-3",
						onClick: async () => {
							const csv = await adminSalesCsv();
							const blob = new Blob([csv], { type: "text/csv" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = "livewell42-sales.csv";
							a.click();
							URL.revokeObjectURL(url);
						},
						children: "Download CSV"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductsBlock, {
				products: data.products,
				onSave: () => void refresh()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrdersBlock, {
				orders: data.orders,
				items: data.items,
				onSave: () => void refresh()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsBlock, {
				settings: data.settings,
				onSave: () => void refresh()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MailBlock, { mail: data.mail })
		]
	});
}
function ProductsBlock({ products, onSave }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: "Products"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Add a row in under a minute. COA is a link — leave blank until you have one."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductForm, { onSave }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 divide-y divide-border border-y border-border",
				children: products.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "py-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductForm, {
						product: p,
						onSave
					})
				}, p.id))
			})
		]
	});
}
function ProductForm({ product, onSave }) {
	const [name, setName] = (0, import_react.useState)(product?.name ?? "");
	const [sizeLabel, setSizeLabel] = (0, import_react.useState)(product?.sizeLabel ?? "");
	const [category, setCategory] = (0, import_react.useState)(product?.category === "bac_water" ? "bac_water" : "peptide");
	const [price, setPrice] = (0, import_react.useState)(product ? (product.priceCents / 100).toFixed(2) : "");
	const [stock, setStock] = (0, import_react.useState)(product?.stock ?? 0);
	const [coaUrl, setCoaUrl] = (0, import_react.useState)(product?.coaUrl ?? "");
	const [active, setActive] = (0, import_react.useState)(product?.active ?? true);
	async function save() {
		try {
			await adminSaveProduct({ data: {
				id: product?.id,
				name,
				sizeLabel,
				category,
				priceDollars: price,
				stock,
				coaUrl,
				active
			} });
			toast.success("Saved");
			if (!product) {
				setName("");
				setSizeLabel("");
				setPrice("");
				setStock(0);
				setCoaUrl("");
			}
			onSave();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Save failed");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 gap-2 sm:grid-cols-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "col-span-2 sm:col-span-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: name,
					onChange: (e) => setName(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Size" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: sizeLabel,
				onChange: (e) => setSizeLabel(e.target.value),
				placeholder: "5 mg"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Type" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: category,
				onChange: (e) => setCategory(e.target.value),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "peptide",
					children: "Peptide"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
					value: "bac_water",
					children: "Bac water"
				})]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Price USD" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: price,
				onChange: (e) => setPrice(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Stock" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: "number",
				value: stock,
				onChange: (e) => setStock(Number(e.target.value))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "col-span-2 sm:col-span-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "COA link" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: coaUrl,
					onChange: (e) => setCoaUrl(e.target.value),
					placeholder: "https://…  (optional)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex items-center gap-2 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked: active,
					onChange: (e) => setActive(e.target.checked)
				}), "Listed"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				onClick: () => void save(),
				children: product ? "Update" : "Add product"
			})
		]
	});
}
function OrdersBlock({ orders, items, onSave }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl",
			children: "Orders"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "mt-3 space-y-3",
			children: [orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "None yet."
			}) : null, orders.map((o) => {
				const lines = items.filter((i) => i.order_id === o.id);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-xl border border-border bg-surface p-4 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-medium",
							children: [
								o.order_number,
								" · ",
								cents(o.total_cents),
								" · ",
								o.payment_rail
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-muted",
							children: [
								o.ship_name,
								", ",
								o.ship_street,
								", ",
								o.ship_city,
								", ",
								o.ship_state,
								" ",
								o.ship_zip
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-muted",
							children: lines.map((l) => `${l.qty}× ${l.name}`).join(", ")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderStatus, {
							order: o,
							onSave
						})
					]
				}, o.id);
			})]
		})]
	});
}
function OrderStatus({ order, onSave }) {
	const [status, setStatus] = (0, import_react.useState)(order.status);
	const [tracking, setTracking] = (0, import_react.useState)(order.tracking);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-3 flex flex-col gap-2 sm:flex-row",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: status,
				onChange: (e) => setStatus(e.target.value),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "paid",
						children: "Paid"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "packed",
						children: "Packed"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "shipped",
						children: "Shipped"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
						value: "reshipped",
						children: "Reshipped"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				placeholder: "Tracking",
				value: tracking,
				onChange: (e) => setTracking(e.target.value)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "outline",
				onClick: async () => {
					await adminUpdateOrder({ data: {
						id: order.id,
						status,
						tracking
					} });
					toast.success("Order updated");
					onSave();
				},
				children: "Save"
			})
		]
	});
}
function SettingsBlock({ settings, onSave }) {
	const [storeName, setStoreName] = (0, import_react.useState)(settings.store_name);
	const [supportEmail, setSupportEmail] = (0, import_react.useState)(settings.support_email);
	const [ownerEmail, setOwnerEmail] = (0, import_react.useState)(settings.owner_email);
	const [ship, setShip] = (0, import_react.useState)((settings.shipping_cents / 100).toFixed(2));
	const [freeAt, setFreeAt] = (0, import_react.useState)((settings.free_shipping_at_cents / 100).toFixed(2));
	const [nexapay, setNexapay] = (0, import_react.useState)(settings.nexapay_api_key);
	const [usdc, setUsdc] = (0, import_react.useState)(settings.usdc_wallet);
	const [tron, setTron] = (0, import_react.useState)(settings.usdt_tron_wallet);
	const [btc, setBtc] = (0, import_react.useState)(settings.btc_wallet);
	const [usdcPay, setUsdcPay] = (0, import_react.useState)(settings.usdc_pay_wallet);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10 space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: "Settings"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Store name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: storeName,
				onChange: (e) => setStoreName(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Support email (shown to members)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: supportEmail,
				onChange: (e) => setSupportEmail(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Owner notify email (order pings)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: ownerEmail,
				onChange: (e) => setOwnerEmail(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Shipping under threshold" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: ship,
					onChange: (e) => setShip(e.target.value)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Free shipping at" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: freeAt,
					onChange: (e) => setFreeAt(e.target.value)
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "NexaPay API key" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: nexapay,
				onChange: (e) => setNexapay(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "USDC settle wallet (NexaPay payout)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: usdc,
				onChange: (e) => setUsdc(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "USDT Tron receive address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: tron,
				onChange: (e) => setTron(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "BTC receive address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: btc,
				onChange: (e) => setBtc(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "USDC customer-pay address" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				value: usdcPay,
				onChange: (e) => setUsdcPay(e.target.value)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: async () => {
					await adminSaveSettings({ data: {
						storeName,
						supportEmail,
						ownerEmail,
						shippingDollars: ship,
						freeAtDollars: freeAt,
						nexapayApiKey: nexapay,
						usdcWallet: usdc,
						usdtTronWallet: tron,
						btcWallet: btc,
						usdcPayWallet: usdcPay
					} });
					toast.success("Settings saved");
					onSave();
				},
				children: "Save settings"
			})
		]
	});
}
function MailBlock({ mail }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl",
				children: "Outgoing mail"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Queued copies until SMTP is connected. Orders still save if email fails."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-2 text-sm",
				children: mail.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-md border border-border p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-muted",
						children: [
							m.kind,
							" → ",
							m.to_email
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: m.subject })]
				}, m.id))
			})
		]
	});
}
//#endregion
export { AdminPage as component };
