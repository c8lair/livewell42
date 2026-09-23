export const SITE_ORIGIN = "https://livewell42.com";

export async function queueMail(
  kind: string,
  to: string,
  subject: string,
  body: string,
) {
  const { queueMail: send } = await import("@/lib/mail.server");
  await send(kind, to, subject, body);
}

export function nexaUrls(npRef: string) {
  return {
    success_url: `${SITE_ORIGIN}/checkout/success?np=${encodeURIComponent(npRef)}`,
    cancel_url: `${SITE_ORIGIN}/checkout/success?cancelled=1`,
    callback_url: `${SITE_ORIGIN}/api/nexapay/webhook`,
  };
}

export function newClientRef() {
  return `lw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
