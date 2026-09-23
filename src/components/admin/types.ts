import type { adminGet, Product } from "@/lib/store";

export type AdminData = Awaited<ReturnType<typeof adminGet>>;
export type AdminOrder = AdminData["orders"][number];
export type AdminMail = AdminData["mail"][number];
export type AdminUnmatched = NonNullable<AdminData["unmatchedBtc"]>[number];
export type { Product };
