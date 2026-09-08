import { createFileRoute } from "@tanstack/react-router";
import { processOpenBtcOrders } from "@/lib/btc/watch.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function run(request: Request) {
  try {
    // Optional shared secret (configure later via env).
    const expected = process.env.BTC_WATCH_SECRET?.trim() ?? "";
    if (expected) {
      const got =
        request.headers.get("x-btc-watch-secret") ??
        request.headers.get("X-Btc-Watch-Secret") ??
        "";
      if (got !== expected) {
        return json({ error: "unauthorized" }, 401);
      }
    }
    const result = await processOpenBtcOrders();
    return json({ ok: true, ...result });
  } catch (err) {
    console.error("btc watch error", err);
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "watch failed",
      },
      500,
    );
  }
}

export const Route = createFileRoute("/api/btc/watch")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
