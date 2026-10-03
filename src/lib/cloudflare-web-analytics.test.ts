import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLOUDFLARE_WEB_ANALYTICS_BEACON_SRC,
  CLOUDFLARE_WEB_ANALYTICS_DASHBOARD_URL,
  CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV,
  cloudflareWebAnalyticsBeaconDataset,
  readCloudflareWebAnalyticsToken,
} from "./cloudflare-web-analytics.ts";

describe("Cloudflare Web Analytics helpers", () => {
  it("reads CLOUDFLARE_WEB_ANALYTICS_TOKEN and ignores blanks", () => {
    assert.equal(CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV, "CLOUDFLARE_WEB_ANALYTICS_TOKEN");
    assert.equal(readCloudflareWebAnalyticsToken({}), "");
    assert.equal(readCloudflareWebAnalyticsToken({ CLOUDFLARE_WEB_ANALYTICS_TOKEN: "  " }), "");
    assert.equal(
      readCloudflareWebAnalyticsToken({ CLOUDFLARE_WEB_ANALYTICS_TOKEN: " abc123 " }),
      "abc123",
    );
  });

  it("builds the official beacon data-cf-beacon payload", () => {
    assert.equal(cloudflareWebAnalyticsBeaconDataset(""), null);
    assert.equal(
      cloudflareWebAnalyticsBeaconDataset("site-token"),
      JSON.stringify({ token: "site-token" }),
    );
    assert.equal(
      CLOUDFLARE_WEB_ANALYTICS_BEACON_SRC,
      "https://static.cloudflareinsights.com/beacon.min.js",
    );
    assert.match(CLOUDFLARE_WEB_ANALYTICS_DASHBOARD_URL, /web-analytics/);
  });
});
