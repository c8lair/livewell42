/**
 * Queue outbound mail into mail_log (same pattern used across the app).
 * A worker / admin mail panel reads from this table.
 */
import { getSql } from "@/lib/db";

export async function queueMail(
  kind: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!to) return;
  const sql = await getSql();
  await sql`insert into mail_log (kind, to_email, subject, body) values (${kind}, ${to}, ${subject}, ${body})`;
}

export async function setOrderMailError(
  orderId: number,
  message: string,
): Promise<void> {
  const sql = await getSql();
  try {
    await sql`update orders set mail_error = ${message.slice(0, 2000)} where id = ${orderId}`;
  } catch {
    /* column may not exist yet mid-migrate — ignore */
  }
}

export async function clearOrderMailError(orderId: number): Promise<void> {
  const sql = await getSql();
  try {
    await sql`update orders set mail_error = null where id = ${orderId}`;
  } catch {
    /* ignore */
  }
}
