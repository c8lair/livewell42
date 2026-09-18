# Livewell42 Web Design Team Audit — Ranked Findings
**Date:** 2026-09-18  
**Scope:** No code changes. Recommendations + visual mockups only.  
**Hard rules observed:** Do not touch mainnet Bitcoin payment rails (`src/lib/btc/*`). Flag and recommend removal of testnet / `test_bitcoin_payments` wiring only.

Specialists assigned:
- **Designer (UX/UI)** — visual hierarchy, admin UX, shop polish
- **Security Auditor (backend)** — auth, settings exposure, payment flags
- **Frontend Reviewer** — component size, state, TanStack patterns
- **Maintainer** — god-files, split strategy, tech debt

---

## P0 — Critical / Do First

1. **Testnet & test_bitcoin_payments still wired (Security + Maintainer)**  
   - `src/lib/store.ts` exposes `btcTestnet` and `testBitcoinPayments` in `PublicSettings` and loads/persists `btc_testnet` / `test_bitcoin_payments` columns.  
   - Admin UI (`src/routes/admin.tsx`) receives and displays `testnet` flag for explorer links.  
   - **Recommendation:** Remove the columns, flags, public exposure, and any conditional testnet explorer / payment paths. Keep only mainnet BTC rails. This is a clean-up task for a later PR; do **not** modify `src/lib/btc/*` payment logic in the same change.

2. **God-file: `src/lib/store.ts` (~45 KB)**  
   - Contains settings loading, product mapping, order finalization, admin CRUD, mail enqueue, NexaPay session handling, profile ensure, etc.  
   - **Recommendation:** Split into focused modules under `src/lib/store/` (or keep thin facade):
     - `settings.ts` — load/publicize/ensure columns
     - `products.ts` — product CRUD + mapping
     - `orders.ts` — order lifecycle + finalize
     - `admin.ts` — adminGet / adminSave* surface
     - Keep `store.ts` as re-export barrel only.

3. **Monolithic admin page: `src/routes/admin.tsx` (~31 KB)**  
   - Single file holds ProductsBlock, OrdersBlock, BitcoinOrdersBlock, SettingsBlock, MailBlock, forms, status machines.  
   - **Recommendation:** Extract each block into `src/routes/admin/` or `src/components/admin/` components. Introduce tabbed or sidebar navigation for Back office (Products | Orders | Bitcoin | Settings | Mail).

---

## P1 — High

4. **Admin Settings UX is dense and error-prone (Designer)**  
   - Long form with toggles for NexaPay, BTC zpub, min cents, banner, etc.  
   - **Recommendation:** Group into cards (Payments, Shipping, Storefront, Advanced). Hide zpub input behind “Configure Bitcoin” disclosure. Show clear “Configured / Not configured” badges. Mockup provided.

5. **PublicSettings leaks internal flags (Security)**  
   - `btcTestnet` and `testBitcoinPayments` are returned to the client. Even if currently false, they should never leave the server.  
   - **Recommendation:** Strip them from the public shape entirely once testnet wiring is removed.

6. **Auth surface is already reasonably split** but gate / session logic is heavy.  
   - Good: dedicated `src/lib/auth/*`.  
   - Watch: large `gate-session.server.ts` and `server.ts`. No immediate action; document ownership.

---

## P2 — Medium / Polish

7. **Shop front (`src/routes/index.tsx` ~24 KB)** — functional but can improve visual hierarchy and product card density for a research-use peptide store.  
   - **Recommendation:** Slightly larger product cards, clearer category filters, persistent cart summary, trust signals (research-use only, membership credit callout).

8. **Checkout / pay flows** — BTC pay page and success page are serviceable.  
   - Keep mainnet rails untouched. After testnet removal, simplify any remaining conditional UI.

9. **Component library** — minimal (button, field). Consider extracting a few more primitives (Card, Badge, Toggle) to reduce repeated Tailwind in admin.

---

## Recommended Split Roadmap (Maintainer)

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Remove testnet / test_bitcoin_payments wiring (flags, columns, public exposure, admin conditionals) | Security + Maintainer |
| P0 | Split `store.ts` into modules | Maintainer |
| P0 | Extract admin blocks + introduce navigation | Frontend + Designer |
| P1 | Settings card redesign (see mockup) | Designer |
| P2 | Shop polish | Designer |

---

## Mockups

- `admin-settings-redesign.html` — proposed Settings section with grouped cards and safer Bitcoin configuration UX.
- `admin-shell.html` — proposed Back-office shell with sidebar / tabs.

All mockups are pure HTML/CSS, no backend, ready for visual review.  
When Clay says “show me the mockup,” serve the relevant HTML file.

---

*End of audit. No production code was modified.*
