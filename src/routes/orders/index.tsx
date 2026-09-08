import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyOrders } from "@/lib/store";
import { cents } from "@/lib/money";

export const Route = createFileRoute("/orders/")({ component: OrdersPage });

function OrdersPage() {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listMyOrders>> | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void listMyOrders()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load orders."),
      );
  }, [user]);

  if (isPending) return <div className="min-h-dvh bg-bg" />;

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm text-muted">Sign in to view your orders.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl tracking-tight">
            Livewell42
          </Link>
          <span className="text-sm text-muted">Orders</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-muted hover:text-fg">
            Shop
          </Link>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="font-display text-3xl tracking-tight">Your orders</h1>
        <p className="mt-1 text-sm text-muted">
          Past purchases for this account.
        </p>
        {error ? (
          <p className="mt-6 text-sm text-muted">{error}</p>
        ) : rows === null ? (
          <p className="mt-6 text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((o) => (
              <li key={o.order_number}>
                <Link
                  to="/orders/$orderNumber"
                  params={{ orderNumber: o.order_number }}
                  className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-accent"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium">{o.order_number}</p>
                    <p className="text-sm">{cents(o.total_cents)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(o.created_at)} · {o.status}
                    {o.payment_rail ? ` · ${railLabel(o.payment_rail)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function railLabel(rail: string) {
  if (rail === "btc") return "Bitcoin";
  if (rail === "card") return "Card";
  return rail;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
