import { o as __toESM } from "../_runtime.mjs";
import { H as require_react, S as require_jsx_runtime, b as useNavigate, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn, t as authClient } from "./client-B40BzJxt.mjs";
import { i as Label, n as CheckRow, r as Input, s as useCurrentUserState, t as Button } from "./field-B6EOhC2o.mjs";
import { t as acceptLegal } from "./store-CfGrma5K.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as GROK_PROVIDERS } from "./server-D733a4CF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CKkmNy4E.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user, isPending } = useCurrentUserState();
	const navigate = useNavigate();
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [over21, setOver21] = (0, import_react.useState)(false);
	const [research, setResearch] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (!isPending && user) navigate({ to: "/" });
	const legalOk = over21 && research;
	async function afterAuth() {
		try {
			await acceptLegal();
		} catch {}
		navigate({ to: "/" });
	}
	async function onSubmit(e) {
		e.preventDefault();
		if (!legalOk) {
			toast.error("Confirm both statements to sign in.");
			return;
		}
		setBusy(true);
		const { error } = await authClient.signIn.email({
			email,
			password
		});
		setBusy(false);
		if (error) {
			toast.error(error.message ?? "Sign-in failed.");
			return;
		}
		await afterAuth();
	}
	async function social(id) {
		if (!legalOk) {
			toast.error("Confirm both statements before continuing.");
			return;
		}
		setBusy(true);
		try {
			await signIn(id, { callbackURL: "/" });
			await afterAuth();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Sign-in failed.");
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto max-w-md px-6 py-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-sm tracking-[0.28em] text-muted uppercase",
				children: "Livewell42"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-3xl tracking-tight",
				children: "Sign in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted",
				children: "Members only. One email, one account."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit,
				className: "mt-5 space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "email",
						autoComplete: "email",
						required: true,
						value: email,
						onChange: (e) => setEmail(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						autoComplete: "current-password",
						required: true,
						value: password,
						onChange: (e) => setPassword(e.target.value)
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1 rounded-lg border border-border bg-surface px-3 py-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs tracking-wide text-faint uppercase",
								children: "Required to sign in"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
								checked: over21,
								onChange: setOver21,
								children: "I confirm that I am 21 years of age or older."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckRow, {
								checked: research,
								onChange: setResearch,
								children: "I understand that all products are for laboratory research use only and are not for human consumption."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "w-full",
						disabled: busy || !legalOk,
						children: busy ? "Signing in…" : "Sign in"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 text-xs tracking-wide text-faint uppercase",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" }),
							"or",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" })
						]
					}),
					GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "outline",
						className: "w-full",
						disabled: busy || !legalOk,
						onClick: () => void social(p.providerId),
						children: ["Continue with ", p.label]
					}, p.providerId))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-5 text-sm text-muted",
				children: [
					"No account yet?",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/signup",
						className: "text-accent underline-offset-4 hover:underline",
						children: "Request membership"
					})
				]
			})
		]
	});
}
//#endregion
export { Login as component };
