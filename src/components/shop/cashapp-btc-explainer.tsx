import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { driver, type Driver, type PopoverDOM } from "driver.js";
import { cn } from "@/lib/cn";
import { FAQ_FEES_ID, FAQ_PATH } from "@/lib/help/content";
import { createCashAppPhoneScreen } from "@/lib/help/phone-screen";
import {
  CASHAPP_DRIVER_POPOVER_CLASS,
  CASHAPP_FEE_FAQ_LABEL,
  CASHAPP_FEE_NOTE,
  CASHAPP_TOUR_TITLE,
  cashAppDriverSteps,
  cashAppFeeFaqHref,
} from "@/lib/help/walkthrough";

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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function decorateCashAppPopover(
  popover: PopoverDOM,
  index: number,
  onFeeClick: (event: Event) => void,
  reducedMotion: boolean,
) {
  const wrapper = popover.wrapper;
  wrapper.setAttribute("aria-modal", "true");
  popover.description.setAttribute("aria-live", "polite");

  let kicker = wrapper.querySelector<HTMLElement>("[data-lw-cashapp-kicker]");
  if (!kicker) {
    kicker = document.createElement("p");
    kicker.dataset.lwCashappKicker = "";
    kicker.className = "lw-cashapp-driver__kicker";
    kicker.textContent = CASHAPP_TOUR_TITLE;
    popover.title.before(kicker);
  }

  wrapper.querySelector("[data-lw-cashapp-phone]")?.remove();
  const phone = createCashAppPhoneScreen(document, index, reducedMotion);
  phone.setAttribute("aria-hidden", "true");
  popover.title.before(phone);

  let fee = wrapper.querySelector<HTMLElement>("[data-lw-cashapp-fee]");
  if (!fee) {
    fee = document.createElement("div");
    fee.dataset.lwCashappFee = "";
    fee.className = "lw-cashapp-driver__fee";
    const copy = document.createElement("p");
    copy.textContent = CASHAPP_FEE_NOTE;
    const link = document.createElement("a");
    link.href = cashAppFeeFaqHref();
    link.textContent = CASHAPP_FEE_FAQ_LABEL;
    link.addEventListener("click", onFeeClick);
    fee.append(copy, link);
    popover.description.after(fee);
  }
}

export function CashAppBtcExplainer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    if (!open) return;

    let ignoreDestroyed = false;
    const reducedMotion = prefersReducedMotion();
    const instance = driver({
      animate: !reducedMotion,
      overlayColor: "#000000",
      overlayOpacity: 0.7,
      allowClose: true,
      allowScroll: false,
      allowKeyboardControl: true,
      overlayClickBehavior: "close",
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Prev",
      doneBtnText: "Done",
      popoverClass: CASHAPP_DRIVER_POPOVER_CLASS,
      steps: cashAppDriverSteps(),
      onPopoverRender: (popover, { index }) => {
        decorateCashAppPopover(
          popover,
          index ?? 0,
          (event) => {
            event.preventDefault();
            instance.destroy();
            void navigate({ to: FAQ_PATH, hash: FAQ_FEES_ID });
          },
          reducedMotion,
        );
      },
      onDestroyed: () => {
        if (driverRef.current === instance) driverRef.current = null;
        if (!ignoreDestroyed) onOpenChange(false);
      },
    });

    driverRef.current = instance;
    instance.drive();

    function onExtraKeys(event: KeyboardEvent) {
      if (!instance.isActive()) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        instance.moveNext();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        instance.movePrevious();
      }
    }
    window.addEventListener("keydown", onExtraKeys);

    return () => {
      window.removeEventListener("keydown", onExtraKeys);
      ignoreDestroyed = true;
      if (driverRef.current === instance) driverRef.current = null;
      if (instance.isActive()) instance.destroy();
    };
  }, [open, onOpenChange, navigate]);

  return null;
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
