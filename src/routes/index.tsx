import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  acceptLegal,
  getBootstrap,
  payMembership,
  placeOrder,
  type Me,
  type Product,
  type PublicSettings,
} from "@/lib/store";
import { cents, shippingCents } from "@/lib/money";
import { LOWER_48 } from "@/lib/us-states";
import { Button } from "@/components/ui/button";
import { CheckRow, Input, Label, Select } from "@/components/ui/field";
import { Minus, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Home });

type Rail = "card" | "usdt_tron" | "btc" | "usdc";

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="min-h-dvh bg-bg" />;
  }
  if (!user) return <Gate />;
  return <MemberApp />;
}

function Gate() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <p className="font-display text-sm tracking-[0.28em] text-muted uppercase">Livewell42</p>
      <h1 className="mt-4 font-display text-5xl leading-none tracking-tight">Members</h1>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
        Access is by referral. Membership is $5, once. That amount is credited on your first order.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          to="/login"
          className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-sm font-medium text-fg"
        >
          Request membership
        </Link>
      </div>
    </main>
  );
}

function MemberApp() {
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const data = await getBootstrap();
    setMe(data.me);
    setSettings(data.settings);
    setProducts(data.products);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, []);

  if (loading || !me || !settings) {
    return <div className="min-h-dvh bg-bg" />;
  }

  const inShop =
    Boolean(me.legalAcceptedAt) && (me.member || me.isAdmin);
  const showBanner =
    inShop && settings.bannerEnabled && settings.bannerText.trim().length > 0;

  return (
    <div className="min-h-dvh pb-40">
      {showBanner ? (
        <div className="border-b border-border bg-raised px-5 py-3 text-center text-sm leading-relaxed text-fg">
          <p className="mx-auto max-w-3xl">{settings.bannerText.trim()}</p>
        </div>
      ) : null}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <div>
          <p className="font-display text-xl tracking-tight">{settings.storeName}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {me.isAdmin && me.legalAcceptedAt ? (
            <Link to="/admin" className="text-muted hover:text-fg">
              Admin
            </Link>
          ) : null}
          <UserButton />
        </div>
      </header>
      {!me.legalAcceptedAt ? (
        <LegalGate onAccepted={() => void refresh()} />
      ) : me.member || me.isAdmin ? (
        <Shop me={me} settings={settings} products={products} onPaid={() => void refresh()} />
      ) : (
        <Paywall settings={settings} onPaid={() => void refresh()} />
      )}
    </div>
  );
}

function LegalGate({ onAccepted }: { onAccepted: () => void }) {
  const [over21, setOver21] = useState(false);
  const [research, setResearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const legalOk = over21 && research;

  async function confirm() {
    if (!legalOk) {
      toast.error("Confirm both statements to continue.");
      return;
    }
    setBusy(true);
    try {
      await acceptLegal();
      onAccepted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save confirmation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-8">
      <h2 className="font-display text-3xl">Confirm to continue</h2>
      <p className="mt-2 text-sm text-muted">Both statements are required. Same two boxes as on the sign-in page.</p>
      <div className="mt-6 space-y-1 rounded-lg border border-border bg-surface px-3 py-2">
        <CheckRow checked={over21} onChange={setOver21}>
          I confirm that I am 21 years of age or older.
        </CheckRow>
        <CheckRow checked={research} onChange={setResearch}>
          I understand that all products are for laboratory research use only and are not for
          human consumption.
        </CheckRow>
      </div>
      <Button className="mt-6 w-full" disabled={busy || !legalOk} onClick={() => void confirm()}>
        {busy ? "Saving…" : "Continue"}
      </Button>
    </section>
  );
}

function Paywall({
  settings,
  onPaid,
}: {
  settings: PublicSettings;
  onPaid: () => void;
}) {
  const [rail, setRail] = useState<Rail>("card");
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      await payMembership({ data: { rail } });
      toast.success("$5 membership paid. $5 credit waits on your first order.");
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-5 py-8">
      <h2 className="font-display text-3xl">Complete membership</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        One-time $5. Credited in full on your first order so it breaks even when you buy.
        Card payments settle to us in USDC via NexaPay. Crypto is USDT on Tron, BTC, or USDC.
      </p>
      <RailPicker value={rail} onChange={setRail} settings={settings} amountLabel="$5.00" />
      <Button className="mt-6 w-full" disabled={busy} onClick={() => void pay()}>
        {busy ? "Confirming…" : "Pay $5 membership"}
      </Button>
    </section>
  );
}

function Shop({
  me,
  settings,
  products,
  onPaid,
}: {
  me: Me;
  settings: PublicSettings;
  products: Product[];
  onPaid: () => void;
}) {
  const [qty, setQty] = useState<Record<number, number>>({});
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("TX");
  const [zip, setZip] = useState("");
  const [rail, setRail] = useState<Rail>("card");
  const [busy, setBusy] = useState(false);

  const lines = products
    .map((p) => ({ product: p, qty: qty[p.id] ?? 0 }))
    .filter((l) => l.qty > 0);

  const merchandise = lines.reduce((s, l) => s + l.product.priceCents * l.qty, 0);
  const credit = Math.min(me.creditCents, merchandise);
  const ship = shippingCents(merchandise, settings.freeShippingAtCents, settings.shippingCents);
  const due = merchandise - credit + ship;

  function setQ(id: number, next: number, stock: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(stock, next)) }));
  }

  async function checkout() {
    if (!lines.length) {
      toast.error("Add a quantity first.");
      return;
    }
    setBusy(true);
    try {
      const res = await placeOrder({
        data: {
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          shipName: name,
          shipStreet: street,
          shipCity: city,
          shipState: state,
          shipZip: zip,
          rail,
        },
      });
      toast.success(`Order ${res.orderNumber} paid · ${cents(res.totalCents)}`);
      setQty({});
      onPaid();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place the order.");
    } finally {
      setBusy(false);
    }
  }

  const peptides = products.filter((p) => p.category === "peptide");
  const water = products.filter((p) => p.category !== "peptide");

  return (
    <main className="mx-auto max-w-3xl px-5">
      <p className="text-xs leading-relaxed text-faint">
        For laboratory research use only. Not for human consumption. Lower 48 shipping only. Lost
        packages: one reship. Broken vial: one reship with a photo to {settings.supportEmail || "support"}.
      </p>

      <ProductGroup title="List" products={peptides} qty={qty} setQ={setQ} />
      <ProductGroup title="Water" products={water} qty={qty} setQ={setQ} />

      <section className="mt-10 space-y-3 border-t border-border pt-8">
        <h3 className="font-display text-2xl">Ship to</h3>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>Street</Label>
          <Input value={street} onChange={(e) => setStreet(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div>
            <Label>State</Label>
            <Select value={state} onChange={(e) => setState(e.target.value)}>
              {LOWER_48.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="max-w-40">
          <Label>ZIP</Label>
          <Input value={zip} onChange={(e) => setZip(e.target.value)} required />
        </div>
        <RailPicker value={rail} onChange={setRail} settings={settings} amountLabel={cents(due)} />
      </section>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 p-3">
        <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-3 text-sm">
            <div className="space-y-0.5">
              <Row label="Merchandise" value={cents(merchandise)} />
              {credit > 0 ? <Row label="First-order credit" value={`−${cents(credit)}`} /> : null}
              <Row
                label={ship === 0 && merchandise >= settings.freeShippingAtCents ? "Shipping (free over $250)" : "Shipping"}
                value={merchandise === 0 ? "—" : ship === 0 ? "Free" : cents(ship)}
              />
              <p className="pt-1 font-medium text-fg">
                Due {cents(due)}
              </p>
            </div>
            <Button disabled={busy || merchandise === 0} onClick={() => void checkout()}>
              {busy ? "Placing…" : "Pay now"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex gap-3 text-muted">
      <span>{label}</span>
      <span className="text-fg">{value}</span>
    </p>
  );
}

function ProductGroup({
  title,
  products,
  qty,
  setQ,
}: {
  title: string;
  products: Product[];
  qty: Record<number, number>;
  setQ: (id: number, next: number, stock: number) => void;
}) {
  if (!products.length) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{title}</h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {products.map((p) => {
          const sold = p.stock <= 0;
          const q = qty[p.id] ?? 0;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 py-4 ${sold ? "opacity-40" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.name}{" "}
                  <span className="font-normal text-muted">{p.sizeLabel}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                  <span>{cents(p.priceCents)}</span>
                  {sold ? <span>Sold out</span> : <span>{p.stock} in stock</span>}
                  {p.coaUrl ? (
                    <a
                      href={p.coaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:underline"
                    >
                      <FileText className="size-3.5" />
                      COA
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-faint">
                      <FileText className="size-3.5" />
                      COA
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={sold}
                  className="grid size-11 place-items-center rounded-md border border-border"
                  onClick={() => setQ(p.id, q - 1, p.stock)}
                  aria-label="Decrease"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center tabular-nums">{q}</span>
                <button
                  type="button"
                  disabled={sold}
                  className="grid size-11 place-items-center rounded-md border border-border"
                  onClick={() => setQ(p.id, q + 1, p.stock)}
                  aria-label="Increase"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RailPicker({
  value,
  onChange,
  settings,
  amountLabel,
}: {
  value: Rail;
  onChange: (r: Rail) => void;
  settings: PublicSettings;
  amountLabel: string;
}) {
  const rails: { id: Rail; label: string; hint: string }[] = [
    {
      id: "card",
      label: "Card (NexaPay)",
      hint: "Visa, Mastercard, Apple Pay, Google Pay · we receive USDC",
    },
    { id: "usdt_tron", label: "USDT · Tron", hint: settings.usdtTronWallet || "Address set in admin" },
    { id: "btc", label: "Bitcoin", hint: settings.btcWallet || "Address set in admin" },
    { id: "usdc", label: "USDC", hint: settings.usdcPayWallet || settings.usdcWallet || "Address set in admin" },
  ];
  const selected = rails.find((r) => r.id === value)!;
  const addr =
    value === "usdt_tron"
      ? settings.usdtTronWallet
      : value === "btc"
        ? settings.btcWallet
        : value === "usdc"
          ? settings.usdcPayWallet || settings.usdcWallet
          : "";

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-muted">Pay {amountLabel}</p>
      <div className="grid grid-cols-2 gap-2">
        {rails.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded-md border px-3 py-3 text-left text-sm ${
              value === r.id ? "border-accent bg-raised text-fg" : "border-border text-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-faint">
        {value === "card"
          ? "NexaPay checkout. In this preview, confirm to record a paid membership or order. Paste live API keys in admin before going live."
          : addr
            ? `Send exactly ${amountLabel} on the correct network to ${addr}`
            : `${selected.hint}. Confirm after sending — admin can mark paid if chain watch is not connected.`}
      </p>
    </div>
  );
}
