import {
  adminCancelBtcQuote,
  adminMarkBtcPaid,
  adminNoteUnmatched,
} from "@/lib/btc/payment";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AdminData } from "./types";

function explorerTx(txid: string) {
  return `https://mempool.space/tx/${txid}`;
}

export function BitcoinOrdersBlock({
  orders,
  unmatched,
  btcConfigured,
  onSave,
}: {
  orders: AdminData["orders"];
  unmatched: NonNullable<AdminData["unmatchedBtc"]>;
  btcConfigured: boolean;
  onSave: () => void;
}) {
  const open = orders.filter(
    (o) =>
      o.payment_rail === "btc" &&
      o.status === "pending" &&
      ["waiting", "seen", "underpaid", "expired"].includes(String(o.btc_status ?? "")),
  );

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-[26px] font-medium">Bitcoin</h1>
        <Badge on={btcConfigured}>{btcConfigured ? "Configured" : "Not configured"}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Open mainnet quotes, underpayments, and unmatched deposits.
      </p>
      <ul className="mt-4 space-y-3">
        {open.length === 0 ? (
          <p className="text-sm text-muted">No open Bitcoin orders.</p>
        ) : null}
        {open.map((o) => (
          <li key={o.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">
              {o.order_number} · {cents(o.total_cents)} · {o.btc_status}
            </p>
            <p className="mt-1 break-all text-xs text-muted">
              {o.btc_amount} BTC → {o.btc_address}
            </p>
            {o.btc_txid ? (
              <a
                className="mt-1 inline-block break-all text-xs text-accent hover:underline"
                href={explorerTx(o.btc_txid)}
                target="_blank"
                rel="noreferrer"
              >
                {o.btc_txid}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void adminMarkBtcPaid({ data: { orderId: o.id } })
                    .then(() => {
                      toast.success("Marked paid");
                      onSave();
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Failed"),
                    );
                }}
              >
                Mark paid
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void adminCancelBtcQuote({ data: { orderId: o.id } })
                    .then(() => {
                      toast.success("Quote cancelled");
                      onSave();
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Failed"),
                    );
                }}
              >
                Cancel quote
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-display text-xl">Unmatched payments</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {unmatched.length === 0 ? (
          <p className="text-muted">None.</p>
        ) : (
          unmatched.map((u) => (
            <li key={u.id} className="rounded-md border border-border p-3">
              <p className="break-all text-xs">
                {u.amount} BTC · {u.address}
              </p>
              <a
                className="break-all text-xs text-accent hover:underline"
                href={explorerTx(u.txid)}
                target="_blank"
                rel="noreferrer"
              >
                {u.txid}
              </a>
              {!u.noted ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    void adminNoteUnmatched({ data: { id: u.id } })
                      .then(() => {
                        toast.success("Noted");
                        onSave();
                      })
                      .catch((err) =>
                        toast.error(err instanceof Error ? err.message : "Failed"),
                      );
                  }}
                >
                  Mark noted
                </Button>
              ) : (
                <p className="mt-1 text-xs text-faint">Noted</p>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
