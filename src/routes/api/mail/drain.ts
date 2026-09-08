import { createFileRoute } from "@tanstack/react-router";
import { drainMailQueue } from "@/lib/mail.server";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function run(request: Request) {
  try {
    // Optional shared secret (same pattern as /api/btc/watch).
    const expected = process.env.MAIL_DRAIN_SECRET?.trim() ?? "";
    if (expected) {
      const got =
        request.headers.get("x-mail-drain-secret") ??
        request.headers.get("X-Mail-Drain-Secret") ??
        "";
      if (got !== expected) {
        return json({ error: "unauthorized" }, 401);
      }
    }
    const result = await drainMailQueue();
    return json({ ok: true, ...result });
  } catch (err) {
    console.error("mail drain error", err);
    return json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "drain failed",
      },
      500,
    );
  }
}

export const Route = createFileRoute("/api/mail/drain")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
