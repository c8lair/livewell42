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
