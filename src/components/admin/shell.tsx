import { useState, type ReactNode } from "react";
import { OverviewBlock } from "./";
import { ProductsBlock } from "./";
import { OrdersBlock } from "./";
import { BitcoinOrdersBlock } from "./";
import { SettingsBlock } from "./";
import { MailBlock } from "./";
import { MembersBlock } from "./";
import type { AdminData } from "./";

type Tab = "overview" | "products" | "orders" | "bitcoin" | "members" | "settings" | "mail";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "members", label: "Members" },
  { id: "settings", label: "Settings" },
  { id: "mail", label: "Mail" },
];

export function AdminShell({ data, onSave }: { data: AdminData; onSave: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="flex min-h-0 flex-col">
      <nav className="sticky top-0 z-10 -mx-2 mb-6 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-2 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "shrink-0 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-fg"
                : "shrink-0 rounded-md px-3 py-1.5 text-sm text-muted hover:text-fg"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "overview" ? <OverviewBlock sales={data.sales} /> : null}
        {tab === "products" ? (
          <ProductsBlock products={data.products} onSave={onSave} />
        ) : null}
        {tab === "orders" ? (
          <OrdersBlock
            orders={data.orders}
            archivedOrders={data.archivedOrders}
            items={data.items}
            onSave={onSave}
          />
        ) : null}
        {tab === "bitcoin" ? (
          <BitcoinOrdersBlock
            orders={data.orders}
            unmatched={data.unmatchedBtc ?? []}
            btcConfigured={data.btcZpubConfigured}
            onSave={onSave}
          />
        ) : null}
        {tab === "members" ? <MembersBlock members={data.members} /> : null}
        {tab === "settings" ? (
          <SettingsBlock
            settings={data.settings}
            nexapayWebhookSecretConfigured={data.nexapayWebhookSecretConfigured}
            btcZpubConfigured={data.btcZpubConfigured}
            onSave={onSave}
          />
        ) : null}
        {tab === "mail" ? <MailBlock mail={data.mail} /> : null}
      </div>
    </div>
  );
}
