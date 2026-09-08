import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import {
  adminGet,
  adminRestoreOrder,
  adminSaveProduct,
  adminSaveSettings,
  adminSalesCsv,
  adminSoftDeleteOrder,
  adminUpdateOrder,
  repairOwnerAdmin,
  type Product,
} from "@/lib/store";
import {
  adminCancelBtcQuote,
  adminMarkBtcPaid,
  adminNoteUnmatched,
} from "@/lib/btc/payment";
import { cents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminGet>> | null>(null);
  const [denied, setDenied] = useState(false);

  async function refresh() {
    try {
      setData(await adminGet());
      setDenied(false);
    } catch {
      setDenied(true);
    }
  }

  useEffect(() => {
    if (!isPending && user) void refresh();
  }, [isPending, user]);

  if (isPending) return <div className="min-h-dvh bg-bg" />;
  if (!user) return <Navigate to="/login" />;
  if (denied) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-muted">This desk is for the operator only.</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void repairOwnerAdmin()
                .then(() => {
                  toast.success("Operator access restored");
                  void refresh();
                })
                .catch((err) => {
                  toast.error(err instanceof Error ? err.message : "Could not repair access.");
                });
            }}
          >
            Repair operator access
          </Button>
          <Link to={user ? "/" : "/login"} className="inline-block text-accent">
            Back
          </Link>
        </div>
      </main>
    );
  }
  if (!data) return <div className="min-h-dvh bg-bg" />;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16">
      <header className="flex items-center justify-between py-5">
        <div>
          <Link to="/" className="text-xs text-muted">
            ← Shop
          </Link>
          <h1 className="font-display text-3xl">Back office</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              window.open("https://mail.zoho.com", "_blank", "noopener,noreferrer")
            }
          >
            Check Email
          </Button>
          <UserButton />
        </div>
      </header>

      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs tracking-wide text-faint uppercase">This year</p>
        <p className="mt-1 font-display text-3xl tabular-nums">{cents(data.sales.ytd_cents)}</p>
        <p className="mt-1 text-sm text-muted">
          {data.sales.order_count} orders · month {cents(data.sales.mtd_cents)}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={async () => {
            const csv = await adminSalesCsv();
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "livewell42-sales.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download CSV
        </Button>
      </section>

      <ProductsBlock products={data.products} onSave={() => void refresh()} />
      <OrdersBlock
        orders={data.orders}
        archivedOrders={data.archivedOrders}
        items={data.items}
        onSave={() => void refresh()}
      />
      <BitcoinOrdersBlock
        orders={data.orders}
        unmatched={data.unmatchedBtc ?? []}
        testnet={Boolean(data.settings.btc_testnet)}
        onSave={() => void refresh()}
      />
      <SettingsBlock
        settings={data.settings}
        nexapayWebhookSecretConfigured={data.nexapayWebhookSecretConfigured}
        btcZpubConfigured={Boolean(data.btcZpubConfigured)}
        onSave={() => void refresh()}
      />
      <MailBlock mail={data.mail} />
    </div>
  );
}

function ProductsBlock({
  products,
  onSave,
}: {
  products: Product[];
  onSave: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  async function toggleListed(p: Product, active: boolean) {
    setTogglingId(p.id);
    try {
      await adminSaveProduct({
        data: {
          id: p.id,
          name: p.name,
          sizeLabel: p.sizeLabel,
          category: p.category === "bac_water" ? "bac_water" : "peptide",
          priceDollars: (p.priceCents / 100).toFixed(2),
          stock: p.stock,
          coaUrl: p.coaUrl,
          active,
        },
      });
      toast.success(active ? "Listed on shop" : "Hidden from shop");
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update listing.");
    } finally {
      setTogglingId(null);
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Products</h2>
      <p className="mt-1 text-sm text-muted">Add a row in under a minute. COA is a link — leave blank until you have one.</p>
      <ProductForm onSave={onSave} />
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {sortedProducts.map((p) => {
          const open = openId === p.id;
          const sizePart = p.sizeLabel.trim() ? ` ${p.sizeLabel.trim()}` : "";
          const banner = `${p.name}${sizePart} · ${cents(p.priceCents)} · ${p.stock} in stock`;
          return (
            <li key={p.id} className="py-2">
              <div className="flex items-center gap-2 py-2 text-sm">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : p.id)}
                >
                  <ChevronRight
                    className={`size-4 shrink-0 text-muted transition-transform duration-150 ${
                      open ? "rotate-90" : ""
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">{banner}</span>
                </button>
                <label
                  className="flex shrink-0 items-center gap-2 text-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={p.active}
                    disabled={togglingId === p.id}
                    onChange={(e) => void toggleListed(p, e.target.checked)}
                  />
                  Listed
                </label>
              </div>
              {open ? (
                <div className="pb-4 pl-6">
                  <ProductForm product={p} onSave={onSave} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProductForm({
  product,
  onSave,
}: {
  product?: Product;
  onSave: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sizeLabel, setSizeLabel] = useState(product?.sizeLabel ?? "");
  const [category, setCategory] = useState<"peptide" | "bac_water">(
    product?.category === "bac_water" ? "bac_water" : "peptide",
  );
  const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2) : "");
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [coaUrl, setCoaUrl] = useState(product?.coaUrl ?? "");
  const [active, setActive] = useState(product?.active ?? true);

  async function save() {
    try {
      await adminSaveProduct({
        data: {
          id: product?.id,
          name,
          sizeLabel,
          category,
          priceDollars: price,
          stock,
          coaUrl,
          active,
        },
      });
      toast.success("Saved");
      if (!product) {
        setName("");
        setSizeLabel("");
        setPrice("");
        setStock(0);
        setCoaUrl("");
      }
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-1">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label>Size</Label>
        <Input value={sizeLabel} onChange={(e) => setSizeLabel(e.target.value)} placeholder="5 mg" />
      </div>
      <div>
        <Label>Type</Label>
        <Select value={category} onChange={(e) => setCategory(e.target.value as "peptide" | "bac_water")}>
          <option value="peptide">Peptide</option>
          <option value="bac_water">Bac water</option>
        </Select>
      </div>
      <div>
        <Label>Price USD</Label>
        <Input value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div>
        <Label>Stock</Label>
        <Input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
        />
      </div>
      <div className="col-span-2 sm:col-span-3">
        <Label>COA link</Label>
        <Input
          value={coaUrl}
          onChange={(e) => setCoaUrl(e.target.value)}
          placeholder="https://…  (optional)"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Listed
      </label>
      <Button type="button" onClick={() => void save()}>
        {product ? "Update" : "Add product"}
      </Button>
    </div>
  );
}

function OrdersBlock({
  orders,
  archivedOrders,
  items,
  onSave,
}: {
  orders: Awaited<ReturnType<typeof adminGet>>["orders"];
  archivedOrders: Awaited<ReturnType<typeof adminGet>>["archivedOrders"];
  items: Awaited<ReturnType<typeof adminGet>>["items"];
  onSave: () => void;
}) {
  const [view, setView] = useState<"live" | "archive">("live");
  const list = view === "live" ? orders : archivedOrders;
  const archived = view === "archive";

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{archived ? "Archive" : "Orders"}</h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={view === "live" ? "primary" : "outline"}
            onClick={() => setView("live")}
          >
            Orders
          </Button>
          <Button
            type="button"
            variant={view === "archive" ? "primary" : "outline"}
            onClick={() => setView("archive")}
          >
            Archive
          </Button>
        </div>
      </div>
      <ul className="mt-3 space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted">{archived ? "No archived orders." : "None yet."}</p>
        ) : null}
        {list.map((o) => {
          const lines = items.filter((i) => i.order_id === o.id);
          return (
            <li key={o.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="font-medium">
                {o.order_number} · {cents(o.total_cents)} · {o.payment_rail}
              </p>
              <p className="mt-1 text-muted">
                {o.ship_name}, {o.ship_street}, {o.ship_city}, {o.ship_state} {o.ship_zip}
              </p>
              <p className="mt-1 text-muted">
                {lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}
              </p>
              <OrderStatus order={o} archived={archived} onSave={onSave} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OrderStatus({
  order,
  archived,
  onSave,
}: {
  order: Awaited<ReturnType<typeof adminGet>>["orders"][number];
  archived: boolean;
  onSave: () => void;
}) {
  const isPending = order.status === "pending";
  const [status, setStatus] = useState(
    (isPending ? "paid" : order.status) as "paid" | "packed" | "shipped" | "reshipped",
  );
  const [tracking, setTracking] = useState(order.tracking);
  const [confirm, setConfirm] = useState<"delete" | "restore" | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    await adminUpdateOrder({ data: { id: order.id, status, tracking } });
    toast.success("Order updated");
    onSave();
  }

  async function runSoftDelete() {
    setBusy(true);
    try {
      await adminSoftDeleteOrder({ data: { id: order.id } });
      toast.success("Order moved to Archive");
      setConfirm(null);
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order.");
    } finally {
      setBusy(false);
    }
  }

  async function runRestore() {
    setBusy(true);
    try {
      await adminRestoreOrder({ data: { id: order.id } });
      toast.success("Order restored");
      setConfirm(null);
      onSave();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {isPending && !archived ? (
        <p className="rounded-md border border-border bg-raised px-3 py-2 text-xs text-muted">
          Status: <span className="font-medium text-fg">Pending</span>{" "}({order.payment_rail === "btc" ? `Bitcoin · ${order.btc_status || "waiting"}` : "awaiting NexaPay card payment"})
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="paid">Paid</option>
          <option value="packed">Packed</option>
          <option value="shipped">Shipped</option>
          <option value="reshipped">Reshipped</option>
        </Select>
        <Input
          placeholder="Tracking"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
        />
        <Button type="button" variant="outline" onClick={() => void save()}>
          Save
        </Button>
        {archived ? (
          <Button type="button" variant="outline" onClick={() => setConfirm("restore")}>
            Restore
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => setConfirm("delete")}>
            Delete
          </Button>
        )}
      </div>
      {confirm === "delete" ? (
        <div className="rounded-md border border-border bg-raised px-3 py-3 text-sm">
          <p>Are you sure you want to delete this order?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={busy} onClick={() => void runSoftDelete()}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ) : null}
      {confirm === "restore" ? (
        <div className="rounded-md border border-border bg-raised px-3 py-3 text-sm">
          <p>Are you sure you want to restore this order?</p>
          <div className="mt-2 flex gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void runRestore()}>
              {busy ? "Restoring…" : "Restore"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


function BitcoinOrdersBlock({
  orders,
  unmatched,
  testnet,
  onSave,
}: {
  orders: Awaited<ReturnType<typeof adminGet>>["orders"];
  unmatched: NonNullable<Awaited<ReturnType<typeof adminGet>>["unmatchedBtc"]>;
  testnet: boolean;
  onSave: () => void;
}) {
  const open = orders.filter(
    (o) =>
      o.payment_rail === "btc" &&
      o.status === "pending" &&
      ["waiting", "seen", "underpaid", "expired"].includes(String(o.btc_status ?? "")),
  );
  const explorer = (txid: string) =>
    testnet
      ? `https://mempool.space/testnet/tx/${txid}`
      : `https://mempool.space/tx/${txid}`;

  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Bitcoin</h2>
      <p className="mt-1 text-sm text-muted">
        Open quotes, underpayments, and unmatched deposits.
      </p>
      <ul className="mt-3 space-y-3">
        {open.length === 0 ? (
          <p className="text-sm text-muted">No open Bitcoin orders.</p>
        ) : null}
        {open.map((o) => (
          <li key={o.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">
              {o.order_number} · {cents(o.total_cents)} · {o.btc_status}
            </p>
            <p className="mt-1 break-all text-xs text-muted">
              {o.btc_amount} BTC → {o.btc_address}
            </p>
            {o.btc_txid ? (
              <a
                className="mt-1 inline-block break-all text-xs text-accent hover:underline"
                href={explorer(o.btc_txid)}
                target="_blank"
                rel="noreferrer"
              >
                {o.btc_txid}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void adminMarkBtcPaid({ data: { orderId: o.id } })
                    .then(() => {
                      toast.success("Marked paid");
                      onSave();
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Failed"),
                    );
                }}
              >
                Mark paid
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void adminCancelBtcQuote({ data: { orderId: o.id } })
                    .then(() => {
                      toast.success("Quote cancelled");
                      onSave();
                    })
                    .catch((err) =>
                      toast.error(err instanceof Error ? err.message : "Failed"),
                    );
                }}
              >
                Cancel quote
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <h3 className="mt-8 font-display text-xl">Unmatched payments</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {unmatched.length === 0 ? (
          <p className="text-muted">None.</p>
        ) : (
          unmatched.map((u) => (
            <li key={u.id} className="rounded-md border border-border p-3">
              <p className="break-all text-xs">
                {u.amount} BTC · {u.address}
              </p>
              <a
                className="break-all text-xs text-accent hover:underline"
                href={explorer(u.txid)}
                target="_blank"
                rel="noreferrer"
              >
                {u.txid}
              </a>
              {!u.noted ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    void adminNoteUnmatched({ data: { id: u.id } })
                      .then(() => {
                        toast.success("Noted");
                        onSave();
                      })
                      .catch((err) =>
                        toast.error(
                          err instanceof Error ? err.message : "Failed",
                        ),
                      );
                  }}
                >
                  Mark noted
                </Button>
              ) : (
                <p className="mt-1 text-xs text-faint">Noted</p>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function SettingsBlock({
  settings,
  nexapayWebhookSecretConfigured,
  btcZpubConfigured,
  onSave,
}: {
  settings: Awaited<ReturnType<typeof adminGet>>["settings"];
  nexapayWebhookSecretConfigured: boolean;
  btcZpubConfigured: boolean;
  onSave: () => void;
}) {
  const [storeName, setStoreName] = useState(settings.store_name);
  const [supportEmail, setSupportEmail] = useState(settings.support_email);
  const [ownerEmail, setOwnerEmail] = useState(settings.owner_email);
  const [ship, setShip] = useState((settings.shipping_cents / 100).toFixed(2));
  const [freeAt, setFreeAt] = useState((settings.free_shipping_at_cents / 100).toFixed(2));
  const [nexapay, setNexapay] = useState(settings.nexapay_api_key);
  const [nexapayWebhookSecret, setNexapayWebhookSecret] = useState("");
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(
    nexapayWebhookSecretConfigured,
  );
  useEffect(() => {
    setWebhookSecretConfigured(nexapayWebhookSecretConfigured);
  }, [nexapayWebhookSecretConfigured]);
  const [usdc, setUsdc] = useState(settings.usdc_wallet);
  const [btc, setBtc] = useState(settings.btc_wallet);
  const [btcEnabled, setBtcEnabled] = useState(Boolean(settings.btc_enabled));
  const [btcZpub, setBtcZpub] = useState("");
  const [zpubConfigured, setZpubConfigured] = useState(btcZpubConfigured);
  useEffect(() => {
    setZpubConfigured(btcZpubConfigured);
  }, [btcZpubConfigured]);
  const [btcMin, setBtcMin] = useState(
    ((settings.btc_min_cents ?? 2500) / 100).toFixed(2),
  );
  const [btcTestnet, setBtcTestnet] = useState(Boolean(settings.btc_testnet));
  const [testBitcoinPayments, setTestBitcoinPayments] = useState(
    Boolean(settings.test_bitcoin_payments),
  );
  const [nexapayEnabled, setNexapayEnabled] = useState(
    settings.nexapay_enabled !== false,
  );
  const [bannerEnabled, setBannerEnabled] = useState(Boolean(settings.banner_enabled));
  const [bannerText, setBannerText] = useState(settings.banner_text ?? "");

  return (
    <section className="mt-10 space-y-3">
      <h2 className="font-display text-2xl">Settings</h2>
      <div>
        <Label>Store name</Label>
        <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={bannerEnabled}
          onChange={(e) => setBannerEnabled(e.target.checked)}
        />
        Show banner
      </label>
      <div>
        <Label>Announcement</Label>
        <Input
          value={bannerText}
          maxLength={280}
          onChange={(e) => setBannerText(e.target.value)}
          placeholder="Shown at the top of the shop when enabled"
        />
      </div>
      <div>
        <Label>Support email (shown to members)</Label>
        <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
      </div>
      <div>
        <Label>Owner notify email (order pings)</Label>
        <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Shipping under threshold</Label>
          <Input value={ship} onChange={(e) => setShip(e.target.value)} />
        </div>
        <div>
          <Label>Free shipping at</Label>
          <Input value={freeAt} onChange={(e) => setFreeAt(e.target.value)} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-1"
          checked={nexapayEnabled}
          onChange={(e) => setNexapayEnabled(e.target.checked)}
        />
        <span>
          Accept card payments (NexaPay)
          <span className="mt-0.5 block text-xs text-faint">
            On by default. Turn off to hide Card checkout without clearing the API key.
          </span>
        </span>
      </label>
      <div>
        <Label>NexaPay API key</Label>
        <Input value={nexapay} onChange={(e) => setNexapay(e.target.value)} />
      </div>
      <div>
        <Label>NexaPay webhook secret</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={nexapayWebhookSecret}
          onChange={(e) => setNexapayWebhookSecret(e.target.value)}
          placeholder={webhookSecretConfigured ? "•••••••• (saved — leave blank to keep)" : "Paste webhook secret"}
        />
      </div>
      <p className="text-sm text-muted">
        Webhook secret:{" "}
        {webhookSecretConfigured ? "configured" : "missing"}
      </p>
      <div>
        <Label>USDC settle wallet (NexaPay payout)</Label>
        <Input value={usdc} onChange={(e) => setUsdc(e.target.value)} />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-1"
          checked={btcEnabled}
          onChange={(e) => setBtcEnabled(e.target.checked)}
        />
        <span>
          Show Bitcoin payments
          <span className="mt-0.5 block text-xs text-faint">
            Product orders only. Off by default. Card / NexaPay stays primary. Requires a zpub below.
          </span>
        </span>
      </label>
      <div>
        <Label>Account zpub (BIP84)</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={btcZpub}
          onChange={(e) => setBtcZpub(e.target.value)}
          placeholder={
            zpubConfigured
              ? "•••••••• (saved — leave blank to keep)"
              : "Paste zpub (mainnet) or vpub (testnet)"
          }
        />
      </div>
      <p className="text-sm text-muted">
        zpub: {zpubConfigured ? "configured" : "missing"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Bitcoin minimum (USD)</Label>
          <Input value={btcMin} onChange={(e) => setBtcMin(e.target.value)} />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={btcTestnet}
            onChange={(e) => setBtcTestnet(e.target.checked)}
          />
          Testnet
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          className="mt-1"
          checked={testBitcoinPayments}
          onChange={(e) => setTestBitcoinPayments(e.target.checked)}
        />
        <span>
          Test Bitcoin payments
          <span className="mt-0.5 block text-xs text-faint">
            Off by default. When on: ignore the USD minimum and force $0 shipping on the shop
            cart (mainnet or testnet). Independent of the Testnet checkbox.
          </span>
        </span>
      </label>
      <div>
        <Label>Legacy BTC note address (optional display)</Label>
        <Input value={btc} onChange={(e) => setBtc(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={async () => {
            try {
              const res = await adminSaveSettings({
                data: {
                  storeName,
                  supportEmail,
                  ownerEmail,
                  shippingDollars: ship,
                  freeAtDollars: freeAt,
                  nexapayApiKey: nexapay,
                  nexapayWebhookSecret,
                  usdcWallet: usdc,
                  btcWallet: btc,
                  bannerEnabled,
                  bannerText,
                  btcEnabled,
                  nexapayEnabled,
                  btcZpub,
                  btcMinDollars: btcMin,
                  btcTestnet,
                  testBitcoinPayments,
                },
              });
              setNexapayWebhookSecret("");
              setBtcZpub("");
              setWebhookSecretConfigured(Boolean(res.nexapayWebhookSecretConfigured));
              setZpubConfigured(Boolean(res.btcZpubConfigured));
              toast.success("Settings saved");
              onSave();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not save settings.");
            }
          }}
        >
          Save settings
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void repairOwnerAdmin()
              .then(() => {
                toast.success("Operator access confirmed for this account");
                onSave();
              })
              .catch((err) => {
                toast.error(err instanceof Error ? err.message : "Could not repair access.");
              });
          }}
        >
          Repair operator access
        </Button>
      </div>
    </section>
  );
}

function MailBlock({ mail }: { mail: Awaited<ReturnType<typeof adminGet>>["mail"] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Outgoing mail</h2>
      <p className="text-sm text-muted">Queued copies until SMTP is connected. Orders still save if email fails.</p>
      <ul className="mt-3 space-y-2 text-sm">
        {mail.map((m) => (
          <li key={m.id} className="rounded-md border border-border p-3">
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
