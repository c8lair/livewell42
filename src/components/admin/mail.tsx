import { Button } from "@/components/ui/button";
import type { AdminData } from "./types";

export function MailBlock({ mail }: { mail: AdminData["mail"] }) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-medium">Mail queue</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            window.open("https://mail.zoho.com", "_blank", "noopener,noreferrer")
          }
        >
          Check Email
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Sent via Zoho SMTP when SMTP_* is configured on Railway. Orders still save if
        email fails; check mail_error on the order.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {mail.length === 0 ? (
          <p className="text-sm text-muted">No outgoing mail yet.</p>
        ) : null}
        {mail.map((m) => (
          <li key={m.id} className="rounded-md border border-border bg-surface p-3">
            <p className="text-muted">
              {m.kind} → {m.to_email}
            </p>
            <p>{m.subject}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
