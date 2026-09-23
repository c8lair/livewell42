import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { adminGet, repairOwnerAdmin } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { OverviewBlock } from "@/components/admin/overview";
import { ProductsBlock } from "@/components/admin/products";
import { OrdersBlock } from "@/components/admin/orders";
import { BitcoinOrdersBlock } from "@/components/admin/bitcoin";
import { SettingsBlock } from "@/components/admin/settings";
import { MailBlock } from "@/components/admin/mail";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "bitcoin", label: "Bitcoin" },
  { id: "settings", label: "Settings" },
  { id: "mail", label: "Mail queue" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function parseTab(hash: string): TabId {
  const id = hash.replace(/^#/, "") as TabId;
  return TABS.some((t) => t.id === id) ? id : "overview";
}

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGet>> | null>(null);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState<TabId>(() =>
    typeof window === "undefined" ? "overview" : parseTab(window.location.hash),
  );

  async function refresh() {
    try {
      setData(await adminGet());
      setDenied(false);
    } catch {
      setDenied(true);
    }
  }

  useEffect(() => {
    if (!isPending && user) void refresh();
  }, [isPending, user]);

  useEffect(() => {
    function onHash() {
      setTab(parseTab(window.location.hash));
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(next: TabId) {
    setTab(next);
    if (window.location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  if (isPending) return <div className="min-h-dvh bg-bg" />;
  if (!user) return <Navigate to="/login" />;
  if (denied) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted">This desk is for the operator only.</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void repairOwnerAdmin()
                .then(() => {
                  toast.success("Operator access restored");
                  void refresh();
                })
                .catch((err) => {
                  toast.error(err instanceof Error ? err.message : "Could not repair access.");
                });
            }}
          >
            Repair operator access
          </Button>
          <Link to={user ? "/" : "/login"} className="inline-block text-accent">
            Back
          </Link>
        </div>
      </main>
    );
  }
  if (!data) return <div className="min-h-dvh bg-bg" />;

  const openBtc = data.orders.filter(
    (o) =>
      o.payment_rail === "btc" &&
      o.status === "pending" &&
      ["waiting", "seen", "underpaid", "expired"].includes(String(o.btc_status ?? "")),
  ).length;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[220px_1fr]">
      <nav className="border-b border-border bg-surface px-3.5 py-5 lg:border-r lg:border-b-0">
        <p className="font-display text-lg">Livewell42</p>
        <p className="mb-5 text-[11px] text-muted">Back office</p>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={cn(
              "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm",
              tab === item.id
                ? "bg-accent/15 font-semibold text-accent"
                : "text-muted hover:bg-raised hover:text-fg",
            )}
          >
            <span>{item.label}</span>
            {item.id === "bitcoin" && openBtc > 0 ? (
              <span className="rounded-full bg-raised px-1.5 text-[10px] text-fg">{openBtc}</span>
            ) : null}
            {item.id === "mail" && data.mail.length > 0 ? (
              <span className="rounded-full bg-raised px-1.5 text-[10px] text-fg">
                {data.mail.length}
              </span>
            ) : null}
          </button>
        ))}
        <Link
          to="/"
          className="mt-6 block px-3 text-xs text-muted hover:text-fg"
        >
          ← Shop
        </Link>
      </nav>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 px-5 py-4 lg:px-7">
          <UserButton />
        </header>
        <main className="px-5 pb-16 lg:px-7">
          {tab === "overview" ? <OverviewBlock sales={data.sales} /> : null}
          {tab === "products" ? (
            <ProductsBlock products={data.products} onSave={() => void refresh()} />
          ) : null}
          {tab === "orders" ? (
            <OrdersBlock
              orders={data.orders}
              archivedOrders={data.archivedOrders}
              items={data.items}
              onSave={() => void refresh()}
            />
          ) : null}
          {tab === "bitcoin" ? (
            <BitcoinOrdersBlock
              orders={data.orders}
              unmatched={data.unmatchedBtc ?? []}
              btcConfigured={Boolean(data.btcZpubConfigured)}
              onSave={() => void refresh()}
            />
          ) : null}
          {tab === "settings" ? (
            <SettingsBlock
              settings={data.settings}
              nexapayWebhookSecretConfigured={data.nexapayWebhookSecretConfigured}
              btcZpubConfigured={Boolean(data.btcZpubConfigured)}
              onSave={() => void refresh()}
            />
          ) : null}
          {tab === "mail" ? <MailBlock mail={data.mail} /> : null}
        </main>
      </div>
    </div>
  );
}
