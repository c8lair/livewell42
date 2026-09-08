/**
 * Queue outbound mail into mail_log, then send via Zoho SMTP (nodemailer)
 * when SMTP_* env is configured. Password-reset and paid-order receipts
 * call queueMail and expect real delivery.
 */
import nodemailer from "nodemailer";
import { getSql } from "@/lib/db";

type MailRow = {
  id: number;
  to_email: string;
  subject: string;
  body: string;
  attempts: number;
};

function envTrim(key: string): string {
  return (process.env[key] ?? "").trim();
}

function smtpSecure(): boolean {
  const raw = envTrim("SMTP_SECURE") || "true";
  return raw === "true" || raw === "1";
}

/** True when SMTP_HOST, SMTP_USER, and SMTP_PASS are usable (HOST may default). */
export function isSmtpConfigured(): boolean {
  const host = envTrim("SMTP_HOST") || "smtppro.zoho.com";
  const user = envTrim("SMTP_USER");
  const pass = envTrim("SMTP_PASS");
  return Boolean(host && user && pass);
}

function smtpFromAddress(): string {
  const from = envTrim("SMTP_FROM") || "orders@livewell42.com";
  const name = envTrim("SMTP_FROM_NAME") || "Livewell42 Orders";
  return `"${name}" <${from}>`;
}

function createTransport() {
  const host = envTrim("SMTP_HOST") || "smtppro.zoho.com";
  const port = Number(envTrim("SMTP_PORT") || "465") || 465;
  const user = envTrim("SMTP_USER");
  const pass = envTrim("SMTP_PASS");
  return nodemailer.createTransport({
    host,
    port,
    secure: smtpSecure(),
    auth: { user, pass },
  });
}

async function markSent(id: number): Promise<void> {
  const sql = await getSql();
  await sql`
    update mail_log
    set sent_at = now(), error = null, attempts = attempts + 1
    where id = ${id}`;
}

async function markError(id: number, message: string): Promise<void> {
  const sql = await getSql();
  await sql`
    update mail_log
    set attempts = attempts + 1, error = ${message.slice(0, 2000)}
    where id = ${id}`;
}

async function sendMailRow(row: MailRow): Promise<void> {
  if (!isSmtpConfigured()) {
    const msg = "SMTP is not configured";
    try {
      await markError(row.id, msg);
    } catch {
      /* columns may not exist yet mid-migrate */
    }
    throw new Error(msg);
  }
  try {
    const transport = createTransport();
    await transport.sendMail({
      from: smtpFromAddress(),
      to: row.to_email,
      subject: row.subject,
      text: row.body,
    });
    await markSent(row.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await markError(row.id, msg);
    } catch {
      /* ignore mark failure */
    }
    throw err instanceof Error ? err : new Error(msg);
  }
}

/**
 * Insert into mail_log, then send immediately when SMTP is configured.
 * Always inserts. Throws on send failure or when SMTP is not configured
 * so callers (receipt paths) can set orders.mail_error.
 */
export async function queueMail(
  kind: string,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!to) return;
  const sql = await getSql();
  const inserted = await sql<{ id: number }>`
    insert into mail_log (kind, to_email, subject, body)
    values (${kind}, ${to}, ${subject}, ${body})
    returning id`;
  const id = inserted[0]?.id;
  if (id == null) {
    throw new Error("Failed to insert mail_log row");
  }

  try {
    await sendMailRow({
      id,
      to_email: to,
      subject,
      body,
      attempts: 0,
    });
  } finally {
    // Drain other pending rows (fire-and-forget so a backlog drain
    // does not mask the primary send error).
    void drainMailQueue().catch((err) => {
      console.error("drainMailQueue after queueMail", err);
    });
  }
}

/** Send oldest unsent mail_log rows (attempts < 5), up to ~20. */
export async function drainMailQueue(limit = 20): Promise<{
  attempted: number;
  sent: number;
  failed: number;
}> {
  if (!isSmtpConfigured()) {
    return { attempted: 0, sent: 0, failed: 0 };
  }
  const sql = await getSql();
  let rows: MailRow[] = [];
  try {
    rows = await sql<MailRow>`
      select id, to_email, subject, body, attempts
      from mail_log
      where sent_at is null and attempts < 5
      order by id asc
      limit ${limit}`;
  } catch (err) {
    // Columns may not exist yet mid-migrate.
    console.error("drainMailQueue select failed", err);
    return { attempted: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await sendMailRow(row);
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { attempted: rows.length, sent, failed };
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
