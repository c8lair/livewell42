import { getSql } from "@/lib/db";

/** Fail closed unless the profile row is marked admin. */
export async function assertAdmin(userId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ is_admin: boolean }>`
    select is_admin from profiles where user_id = ${userId}`;
  if (!rows[0]?.is_admin) throw new Error("Admin only.");
}
