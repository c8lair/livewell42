import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCloudflareWebAnalyticsStatus } from "@/lib/cloudflare-web-analytics-api";
import {
  CLOUDFLARE_WEB_ANALYTICS_DASHBOARD_URL,
  CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV,
} from "@/lib/cloudflare-web-analytics";

export function AnalyticsBlock() {
  const [tokenConfigured, setTokenConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCloudflareWebAnalyticsStatus()
      .then((result) => {
        if (!cancelled) setTokenConfigured(result.tokenConfigured);
      })
      .catch(() => {
        if (!cancelled) setTokenConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-medium">Analytics</h1>
        {tokenConfigured === null ? null : (
          <Badge on={tokenConfigured}>
            {tokenConfigured ? "Beacon configured" : "Token missing"}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Cloudflare Web Analytics (free plan) for livewell42.com. Privacy-first visitor metrics — no
        Google Analytics, no Plausible, no cookies from us.
      </p>

      <div className="mt-6 rounded-xl border border-border bg-surface p-4">
        <p className="text-[11px] tracking-wide text-faint uppercase">Dashboard</p>
        <p className="mt-1 text-sm text-muted">
          Open the Cloudflare Web Analytics dashboard for this site. Sign in as the livewell42.com
          zone owner if prompted.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() =>
            window.open(CLOUDFLARE_WEB_ANALYTICS_DASHBOARD_URL, "_blank", "noopener,noreferrer")
          }
        >
          Open Cloudflare Web Analytics
        </Button>
      </div>

      {tokenConfigured === false ? (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] tracking-wide text-faint uppercase">Beacon token</p>
          <p className="mt-1 text-sm text-muted">
            Paste the site token from Cloudflare → Web Analytics → livewell42.com (free plan, Manage
            site / JS snippet) into Railway as{" "}
            <code className="text-fg">{CLOUDFLARE_WEB_ANALYTICS_TOKEN_ENV}</code>, then redeploy. Do
            not commit the token.
          </p>
        </div>
      ) : null}
    </section>
  );
}
