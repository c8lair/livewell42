import { getSql } from "@/lib/db";
import type { Me } from "./types";

export async function ensureProfile(
  userId: string,
  email: string | null | undefined,
): Promise<Me> {
  const sql = await getSql();
  const mail = (email ?? "").trim();
  const existing = await sql<{
    user_id: string;
    email: string;
    is_admin: boolean;
    membership_paid_at: string | null;
    credit_cents: number;
    legal_accepted_at: string | null;
  }>`select user_id, email, is_admin, membership_paid_at, credit_cents, legal_accepted_at from profiles where user_id = ${userId}`;

  if (existing[0]) {
    const p = existing[0];
    if (mail && !p.email) {
      await sql`update profiles set email = ${mail} where user_id = ${userId} and email = ''`;
      p.email = mail;
    }
    return {
      userId: p.user_id,
      email: p.email,
      isAdmin: p.is_admin,
      member: Boolean(p.membership_paid_at),
      creditCents: p.credit_cents,
      legalAcceptedAt: p.legal_accepted_at,
    };
  }

  const admins = await sql<{ c: number }>`select count(*)::int as c from profiles where is_admin = true`;
  const isAdmin = (admins[0]?.c ?? 0) === 0;
  await sql`insert into profiles (user_id, email, is_admin, membership_paid_at) values (${userId}, ${mail}, ${isAdmin}, now())`;
  return {
    userId,
    email: mail,
    isAdmin,
    member: true,
    creditCents: 0,
    legalAcceptedAt: null,
  };
}

export async function requireAdmin(userId: string) {
  const me = await ensureProfile(userId, null);
  if (!me.isAdmin) throw new Error("Admin only.");
  return me;
}
