import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import {
  adminGet,
  adminSaveProduct,
  adminSaveSettings,
  adminSalesCsv,
  adminUpdateOrder,
  repairOwnerAdmin,
  type Product,
} from "@/lib/store";
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
        items={data.items}
        onSave={() => void refresh()}
      />
      <SettingsBlock settings={data.settings} nexapayWebhookSecretConfigured={data.nexapayWebhookSecretConfigured} onSave={() => void refresh()} />
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
  items,
  onSave,
}: {
  orders: Awaited<ReturnType<typeof adminGet>>["orders"];
  items: Awaited<ReturnType<typeof adminGet>>["items"];
  onSave: () => void;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Orders</h2>
      <ul className="mt-3 space-y-3">
        {orders.length === 0 ? <p className="text-sm text-muted">None yet.</p> : null}
        {orders.map((o) => {
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
              <OrderStatus order={o} onSave={onSave} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OrderStatus({
  order,
  onSave,
}: {
  order: Awaited<ReturnType<typeof adminGet>>["orders"][number];
  onSave: () => void;
}) {
  const isPending = order.status === "pending";
  const [status, setStatus] = useState(
    (isPending ? "paid" : order.status) as "paid" | "packed" | "shipped" | "reshipped",
  );
  const [tracking, setTracking] = useState(order.tracking);

  if (isPending) {
    return (
      <div className="mt-3 space-y-2">
        <p className="rounded-md border border-border bg-raised px-3 py-2 text-xs text-muted">
          Status: <span className="font-medium text-fg">Pending</span> (awaiting NexaPay card payment)
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
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
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await adminUpdateOrder({ data: { id: order.id, status, tracking } });
              toast.success("Order updated");
              onSave();
            }}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await adminUpdateOrder({ data: { id: order.id, status, tracking } });
          toast.success("Order updated");
          onSave();
        }}
      >
        Save
      </Button>
    </div>
  );
}

function SettingsBlock({
  settings,
  nexapayWebhookSecretConfigured,
  onSave,
}: {
  settings: Awaited<ReturnType<typeof adminGet>>["settings"];
  nexapayWebhookSecretConfigured: boolean;
  onSave: () => void;
}) {
  const [storeName, setStoreName] = useState(settings.store_name);
  const [supportEmail, setSupportEmail] = useState(settings.support_email);
  const [ownerEmail, setOwnerEmail] = useState(settings.owner_email);
  const [ship, setShip] = useState((settings.shipping_cents / 100).toFixed(2));
  const [freeAt, setFreeAt] = useState((settings.free_shipping_at_cents / 100).toFixed(2));
  const [nexapay, setNexapay] = useState(settings.nexapay_api_key);
  const [usdc, setUsdc] = useState(settings.usdc_wallet);
  const [btc, setBtc] = useState(settings.btc_wallet);
  const [btcEnabled, setBtcEnabled] = useState(Boolean(settings.btc_enabled));
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
      <div>
        <Label>NexaPay API key</Label>
        <Input value={nexapay} onChange={(e) => setNexapay(e.target.value)} />
      </div>
      <p className="text-sm text-muted">
        Webhook secret:{" "}
        {nexapayWebhookSecretConfigured ? "configured" : "missing"}
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
            Off by default. Turn on only if NexaPay is down. Card stays the primary rail.
          </span>
        </span>
      </label>
      <div>
        <Label>BTC receive address</Label>
        <Input value={btc} onChange={(e) => setBtc(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={async () => {
            await adminSaveSettings({
              data: {
                storeName,
                supportEmail,
                ownerEmail,
                shippingDollars: ship,
                freeAtDollars: freeAt,
                nexapayApiKey: nexapay,
                usdcWallet: usdc,
                btcWallet: btc,
                bannerEnabled,
                bannerText,
                btcEnabled,
              },
            });
            toast.success("Settings saved");
            onSave();
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
