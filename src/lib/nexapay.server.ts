import { createHmac, timingSafeEqual } from "node:crypto";

const NEXAPAY_BASE = "https://nexapay.one/api/v1";

export type NexaPayCreateInput = {
  amount: number;
  currency?: string;
  crypto?: string;
  description: string;
  customer_email: string;
  success_url: string;
  cancel_url: string;
  callback_url: string;
};

export type NexaPayPayment = {
  order_id: string;
  checkout_url: string;
  status?: string;
  amount?: number;
  currency?: string;
  [key: string]: unknown;
};

type CreatePaymentResponse = {
  payment?: NexaPayPayment;
  order_id?: string;
  checkout_url?: string;
  status?: string;
  [key: string]: unknown;
};

function extractPayment(data: CreatePaymentResponse): NexaPayPayment {
  const payment = data.payment ?? data;
  const orderId = String(
    (payment as NexaPayPayment).order_id ?? data.order_id ?? "",
  );
  const checkoutUrl = String(
    (payment as NexaPayPayment).checkout_url ?? data.checkout_url ?? "",
  );
  if (!orderId || !checkoutUrl) {
    throw new Error("NexaPay response missing order_id or checkout_url.");
  }
  return {
    ...(payment as NexaPayPayment),
    order_id: orderId,
    checkout_url: checkoutUrl,
    status: String((payment as NexaPayPayment).status ?? data.status ?? ""),
  };
}

export async function createPayment(
  apiKey: string,
  input: NexaPayCreateInput,
): Promise<NexaPayPayment> {
  if (!apiKey) {
    throw new Error(
      "NexaPay API key is not configured. Add it in Admin → Settings.",
    );
  }
  const res = await fetch(`${NEXAPAY_BASE}/payments`, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency ?? "USD",
      crypto: input.crypto ?? "USDC",
      description: input.description,
      customer_email: input.customer_email,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
      callback_url: input.callback_url,
    }),
  });
  const text = await res.text();
  let data: CreatePaymentResponse;
  try {
    data = JSON.parse(text) as CreatePaymentResponse;
  } catch {
    throw new Error(
      `NexaPay create-payment failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!res.ok) {
    const msg =
      (typeof data === "object" &&
        data &&
        ("message" in data || "error" in data) &&
        String((data as { message?: string; error?: string }).message ??
          (data as { error?: string }).error)) ||
      text.slice(0, 200);
    throw new Error(`NexaPay create-payment failed (${res.status}): ${msg}`);
  }
  return extractPayment(data);
}

export async function getPayment(
  apiKey: string,
  orderId: string,
): Promise<NexaPayPayment> {
  if (!apiKey) {
    throw new Error(
      "NexaPay API key is not configured. Add it in Admin → Settings.",
    );
  }
  const res = await fetch(
    `${NEXAPAY_BASE}/payments/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    },
  );
  const text = await res.text();
  let data: CreatePaymentResponse;
  try {
    data = JSON.parse(text) as CreatePaymentResponse;
  } catch {
    throw new Error(
      `NexaPay get-payment failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!res.ok) {
    const msg =
      (typeof data === "object" &&
        data &&
        ("message" in data || "error" in data) &&
        String((data as { message?: string; error?: string }).message ??
          (data as { error?: string }).error)) ||
      text.slice(0, 200);
    throw new Error(`NexaPay get-payment failed (${res.status}): ${msg}`);
  }
  const payment = data.payment ?? data;
  const oid = String(
    (payment as NexaPayPayment).order_id ?? data.order_id ?? orderId,
  );
  return {
    ...(payment as NexaPayPayment),
    order_id: oid,
    checkout_url: String(
      (payment as NexaPayPayment).checkout_url ?? data.checkout_url ?? "",
    ),
    status: String((payment as NexaPayPayment).status ?? data.status ?? ""),
  };
}

/**
 * Verify X-NexaPay-Signature over `timestamp + '.' + rawBody` with
 * NEXAPAY_WEBHOOK_SECRET. Signature may be prefixed with `sha256=`.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
  secret: string,
): boolean {
  if (!secret || !signatureHeader || !timestampHeader) return false;
  const provided = signatureHeader.trim().replace(/^sha256=/i, "");
  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");
  try {
    const a = Buffer.from(provided, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    // Fallback if provided is not hex (compare utf8 strings safely)
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
