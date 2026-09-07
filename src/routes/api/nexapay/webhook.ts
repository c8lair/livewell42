import { createFileRoute } from "@tanstack/react-router";
import { finalizePayment, getNexapayWebhookSecret } from "@/lib/store";
import { verifyWebhookSignature } from "@/lib/nexapay.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PAID_STATUSES = new Set([
  "paid",
  "success",
  "successful",
  "completed",
  "complete",
]);

export const Route = createFileRoute("/api/nexapay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const secret = await getNexapayWebhookSecret();
          const rawBody = await request.text();
          const signature =
            request.headers.get("X-NexaPay-Signature") ??
            request.headers.get("x-nexapay-signature");
          const timestamp =
            request.headers.get("X-NexaPay-Timestamp") ??
            request.headers.get("x-nexapay-timestamp");

          // Prefer DB secret; env is fallback only. Missing env alone is not a 500.
          if (secret) {
            if (!signature || !verifyWebhookSignature(rawBody, signature, timestamp, secret)) {
              return json({ error: "invalid signature" }, 401);
            }
          } else if (signature) {
            // Secret not configured but a signature was sent — reject without 500.
            return json({ error: "invalid signature" }, 401);
          }

          let payload: Record<string, unknown> = {};
          try {
            payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
          } catch {
            console.error("nexapay webhook: invalid json body");
            return json({ received: true });
          }

          const payment =
            typeof payload.payment === "object" && payload.payment
              ? (payload.payment as Record<string, unknown>)
              : payload;
          const orderId = String(
            payment.order_id ??
              payload.order_id ??
              payload.orderId ??
              payment.id ??
              "",
          ).trim();
          const status = String(
            payment.status ?? payload.status ?? payload.event ?? "",
          ).toLowerCase();

          if (!orderId || !PAID_STATUSES.has(status)) {
            return json({ received: true });
          }

          try {
            const result = await finalizePayment(orderId);
            return json({ received: true, ...result });
          } catch (err) {
            // No matching order / session (e.g. NexaPay test delivery) — ack 200.
            console.error("nexapay webhook finalize skipped", err);
            return json({ received: true });
          }
        } catch (err) {
          console.error("nexapay webhook error", err);
          return json({ received: true });
        }
      },
    },
  },
});
