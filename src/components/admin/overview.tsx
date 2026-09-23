import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { adminSalesCsv } from "@/lib/store";
import type { AdminData } from "./types";

export function OverviewBlock({ sales }: { sales: AdminData["sales"] }) {
  return (
    <div>
      <h1 className="font-display text-[26px] font-medium">Overview</h1>
      <p className="mt-1 text-sm text-muted">This year · operator desk</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="YTD sales" value={cents(sales.ytd_cents)} />
        <Stat label="Orders" value={String(sales.order_count)} />
        <Stat label="Month" value={cents(sales.mtd_cents)} />
      </div>
      <Button
        variant="outline"
        className="mt-6"
        onClick={async () => {
          const csv = await adminSalesCsv();
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "livewell42-sales.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download CSV
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] tracking-wide text-faint uppercase">{label}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{value}</p>
    </div>
  );
}
