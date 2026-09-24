import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";
import {
  CASHAPP_STEPS_LIST,
  CASHAPP_WALKTHROUGH,
  FAQ_FEES_ID,
  FAQ_PATH,
  type CashAppWalkthroughFrame,
} from "@/lib/help/content";

const FRAME_MS = 1600;

function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const apply = () => setCoarse(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return coarse;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function FrameIcon({ frame }: { frame: CashAppWalkthroughFrame }) {
  const tone =
    frame.icon === "cash"
      ? "bg-[#00d632] text-[#003b12]"
      : frame.icon === "btc"
        ? "bg-[#f7931a] text-[#1a0f00]"
        : frame.icon === "buy"
          ? "bg-accent text-accent-fg"
          : frame.icon === "ok"
            ? "bg-[#3d9a6a] text-[#06140c]"
            : "border-2 border-border bg-raised text-fg";
  return (
    <div
      className={cn(
        "mx-auto mb-4 grid size-[72px] place-items-center rounded-full text-[28px] font-bold",
        frame.icon === "buy" || frame.icon === "amt" ? "text-lg" : "",
        tone,
      )}
    >
      {frame.iconLabel}
    </div>
  );
}

export function CashAppBtcExplainer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFrameIdx(0);
      return;
    }
    if (reduced) return;
    const timer = window.setInterval(() => {
      setFrameIdx((i) => (i + 1) % CASHAPP_WALKTHROUGH.length);
    }, FRAME_MS);
    return () => window.clearInterval(timer);
  }, [open, reduced]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function clearLeave() {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  function scheduleLeave() {
    if (coarse) return;
    clearLeave();
    leaveTimer.current = window.setTimeout(() => onOpenChange(false), 280);
  }

  if (!open || typeof document === "undefined") return null;

  const frame = CASHAPP_WALKTHROUGH[frameIdx] ?? CASHAPP_WALKTHROUGH[0];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      onMouseLeave={scheduleLeave}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-[400px] overflow-auto rounded-[14px] border border-border bg-surface shadow-2xl"
        onMouseEnter={clearLeave}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h3 id={titleId} className="font-display text-[17px] font-medium">
            Buy Bitcoin in Cash App
          </h3>
          <button
            ref={closeRef}
            type="button"
            className="grid size-9 place-items-center text-2xl leading-none text-muted hover:text-fg"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            ×
          </button>
        </header>

        <div
          className="relative mx-4 mt-4 max-h-[420px] overflow-hidden rounded-xl border border-border bg-[#0a0c10]"
          style={{ aspectRatio: "9 / 14" }}
          aria-label="Looping Cash App Bitcoin walkthrough"
        >
          <span className="absolute top-2 left-2 z-[2] rounded-full bg-black/65 px-2 py-0.5 text-[10px] tracking-[0.06em] text-accent uppercase">
            Walkthrough · looping
          </span>
          <div className="flex h-full flex-col items-center justify-center px-5 py-6 text-center">
            <div key={frame.id} className="lw-frame-in w-full">
              <FrameIcon frame={frame} />
              <h4 className="text-base font-medium text-fg">{frame.title}</h4>
              <p className="mt-1.5 text-[13px] text-muted">{frame.body}</p>
            </div>
            <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
              {CASHAPP_WALKTHROUGH.map((f, i) => (
                <span
                  key={f.id}
                  className={cn(
                    "size-1.5 rounded-full",
                    i === frameIdx ? "bg-accent" : "bg-border",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pt-3 pb-4">
          <div className="mb-3 rounded-lg border border-[#c9a227]/35 bg-[#c9a227]/10 px-3 py-2.5 text-xs leading-relaxed text-[#e8d48a]">
            Cash App (and other) fees vary. Add a few extra dollars so you cover fees and
            network costs.
            <br />
            <Link
              to={FAQ_PATH}
              hash={FAQ_FEES_ID}
              className="text-accent underline-offset-4 hover:underline"
              onClick={() => onOpenChange(false)}
            >
              Why add extra? See FAQ → fees
            </Link>
          </div>
          <ol className="m-0 list-decimal space-y-1 pl-[18px] text-[13px] text-muted">
            {CASHAPP_STEPS_LIST.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function BtcCashAppHelp({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const coarse = useCoarsePointer();

  function stop(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <span className={cn("relative inline-flex items-center", className)} onClick={stop} onMouseDown={stop}>
      <button
        type="button"
        className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border border-accent bg-accent/15 text-[13px] font-bold text-accent hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none"
        aria-label="How to buy Bitcoin with Cash App"
        title="How to buy with Cash App"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e) => {
          stop(e);
          if (open && coarse) setOpen(false);
          else setOpen(true);
        }}
        onMouseEnter={() => {
          if (!coarse) setOpen(true);
        }}
        onFocus={() => {
          if (!coarse) setOpen(true);
        }}
      >
        ?
      </button>
      <CashAppBtcExplainer open={open} onOpenChange={setOpen} />
    </span>
  );
}

export function BtcPayOptionRow({
  selected,
  onSelect,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  description: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid cursor-pointer grid-cols-[1fr_auto] items-start gap-x-2 rounded-md border px-3 py-3 text-sm",
        selected
          ? "border-accent bg-raised text-fg"
          : "border-border text-muted hover:bg-raised/40",
      )}
      onClick={onSelect}
    >
      <button type="button" className="col-start-1 row-start-1 text-left" onClick={onSelect}>
        <span className="font-medium text-fg">Pay with Bitcoin</span>
      </button>
      <BtcCashAppHelp className="col-start-2 row-start-1 mt-0.5" />
      {selected ? (
        <p className="col-span-2 mt-1 text-xs leading-relaxed text-faint">{description}</p>
      ) : null}
    </div>
  );
}
