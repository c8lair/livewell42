import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import {
  adminGet,
  adminRestoreOrder,
  adminUpdateOrder,
} from "@/lib/store";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/archive")({ component: ArchivePage });

function ArchivePage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGet>> | null>(null);
  const [denied, setDenied] = useState(false);

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

  if (isPending) return <div className="min-h-dvh bg-bg" />;
  if (!user) return <Navigate to="/login" />;
  if (denied) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted">This desk is for the operator only.</p>
        <Link to="/" className="mt-6 inline-block text-accent">
          Back
        </Link>
      </main>
    );
  }
  if (!data) return <div className="min-h-dvh bg-bg" />;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <div>
          <Link to="/admin" className="text-xs text-muted">
            ← Back office
          </Link>
          <h1 className="font-display text-3xl">Archive</h1>
          <p className="mt-1 text-sm text-muted">
            Deleted orders and queued receipts stay here. Nothing is erased.
          </p>
        </div>
        <UserButton />
      </header>

      <section className="mt-4">
        <h2 className="font-display text-2xl">Orders</h2>
        <ul className="mt-3 space-y-3">
          {data.archivedOrders.length === 0 ? (
            <p className="text-sm text-muted">No archived orders.</p>
          ) : null}
          {data.archivedOrders.map((o) => {
            const lines = data.items.filter((i) => i.order_id === o.id);
            return (
              <li key={o.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
                <p className="font-medium">
                  {o.order_number} · {cents(o.total_cents)} · {o.payment_rail} · {o.status}
                </p>
                <p className="mt-1 text-muted">
                  {o.ship_name}, {o.ship_street}, {o.ship_city}, {o.ship_state} {o.ship_zip}
                </p>
                <p className="mt-1 text-muted">
                  {lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
                </p>
                {o.tracking ? (
                  <p className="mt-1 text-muted">Tracking {o.tracking}</p>
                ) : null}
                {o.mail_error ? (
                  <p className="mt-2 text-xs text-muted">
                    Mail error: <span className="text-fg">{o.mail_error}</span>
                  </p>
                ) : null}
                <ArchivedOrderActions order={o} onSave={() => void refresh()} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Receipts</h2>
        <p className="mt-1 text-sm text-muted">
          Copies the shop queued. Open an order above for shipping detail.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {data.mail.length === 0 ? (
            <p className="text-sm text-muted">No receipt rows yet.</p>
          ) : null}
          {data.mail.map((m) => (
            <li key={m.id} className="rounded-md border border-border p-3">
              <p className="text-muted">
                {m.kind} → {m.to_email}
              </p>
              <p>{m.subject}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ArchivedOrderActions({
  order,
  onSave,
}: {
  order: Awaited<ReturnType<typeof adminGet>>["archivedOrders"][number];
  onSave: () => void;
}) {
  const [status, setStatus] = useState(order.status as "paid" | "packed" | "shipped" | "reshipped");
  const [tracking, setTracking] = useState(order.tracking);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
        <option value="paid">Paid</option>
        <option value="packed">Packed</option>
        <option value="shipped">Shipped</option>
        <option value="reshipped">Reshipped</option>
      </Select>
      <Input placeholder="Tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await adminUpdateOrder({ data: { id: order.id, status, tracking } });
          toast.success("Saved");
          onSave();
        }}
      >
        Save
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await adminRestoreOrder({ data: { id: order.id } });
            toast.success("Restored to Orders");
            onSave();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not restore.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Restoring…" : "Restore"}
      </Button>
    </div>
  );
}
