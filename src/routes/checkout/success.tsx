import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { confirmNexaPayPayment } from "@/lib/store";

type Search = {
  np?: string;
  cancelled?: string;
  order_id?: string;
};

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    np: typeof search.np === "string" ? search.np : undefined,
    cancelled:
      typeof search.cancelled === "string" ? search.cancelled : undefined,
    order_id:
      typeof search.order_id === "string" ? search.order_id : undefined,
  }),
  component: CheckoutSuccess,
});

function CheckoutSuccess() {
  const { np, cancelled, order_id } = Route.useSearch();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "cancelled" }
    | { kind: "ok"; message: string }
    | { kind: "error"; message: string }
  >(() => (cancelled === "1" ? { kind: "cancelled" } : { kind: "loading" }));

  useEffect(() => {
    if (cancelled === "1") return;
    let stored = "";
    try {
      stored = sessionStorage.getItem("lw42_np") ?? "";
    } catch {
      /* ignore */
    }
    const ref = (np || order_id || stored || "").trim();
    if (!ref) {
      setState({
        kind: "error",
        message:
          "Missing payment reference. If you completed checkout, wait a moment or contact support.",
      });
      return;
    }
    let cancelledFetch = false;
    void (async () => {
      try {
        const res = await confirmNexaPayPayment({ data: { orderId: ref } });
        if (cancelledFetch) return;
        if (res.ok) {
          try {
            sessionStorage.removeItem("lw42_np");
          } catch {
            /* ignore */
          }
          setState({
            kind: "ok",
            message:
              res.kind === "membership"
                ? res.already
                  ? "Membership already active."
                  : "Membership paid. Welcome."
                : res.already
                  ? "Order already recorded as paid."
                  : "Payment confirmed. Your order is paid.",
          });
        } else {
          setState({
            kind: "error",
            message: res.reason || `Payment ${res.status}.`,
          });
        }
      } catch (err) {
        if (cancelledFetch) return;
        setState({
          kind: "error",
          message:
            err instanceof Error ? err.message : "Could not confirm payment.",
        });
      }
    })();
    return () => {
      cancelledFetch = true;
    };
  }, [np, order_id, cancelled]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="font-display text-sm tracking-[0.28em] text-muted uppercase">
        Livewell42
      </p>
      {state.kind === "loading" ? (
        <>
          <h1 className="mt-4 font-display text-4xl">Confirming…</h1>
          <p className="mt-4 text-sm text-muted">Checking NexaPay payment status.</p>
        </>
      ) : null}
      {state.kind === "cancelled" ? (
        <>
          <h1 className="mt-4 font-display text-4xl">Checkout cancelled</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            No charge was completed. You can try again from the shop.
          </p>
        </>
      ) : null}
      {state.kind === "ok" ? (
        <>
          <h1 className="mt-4 font-display text-4xl">Thank you</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">{state.message}</p>
        </>
      ) : null}
      {state.kind === "error" ? (
        <>
          <h1 className="mt-4 font-display text-4xl">Payment issue</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">{state.message}</p>
        </>
      ) : null}
      <div className="mt-10">
        <Link
          to="/"
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
