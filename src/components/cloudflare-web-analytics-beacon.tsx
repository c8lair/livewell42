import {
  CLOUDFLARE_WEB_ANALYTICS_BEACON_SRC,
  cloudflareWebAnalyticsBeaconDataset,
} from "@/lib/cloudflare-web-analytics";

/**
 * Official Cloudflare Web Analytics beacon. Rendered from the root layout so it
 * loads on public pages. No script until CLOUDFLARE_WEB_ANALYTICS_TOKEN is set.
 */
export function CloudflareWebAnalyticsBeacon({ token }: { token: string }) {
  const dataset = cloudflareWebAnalyticsBeaconDataset(token);
  if (!dataset) return null;
  return <script defer src={CLOUDFLARE_WEB_ANALYTICS_BEACON_SRC} data-cf-beacon={dataset} />;
}
