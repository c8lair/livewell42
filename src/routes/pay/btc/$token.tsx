import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { getBtcPayment, refreshBtcQuote, type BtcPaymentView } from "@/lib/btc/payment";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/pay/btc/$token")({
  component: BtcPayPage,
});

function BtcPayPage() {
  const { token } = Route.useParams();
  const [view, setView] = useState<BtcPaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string>("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getBtcPayment({ data: { token } });
      setView(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment not found.");
    }
  }, [token]);

  useEffect(() => {
    void load();
    const poll = setInterval(() => void load(), 12_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  useEffect(() => {
    if (!view?.bip21) {
      setQr("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(view.bip21, {
      width: 280,
      margin: 2,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQr(url);
    });
    return () => {
      cancelled = true;
    };
  }, [view?.bip21]);

  const countdown = useMemo(() => {
    if (!view?.quoteExpiresAt || view.paid) return null;
    const ms = new Date(view.quoteExpiresAt).getTime() - now;
    if (ms <= 0) return "Expired";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }, [view, now]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  }

  async function onRefreshQuote() {
    setBusy(true);
    try {
      const data = await refreshBtcQuote({ data: { token } });
      setView(data);
      toast.success("Quote refreshed — 15 minutes");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh quote");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display text-3xl">Bitcoin payment</h1>
        <p className="mt-4 text-muted">{error}</p>
        <Link to="/" className="mt-8 inline-block text-accent">
          Back to shop
        </Link>
      </main>
    );
  }

  if (!view) {
    return <div className="min-h-dvh bg-bg" />;
  }

  if (view.paid) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="text-xs tracking-wide text-faint uppercase">Livewell42</p>
        <h1 className="mt-3 font-display text-4xl">Paid</h1>
        <p className="mt-4 text-muted">
          Order {view.orderNumber} is confirmed on-chain.
        </p>
        {view.txid ? (
          <p className="mt-3 break-all text-xs text-faint">
            {view.explorerTxUrl ? (
              <a
                href={view.explorerTxUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                {view.txid}
              </a>
            ) : (
              view.txid
            )}
          </p>
        ) : null}
        {view.overpayNote ? (
          <p className="mt-3 text-sm text-muted">{view.overpayNote}</p>
        ) : null}
        <Link
          to="/"
          className="mt-10 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Back to shop
        </Link>
      </main>
    );
  }

  const statusLabel =
    view.btcStatus === "seen"
      ? "Seen in mempool — waiting for 1 confirmation"
      : view.btcStatus === "underpaid"
        ? "Underpaid — send the remaining amount"
        : view.btcStatus === "expired"
          ? "Quote expired — refresh to continue"
          : view.btcStatus === "cancelled"
            ? "Cancelled"
            : "Waiting for payment";

  const showAmount =
    view.btcStatus === "underpaid" ? view.btcRemaining : view.btcAmount;

  return (
    <main className="mx-auto max-w-lg px-5 pb-20 pt-10">
      <p className="text-xs tracking-wide text-faint uppercase">Livewell42</p>
      {view.testBitcoinPayments ? (
        <p className="mt-2 inline-block rounded-md border border-border bg-raised px-2 py-0.5 text-xs text-muted">
          Test mode
        </p>
      ) : null}
      <h1 className="mt-2 font-display text-3xl">Pay with Bitcoin</h1>
      <p className="mt-2 text-sm text-muted">
        Order {view.orderNumber}
        {view.testnet ? " · testnet" : ""}
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-center">
        {qr ? (
          <img
            src={qr}
            alt="Bitcoin payment QR"
            className="mx-auto rounded-md bg-white p-2"
            width={280}
            height={280}
          />
        ) : (
          <div className="mx-auto grid h-[280px] w-[280px] place-items-center text-sm text-muted">
            Preparing QR…
          </div>
        )}
        <p className="mt-3 text-sm font-medium text-fg">{statusLabel}</p>
        {countdown ? (
          <p className="mt-1 text-xs text-muted">
            Quote timer: <span className="tabular-nums text-fg">{countdown}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-6 space-y-3 text-sm">
        <Row
          label="USD total"
          value={cents(view.usdTotalCents)}
          onCopy={() => void copy(cents(view.usdTotalCents), "USD")}
        />
        <Row
          label={view.btcStatus === "underpaid" ? "BTC remaining" : "BTC amount"}
          value={`${showAmount} BTC`}
          onCopy={() => void copy(showAmount, "BTC amount")}
        />
        {view.btcStatus === "underpaid" ? (
          <Row label="Received so far" value={`${view.btcReceived} BTC`} />
        ) : null}
        <Row
          label="Address"
          value={view.address}
          mono
          onCopy={() => void copy(view.address, "Address")}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <a
          href={view.bip21}
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Open wallet
        </a>
        {(view.btcStatus === "underpaid" ||
          view.btcStatus === "expired" ||
          countdown === "Expired") && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void onRefreshQuote()}
          >
            {busy ? "Refreshing…" : "Refresh quote (15 min)"}
          </Button>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-faint">
        Send the <span className="text-muted">exact</span> BTC amount shown. You
        can close this tab — we emailed the same link. Status updates when the
        network confirms (1 confirmation required; unconfirmed is only “seen”).
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
  onCopy,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-md border border-border bg-raised px-3 py-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-faint">{label}</p>
          <p
            className={`mt-0.5 break-all text-fg ${mono ? "font-mono text-xs" : "font-medium"}`}
          >
            {value}
          </p>
        </div>
        {onCopy ? (
          <button
            type="button"
            className="shrink-0 text-xs text-accent hover:underline"
            onClick={onCopy}
          >
            Copy
          </button>
        ) : null}
      </div>
    </div>
  );
}
