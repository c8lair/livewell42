import { useState } from "react";
import {
  adminRestoreOrder,
  adminSoftDeleteOrder,
  adminUpdateOrder,
} from "@/lib/store";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { toast } from "sonner";
import type { AdminData, AdminOrder } from "./types";

export function OrdersBlock({
  orders,
  archivedOrders,
  items,
  onSave,
}: {
  orders: AdminData["orders"];
  archivedOrders: AdminData["archivedOrders"];
  items: AdminData["items"];
  onSave: () => void;
}) {
  const [view, setView] = useState<"live" | "archive">("live");
  const list = view === "live" ? orders : archivedOrders;
  const archived = view === "archive";

  return (
    <section>
      <div className="sticky top-0 z-10 -mx-2 mb-4 border-b border-border bg-bg/95 px-2 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-[26px] font-medium">
            {archived ? "Archive" : "Orders"}
          </h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={view === "live" ? "primary" : "outline"}
              onClick={() => setView("live")}
            >
              Orders
            </Button>
            <Button
              type="button"
              variant={view === "archive" ? "primary" : "outline"}
              onClick={() => setView("archive")}
            >
              Archive
            </Button>
          </div>
        </div>
      </div>
      <ul className="space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted">{archived ? "No archived orders." : "None yet."}</p>
        ) : null}
        {list.map((o) => {
          const lines = items.filter((i) => i.order_id === o.id);
          return (
            <li key={o.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="font-medium">
                {o.order_number} · {cents(o.total_cents)} · {o.payment_rail}
              </p>
              {o.ship_street ? (
                <p className="mt-1 text-muted">
                  {o.ship_name}, {o.ship_street}, {o.ship_city}, {o.ship_state} {o.ship_zip}
                </p>
              ) : o.ship_name === "Membership" ? (
                <p className="mt-1 text-muted">$5 membership</p>
              ) : null}
              <p className="mt-1 text-muted">
                {lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
              </p>
              {o.mail_error ? (
                <p className="mt-2 rounded-md border border-border bg-raised px-3 py-2 text-xs text-muted">
                  Customer receipt email error:{" "}
                  <span className="text-fg">{o.mail_error}</span>
                </p>
              ) : null}
              <OrderStatus order={o} archived={archived} onSave={onSave} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OrderStatus({
  order,
  archived,
  onSave,
}: {
  order: AdminOrder;
  archived: boolean;
  onSave: () => void;
}) {
  const isPending = order.status === "pending";
  const [status, setStatus] = useState(
    (isPending ? "paid" : order.status) as "paid" | "packed" | "shipped" | "reshipped",
  );
  const [tracking, setTracking] = useState(order.tracking);
  const [confirm, setConfirm] = useState<"delete" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    await adminUpdateOrder({ data: { id: order.id, status, tracking } });
    toast.success("Order updated");
    onSave();
  }

  async function runSoftDelete() {
    setBusy(true);
    try {
      await adminSoftDeleteOrder({ data: { id: order.id } });
      toast.success("Order moved to Archive");
      setConfirm(null);
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order.");
    } finally {
      setBusy(false);
    }
  }

  async function runRestore() {
    setBusy(true);
    try {
      await adminRestoreOrder({ data: { id: order.id } });
      toast.success("Order restored");
      setConfirm(null);
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {isPending && !archived ? (
        <p className="rounded-md border border-border bg-raised px-3 py-2 text-xs text-muted">
          Status: <span className="font-medium text-fg">Pending</span>{" "}
          ({order.payment_rail === "btc"
            ? `Bitcoin · ${order.btc_status || "waiting"}`
            : "awaiting NexaPay card payment"})
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="reshipped">Reshipped</option>
        </Select>
        <Input
          placeholder="Tracking"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => void save()}>
          Save
        </Button>
        {archived ? (
          <Button type="button" variant="outline" onClick={() => setConfirm("restore")}>
            Restore
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirm("delete")}>
            Delete
          </Button>
        )}
      </div>
      {confirm === "delete" ? (
        <div className="rounded-md border border-border bg-raised px-3 py-3 text-sm">
          <p>Are you sure you want to delete this order?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={busy} onClick={() => void runSoftDelete()}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ) : null}
      {confirm === "restore" ? (
        <div className="rounded-md border border-border bg-raised px-3 py-3 text-sm">
          <p>Are you sure you want to restore this order?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void runRestore()}>
              {busy ? "Restoring…" : "Restore"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
