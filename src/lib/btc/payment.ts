/**
 * Client-safe Bitcoin payment server functions.
 * Handlers dynamically import checkout.server so route components never
 * pull .server modules into the client bundle.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export type { BtcPaymentView } from "./types";

export const getBtcPayment = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().trim().min(8).max(128) }))
  .handler(async ({ data }) => {
    const { loadBtcPaymentView } = await import("./checkout.server");
    return loadBtcPaymentView(data.token);
  });

export const refreshBtcQuote = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().trim().min(8).max(128) }))
  .handler(async ({ data }) => {
    const { refreshBtcPaymentQuote } = await import("./checkout.server");
    return refreshBtcPaymentQuote(data.token);
  });

export const adminCancelBtcQuote = createServerFn({ method: "POST" })
  .validator(z.object({ orderId: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { cancelBtcQuote } = await import("./checkout.server");
    return cancelBtcQuote(context.userId, data.orderId);
  });

export const adminMarkBtcPaid = createServerFn({ method: "POST" })
  .validator(
    z.object({
      orderId: z.number().int(),
      txid: z.string().trim().max(128).optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { markBtcPaid } = await import("./checkout.server");
    return markBtcPaid(context.userId, data.orderId, data.txid);
  });

export const adminNoteUnmatched = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const { noteUnmatchedPayment } = await import("./checkout.server");
    return noteUnmatchedPayment(context.userId, data.id);
  });
