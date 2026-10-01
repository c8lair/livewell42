import { cents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import type { AdminData } from "./types";

export function MembersBlock({ members }: { members: AdminData["members"] }) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-medium">Members</h1>
        <Badge>{members.length} total</Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        Accounts in signup order. Membership status and credit balance.
      </p>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {members.length === 0 ? (
          <p className="text-sm text-muted">No members yet.</p>
        ) : null}
        {members.map((m) => {
          const paid = Boolean(m.membership_paid_at);
          return (
            <li
              key={m.email}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">{m.email}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {m.membership_paid_at
                    ? `Member since ${new Date(m.membership_paid_at).toLocaleDateString()}`
                    : "Signed up — not a member"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge on={paid}>{paid ? "Member" : "No membership"}</Badge>
                <span className="tabular-nums text-muted">
                  {cents(m.credit_cents)} credit
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
