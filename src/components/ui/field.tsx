import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-xs font-medium tracking-wide text-muted", className)}>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "mt-1.5 h-11 w-full rounded-md border border-border bg-raised px-3 text-sm text-fg outline-none ring-accent/30 placeholder:text-faint focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "mt-1.5 min-h-24 w-full rounded-md border border-border bg-raised px-3 py-2 text-sm text-fg outline-none ring-accent/30 placeholder:text-faint focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "mt-1.5 h-11 w-full rounded-md border border-border bg-raised px-3 text-sm text-fg outline-none ring-accent/30 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-snug text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-accent"
      />
      <span className="pt-0.5">{children}</span>
    </label>
  );
}
