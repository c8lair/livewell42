/** Railway / runtime env var for the public Cloudflare Web Analytics site token. */
export const CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV = "CLOUDFLARE_WEB_ANALYTICS_TOKEN";

/** Official beacon URL (Cloudflare Web Analytics JS snippet). */
export const CLOUDFLARE_WEB_ANALYTICS_BEACON_SRC =
  "https://static.cloudflareinsights.com/beacon.min.js";

/** Dashboard deep-link; Cloudflare fills in the signed-in account. */
export const CLOUDFLARE_WEB_ANALYTICS_DASHBOARD_URL =
  "https://dash.cloudflare.com/?to=/:account/web-analytics";

export function readCloudflareWebAnalyticsToken(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): string {
  return env[CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV]?.trim() ?? "";
}

/** `data-cf-beacon` payload for the official snippet, or null when unset. */
export function cloudflareWebAnalyticsBeaconDataset(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  return JSON.stringify({ token: trimmed });
}
