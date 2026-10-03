import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { readCloudflareWebAnalyticsToken } from "@/lib/cloudflare-web-analytics";

/** Public site token for the beacon. Safe to expose — it ships in page HTML. */
export const getCloudflareWebAnalyticsBeaconToken = createServerFn({ method: "GET" }).handler(
  async () => ({ token: readCloudflareWebAnalyticsToken() }),
);

/** Admin-only: whether Clay has pasted the dashboard site token. */
export const getCloudflareWebAnalyticsStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/auth/assert-admin.server");
    await assertAdmin(context.userId);
    return { tokenConfigured: Boolean(readCloudflareWebAnalyticsToken()) };
  });
