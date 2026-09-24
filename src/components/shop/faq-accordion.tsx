import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { FAQ_ITEMS } from "@/lib/help/content";
import { cn } from "@/lib/cn";

export function FaqAccordion({ onWatchGif }: { onWatchGif: () => void }) {
  const location = useLocation();
  const hashId = location.hash.replace(/^#/, "");
  const [openId, setOpenId] = useState<string | null>(() => {
    if (typeof window === "undefined") return FAQ_ITEMS[0]?.id ?? null;
    const id = window.location.hash.replace(/^#/, "");
    return FAQ_ITEMS.some((item) => item.id === id) ? id : (FAQ_ITEMS[0]?.id ?? null);
  });

  useEffect(() => {
    if (!hashId) return;
    if (!FAQ_ITEMS.some((item) => item.id === hashId)) return;
    setOpenId(hashId);
    window.requestAnimationFrame(() => {
      document.getElementById(hashId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [hashId]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {FAQ_ITEMS.map((item, index) => {
        const open = openId === item.id;
        return (
          <div
            key={item.id}
            id={item.id}
            className={cn(
              "scroll-mt-24",
              index < FAQ_ITEMS.length - 1 ? "border-b border-border" : "",
            )}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-[18px] py-4 text-left text-[15px] font-semibold text-fg hover:bg-raised"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : item.id)}
            >
              {item.question}
              <span
                className={cn(
                  "text-lg text-muted transition-transform duration-200",
                  open && "rotate-180 text-accent",
                )}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {open ? (
              <div className="px-[18px] pb-[18px] text-sm leading-relaxed text-muted">
                <p className="mb-3">{item.intro}</p>
                {item.callout ? (
                  <p className="my-3 rounded-r-lg border-l-[3px] border-[#c9a227] bg-[#c9a227]/10 px-3 py-2.5 text-[13px] text-[#e8d48a]">
                    {item.callout}
                  </p>
                ) : null}
                <ol className="mb-3.5 list-none space-y-2 p-0">
                  {item.steps.map((step, i) => (
                    <li
                      key={step}
                      className="relative rounded-lg border border-border bg-raised py-2.5 pr-3 pl-11"
                    >
                      <span className="absolute top-1/2 left-3 grid size-[22px] -translate-y-1/2 place-items-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                {item.watchGif ? (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2 text-[13px] font-semibold text-accent hover:bg-accent/20"
                    onClick={onWatchGif}
                  >
                    ▶ {item.watchLabel ?? "Watch the GIF"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
