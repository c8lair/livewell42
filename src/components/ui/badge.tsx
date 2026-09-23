import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({
  on,
  children,
  className,
}: {
  on?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
        on
          ? "border-emerald-700/70 bg-emerald-950/40 text-emerald-200"
          : "border-border text-faint",
        className,
      )}
    >
      {children}
    </span>
  );
}
