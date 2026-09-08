# Railway setup

## NEXAPAY_WEBHOOK_SECRET

Card checkout webhooks need this env var on the Livewell42 app service. The webhook route reads `process.env.NEXAPAY_WEBHOOK_SECRET` and returns 500 if it is missing. Never put the secret in git or Admin Settings.

### Steps

1. Open the [Railway dashboard](https://railway.app).
2. Open the **Livewell42** service (the app, not Postgres).
3. Go to **Variables** → **New Variable**.
4. **Name:** `NEXAPAY_WEBHOOK_SECRET`
5. **Value:** the webhook secret from the NexaPay dashboard (generate one there if you have not already).
6. Save.
7. Redeploy so the env var is live on the running service.

The Admin → Settings page shows whether this variable is configured on the server (`configured` / `missing`). It never shows the secret value itself.

The NexaPay API key stays in Admin → Settings (`store_settings.nexapay_api_key`), not as this Railway variable.

## Cloudflare Turnstile (signup)

Signup on `/signup` requires Turnstile. Set both variables on the Livewell42 **app** service:

1. Railway → Livewell42 service → **Variables** → **New Variable**
2. `TURNSTILE_SITE_KEY` — site key from the Cloudflare Turnstile widget
3. `TURNSTILE_SECRET_KEY` — secret key from the same widget
4. Save and redeploy

Signup fails if the widget token is missing or `siteverify` fails. Do not put these keys in Admin Settings or git.

## Zoho SMTP (outbound mail)

Password-reset and paid-order receipts are queued in `mail_log` and sent via Zoho SMTP. Set these on the Livewell42 **app** service (never commit secrets):

1. Railway → Livewell42 service → **Variables** → **New Variable**
2. Add:

| Variable | Example / notes |
|---|---|
| `SMTP_HOST` | `smtppro.zoho.com` (default if unset) |
| `SMTP_PORT` | `465` (default) |
| `SMTP_SECURE` | `true` (default; `"true"` / `"1"`) |
| `SMTP_USER` | `support@livewell42.com` |
| `SMTP_PASS` | Zoho app password / mailbox password (**required**) |
| `SMTP_FROM` | `orders@livewell42.com` (default) |
| `SMTP_FROM_NAME` | `Livewell42 Orders` (default) |

3. Save and **redeploy** so the vars are live.
4. Optional: `MAIL_DRAIN_SECRET` — if set, `/api/mail/drain` requires header `x-mail-drain-secret`.

If `SMTP_USER` / `SMTP_PASS` are missing, rows still insert into `mail_log` but send throws `SMTP is not configured` (captured on `orders.mail_error` for receipts). Do not put `SMTP_PASS` in git or committed `.env` files.

