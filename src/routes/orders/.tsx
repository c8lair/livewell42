import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyOrder } from "@/lib/store";
import { cents } from "@/lib/money";

export const Route = createFileRoute("/orders/$orderNumber")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderNumber } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyOrder>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void getMyOrder({ data: { orderNumber } })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load order."),
      );
  }, [user, orderNumber]);

  if (isPending) return <div className="min-h-dvh bg-bg" />;

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-sm text-muted">Sign in to view this order.</p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </main>
    );
  }

  const order = data?.order;
  const items = data?.items ?? [];
  const paymentMethod =
    order?.payment_rail === "btc"
      ? "Bitcoin"
      : order?.payment_rail === "card"
        ? "Card"
        : order?.payment_rail ?? "";

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-xl tracking-tight">
            Livewell42
          </Link>
          <Link to="/orders" className="text-sm text-muted hover:text-fg">
            Orders
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">
        {error ? (
          <p className="text-sm text-muted">{error}</p>
        ) : !order ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <>
            <h1 className="font-display text-3xl tracking-tight">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatDate(order.created_at)} · {order.status}
            </p>

            <section className="mt-8 rounded-xl border border-border bg-surface p-4">
              <h2 className="text-xs tracking-wide text-faint uppercase">
                Items
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {items.map((l, i) => (
                  <li key={i} className="flex justify-between gap-4">
                    <span>
                      {l.qty} × {l.name}
                      {l.size_label ? ` ${l.size_label}` : ""}
                    </span>
                    <span className="text-muted">
                      {cents(l.price_cents * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                <Row label="Merchandise" value={cents(order.merchandise_cents)} />
                {order.credit_cents > 0 ? (
                  <Row
                    label="Membership credit"
                    value={`−${cents(order.credit_cents)}`}
                  />
                ) : null}
                <Row
                  label="Shipping"
                  value={
                    order.shipping_cents === 0
                      ? "FREE"
                      : cents(order.shipping_cents)
                  }
                />
                <Row label="Collected" value={cents(order.total_cents)} bold />
              </div>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
              <h2 className="text-xs tracking-wide text-faint uppercase">
                Shipping
              </h2>
              <p className="mt-2">
                {order.ship_name}
                <br />
                {order.ship_street}
                <br />
                {order.ship_city}, {order.ship_state} {order.ship_zip}
              </p>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
              <h2 className="text-xs tracking-wide text-faint uppercase">
                Payment
              </h2>
              <p className="mt-2">{paymentMethod}</p>
              {paymentMethod === "Bitcoin" && order.btc_txid ? (
                <p className="mt-1 break-all text-xs text-muted">
                  Tx id: {order.btc_txid}
                </p>
              ) : null}
              {order.tracking ? (
                <p className="mt-2 text-muted">Tracking: {order.tracking}</p>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 ${bold ? "font-medium" : ""}`}
    >
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
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
