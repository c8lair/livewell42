# Livewell42

Private membership shop. $5 to join (credited on the first order). Research-use products only. Payments stay in demo mode until you add keys in Admin.

This folder is a full copy of the site.

## Run it on your computer

You need [Node.js 22 or newer](https://nodejs.org/).

```bash
npm install
npm run dev
```

Then open the address it prints (usually `http://localhost:8080`).

- The first account you create is the owner. After you sign in, open `/admin`.
- Card and crypto checkout is demo mode — nothing is charged, no card needed.
- Without a Postgres database URL, data lives in a local demo database and resets when you stop the server.
- When you are ready for real payments, put NexaPay keys and wallet addresses in Admin → Settings.

## Keep working on it later

Come back to the same Grok chat — the project stays there too. This zip is your local backup.
