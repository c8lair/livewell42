import { o as __toESM } from "../_runtime.mjs";
import { n as shippingCents, t as cents } from "./money-B4nxYusR.mjs";
import { H as require_react, S as require_jsx_runtime, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Select, i as Label, n as CheckRow, r as Input, s as useCurrentUserState, t as Button } from "./field-B6EOhC2o.mjs";
import { t as UserButton } from "./gates-REPapfLC.mjs";
import { c as payMembership, l as placeOrder, s as getBootstrap, t as acceptLegal } from "./store-CfGrma5K.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as FileText, n as Plus, r as Minus } from "../_libs/lucide-react.mjs";
import { t as LOWER_48 } from "./us-states-Cvw238TJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bu3u9ZF9.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const { user, isPending } = useCurrentUserState();
	if (isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-dvh bg-bg" });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gate, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MemberApp, {});
}
function Gate() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-sm tracking-[0.28em] text-muted uppercase",
				children: "Livewell42"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 font-display text-5xl leading-none tracking-tight",
				children: "Members"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 max-w-sm text-sm leading-relaxed text-muted",
				children: "Access is by referral. Membership is $5, once. That amount is credited on your first order."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 flex flex-col gap-3 sm:flex-row",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/login",
					className: "inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg",
					children: "Sign in"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/signup",
					className: "inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-sm font-medium text-fg",
					children: "Request membership"
				})]
			})
		]
	});
}
function MemberApp() {
	const [me, setMe] = (0, import_react.useState)(null);
	const [settings, setSettings] = (0, import_react.useState)(null);
	const [products, setProducts] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	async function refresh() {
		const data = await getBootstrap();
		setMe(data.me);
		setSettings(data.settings);
		setProducts(data.products);
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		refresh().catch(() => setLoading(false));
	}, []);
	if (loading || !me || !settings) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "min-h-dvh bg-bg" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh pb-40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mx-auto flex max-w-3xl items-center justify-between px-5 py-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-xl tracking-tight",
				children: settings.storeName
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-faint",
				children: me.email
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 text-sm",
				children: [me.isAdmin && me.legalAcceptedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/admin",
					className: "text-muted hover:text-fg",
					children: "Admin"
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})]
			})]
		}), !me.legalAcceptedAt ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalGate, { onAccepted: () => void refresh() }) : me.member || me.isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shop, {
			me,
			settings,
			products,
			onPaid: () => void refresh()
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paywall, {
			settings,
			onPaid: () => void refresh()
		})]
	});
}
function LegalGate({ onAccepted }) {
	const [over21, setOver21] = (0, import_react.useState)(false);
	const [research, setResearch] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const legalOk = over21 && research;
	async function confirm() {
		if (!legalOk) {
			toast.error("Confirm both statements to continue.");
			return;
		}
		setBusy(true);
		try {
			await acceptLegal();
			onAccepted();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not save confirmation.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mx-auto max-w-md px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-3xl",
				children: "Confirm to continue"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: "Both statements are required. Same two boxes as on the sign-in page."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-1 rounded-lg border border-border bg-surface px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
					checked: over21,
					onChange: setOver21,
					children: "I confirm that I am 21 years of age or older."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
					checked: research,
					onChange: setResearch,
					children: "I understand that all products are for laboratory research use only and are not for human consumption."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-6 w-full",
				disabled: busy || !legalOk,
				onClick: () => void confirm(),
				children: busy ? "Saving…" : "Continue"
			})
		]
	});
}
function Paywall({ settings, onPaid }) {
	const [rail, setRail] = (0, import_react.useState)("card");
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function pay() {
		setBusy(true);
		try {
			await payMembership({ data: { rail } });
			toast.success("$5 membership paid. $5 credit waits on your first order.");
			onPaid();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Payment failed.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mx-auto max-w-md px-5 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-3xl",
				children: "Complete membership"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm leading-relaxed text-muted",
				children: "One-time $5. Credited in full on your first order so it breaks even when you buy. Card payments settle to us in USDC via NexaPay. Crypto is USDT on Tron, BTC, or USDC."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailPicker, {
				value: rail,
				onChange: setRail,
				settings,
				amountLabel: "$5.00"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-6 w-full",
				disabled: busy,
				onClick: () => void pay(),
				children: busy ? "Confirming…" : "Pay $5 membership"
			})
		]
	});
}
function Shop({ me, settings, products, onPaid }) {
	const [qty, setQty] = (0, import_react.useState)({});
	const [name, setName] = (0, import_react.useState)("");
	const [street, setStreet] = (0, import_react.useState)("");
	const [city, setCity] = (0, import_react.useState)("");
	const [state, setState] = (0, import_react.useState)("TX");
	const [zip, setZip] = (0, import_react.useState)("");
	const [rail, setRail] = (0, import_react.useState)("card");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const lines = products.map((p) => ({
		product: p,
		qty: qty[p.id] ?? 0
	})).filter((l) => l.qty > 0);
	const merchandise = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0);
	const credit = Math.min(me.creditCents, merchandise);
	const ship = shippingCents(merchandise, settings.freeShippingAtCents, settings.shippingCents);
	const due = merchandise - credit + ship;
	function setQ(id, next, stock) {
		setQty((q) => ({
			...q,
			[id]: Math.max(0, Math.min(stock, next))
		}));
	}
	async function checkout() {
		if (!lines.length) {
			toast.error("Add a quantity first.");
			return;
		}
		setBusy(true);
		try {
			const res = await placeOrder({ data: {
				items: lines.map((l) => ({
					productId: l.product.id,
					qty: l.qty
				})),
				shipName: name,
				shipStreet: street,
				shipCity: city,
				shipState: state,
				shipZip: zip,
				rail
			} });
			toast.success(`Order ${res.orderNumber} paid · ${cents(res.totalCents)}`);
			setQty({});
			onPaid();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not place the order.");
		} finally {
			setBusy(false);
		}
	}
	const peptides = products.filter((p) => p.category === "peptide");
	const water = products.filter((p) => p.category !== "peptide");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-3xl px-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs leading-relaxed text-faint",
				children: [
					"For laboratory research use only. Not for human consumption. Lower 48 shipping only. Lost packages: one reship. Broken vial: one reship with a photo to ",
					settings.supportEmail || "support",
					"."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGroup, {
				title: "List",
				products: peptides,
				qty,
				setQ
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGroup, {
				title: "Water",
				products: water,
				qty,
				setQ
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-10 space-y-3 border-t border-border pt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-2xl",
						children: "Ship to"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: name,
						onChange: (e) => setName(e.target.value),
						required: true
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Street" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: street,
						onChange: (e) => setStreet(e.target.value),
						required: true
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "City" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: city,
							onChange: (e) => setCity(e.target.value),
							required: true
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "State" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Select, {
							value: state,
							onChange: (e) => setState(e.target.value),
							children: LOWER_48.map(([code, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: code,
								children: label
							}, code))
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-w-40",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "ZIP" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: zip,
							onChange: (e) => setZip(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RailPicker, {
						value: rail,
						onChange: setRail,
						settings,
						amountLabel: cents(due)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none fixed inset-x-0 bottom-0 z-20 p-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "pointer-events-auto mx-auto max-w-3xl rounded-xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end justify-between gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "Merchandise",
									value: cents(merchandise)
								}),
								credit > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: "First-order credit",
									value: `−${cents(credit)}`
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
									label: ship === 0 && merchandise >= settings.freeShippingAtCents ? "Shipping (free over $250)" : "Shipping",
									value: merchandise === 0 ? "—" : ship === 0 ? "Free" : cents(ship)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "pt-1 font-medium text-fg",
									children: ["Due ", cents(due)]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							disabled: busy || merchandise === 0,
							onClick: () => void checkout(),
							children: busy ? "Placing…" : "Pay now"
						})]
					})
				})
			})
		]
	});
}
function Row({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: "flex gap-3 text-muted",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-fg",
			children: value
		})]
	});
}
function ProductGroup({ title, products, qty, setQ }) {
	if (!products.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display text-2xl",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 divide-y divide-border border-y border-border",
			children: products.map((p) => {
				const sold = p.stock <= 0;
				const q = qty[p.id] ?? 0;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: `flex items-center gap-3 py-4 ${sold ? "opacity-40" : ""}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-medium",
							children: [
								p.name,
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-normal text-muted",
									children: p.sizeLabel
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: cents(p.priceCents) }),
								sold ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Sold out" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [p.stock, " in stock"] }),
								p.coaUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: p.coaUrl,
									target: "_blank",
									rel: "noreferrer",
									className: "inline-flex items-center gap-1 text-accent hover:underline",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-3.5" }), "COA"]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "inline-flex items-center gap-1 text-faint",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-3.5" }), "COA"]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: sold,
								className: "grid size-11 place-items-center rounded-md border border-border",
								onClick: () => setQ(p.id, q - 1, p.stock),
								"aria-label": "Decrease",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-8 text-center tabular-nums",
								children: q
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: sold,
								className: "grid size-11 place-items-center rounded-md border border-border",
								onClick: () => setQ(p.id, q + 1, p.stock),
								"aria-label": "Increase",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
							})
						]
					})]
				}, p.id);
			})
		})]
	});
}
function RailPicker({ value, onChange, settings, amountLabel }) {
	const rails = [
		{
			id: "card",
			label: "Card (NexaPay)",
			hint: "Visa, Mastercard, Apple Pay, Google Pay · we receive USDC"
		},
		{
			id: "usdt_tron",
			label: "USDT · Tron",
			hint: settings.usdtTronWallet || "Address set in admin"
		},
		{
			id: "btc",
			label: "Bitcoin",
			hint: settings.btcWallet || "Address set in admin"
		},
		{
			id: "usdc",
			label: "USDC",
			hint: settings.usdcPayWallet || settings.usdcWallet || "Address set in admin"
		}
	];
	const selected = rails.find((r) => r.id === value);
	const addr = value === "usdt_tron" ? settings.usdtTronWallet : value === "btc" ? settings.btcWallet : value === "usdc" ? settings.usdcPayWallet || settings.usdcWallet : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-4 space-y-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted",
				children: ["Pay ", amountLabel]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-2",
				children: rails.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onChange(r.id),
					className: `rounded-md border px-3 py-3 text-left text-sm ${value === r.id ? "border-accent bg-raised text-fg" : "border-border text-muted"}`,
					children: r.label
				}, r.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs leading-relaxed text-faint",
				children: value === "card" ? "NexaPay checkout. In this preview, confirm to record a paid membership or order. Paste live API keys in admin before going live." : addr ? `Send exactly ${amountLabel} on the correct network to ${addr}` : `${selected.hint}. Confirm after sending — admin can mark paid if chain watch is not connected.`
			})
		]
	});
}
//#endregion
export { Home as component };
