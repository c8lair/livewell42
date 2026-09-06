import { createFileRoute } from "@tanstack/react-router";
import { finalizePayment } from "@/lib/store";
import { verifyWebhookSignature } from "@/lib/nexapay.server";

export const Route = createFileRoute("/api/nexapay/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NEXAPAY_WEBHOOK_SECRET ?? "";
        const rawBody = await request.text();
        const signature =
          request.headers.get("X-NexaPay-Signature") ??
          request.headers.get("x-nexapay-signature");
        const timestamp =
          request.headers.get("X-NexaPay-Timestamp") ??
          request.headers.get("x-nexapay-timestamp");

        if (!secret) {
          return new Response(JSON.stringify({ error: "webhook secret not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!verifyWebhookSignature(rawBody, signature, timestamp, secret)) {
          return new Response(JSON.stringify({ error: "invalid signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return new Response(JSON.stringify({ error: "invalid json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const payment =
          typeof payload.payment === "object" && payload.payment
            ? (payload.payment as Record<string, unknown>)
            : payload;
        const orderId = String(
          payment.order_id ?? payload.order_id ?? payload.orderId ?? "",
        );
        const status = String(
          payment.status ?? payload.status ?? "",
        ).toLowerCase();

        if (!orderId) {
          return new Response(JSON.stringify({ ok: true, ignored: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (status && status !== "completed") {
          return new Response(
            JSON.stringify({ ok: true, status, finalized: false }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        try {
          const result = await finalizePayment(orderId);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          console.error("nexapay webhook finalize error", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "finalize failed",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
