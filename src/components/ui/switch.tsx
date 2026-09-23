import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-[42px] shrink-0 rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-accent" : "bg-border",
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white transition-transform",
          checked && "translate-x-[18px]",
        )}
      />
    </button>
  );
}
