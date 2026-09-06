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

type Rail = "card" | "btc";

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
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    const data = await getBootstrap();
    setMe(data.me);
    setSettings(data.settings);
    setProducts(data.products);
    setLoadError(null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setLoading(false);
      setLoadError(err instanceof Error ? err.message : "Could not load the shop.");
    });
  }, []);

  if (loading) {
    return <div className="min-h-dvh bg-bg" />;
  }

  if (loadError || !me || !settings) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
        <p className="text-sm leading-relaxed text-muted">
          {loadError || "Could not load the shop."}
        </p>
        <Link
          to="/login"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-medium text-accent-fg"
        >
          Sign in
        </Link>
      </main>
    );
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
      const res = await payMembership({ data: { rail } });
      if (res && "checkoutUrl" in res && res.checkoutUrl) {
        try {
          const id = "nexapayOrderId" in res ? String(res.nexapayOrderId ?? "") : "";
          if (id) sessionStorage.setItem("lw42_np", id);
        } catch { /* ignore */ }
        window.location.href = res.checkoutUrl;
        return;
      }
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
        Card payments settle to us in USDC via NexaPay. Crypto is Bitcoin only.
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
      if (res && "checkoutUrl" in res && res.checkoutUrl) {
        try {
          const id = "nexapayOrderId" in res ? String(res.nexapayOrderId ?? "") : "";
          if (id) sessionStorage.setItem("lw42_np", id);
        } catch { /* ignore */ }
        window.location.href = res.checkoutUrl;
        return;
      }
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
                  {sold ? (
                    <span>Sold out</span>
                  ) : p.stock < 5 ? (
                    <span className="text-yellow-400">{p.stock} in stock</span>
                  ) : null}
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

function CardRailMarks() {
  const mark = "h-5 w-auto shrink-0 opacity-70";
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5" aria-hidden>
      {/* Visa */}
      <svg className={mark} viewBox="0 0 48 16" height={20} role="img">
        <title>Visa</title>
        <path
          fill="currentColor"
          d="M20.4 1.6h-3.7l-4.1 12.8h3.5l.6-1.8h4.1l.4 1.8h3.1L20.4 1.6zm-2.6 8.3 1.4-4.1.8 4.1h-2.2zM28.6 5.3c-.7-.3-1.8-.6-3.2-.6-3.5 0-6 1.9-6 4.5 0 2 1.8 3.1 3.1 3.7 1.4.7 1.9 1.1 1.9 1.7 0 .9-1.1 1.3-2.1 1.3-1.4 0-2.2-.2-3.3-.7l-.5-.2-.5 3c.8.4 2.4.7 4 .7 3.8 0 6.2-1.8 6.2-4.7 0-1.6-.9-2.7-3-3.8-1.2-.7-2-1.1-2-1.8 0-.6.7-1.2 2.1-1.2 1.2 0 2.1.3 2.8.5l.3.2.5-2.8zM36.9 1.6h-2.7c-.8 0-1.5.3-1.8 1.1l-6.6 11.7h3.7l.9-2.6h4.5c.1.5.4 2.6.4 2.6h3.3L36.9 1.6zm-5.4 8.5 1.9-5.1.1-.2 1 5.3h-3zM13.3 1.6 9.8 10.7l-.4-1.9C8.8 6.3 6.6 3.8 4.1 2.5l3.2 11.9h3.7L16.9 1.6h-3.6zM6.5 1.6H.9L.8 1.9c4.4 1.1 7.3 3.8 8.5 7L7.8 2.7c-.2-.8-.8-1.1-1.3-1.1z"
        />
      </svg>
      {/* Mastercard */}
      <svg className={mark} viewBox="0 0 38 24" height={20} role="img">
        <title>Mastercard</title>
        <circle cx="14" cy="12" r="9" fill="currentColor" opacity="0.55" />
        <circle cx="24" cy="12" r="9" fill="currentColor" opacity="0.85" />
      </svg>
      {/* Apple Pay */}
      <svg className={mark} viewBox="0 0 50 20" height={20} role="img">
        <title>Apple Pay</title>
        <path
          fill="currentColor"
          d="M9.5 3.2c-.6.7-1.5 1.2-2.4 1.1-.1-1 .4-2 1-2.6.6-.7 1.6-1.2 2.4-1.2.1 1-.3 2-1 2.7zm1 1.6c-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.7-1.5.1-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.2-.1 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6 0 0-2.5-1-2.5-3.8 0-2.4 1.9-3.5 2-3.6-1.1-1.6-2.8-1.8-3.6-1.8zM19.2 4.1v12.6h1.9v-4.3h2.6c2.4 0 4.1-1.6 4.1-4.1S26.1 4 23.7 4h-4.5zm1.9 1.5h2.3c1.5 0 2.4.8 2.4 2.2s-.9 2.2-2.4 2.2h-2.3V5.6zm9.8-.1c-1.7 0-3 1-3.4 2.4h1.8c.3-.7 1-1.1 1.7-1.1 1.2 0 1.9.8 1.9 2.1v.5h-2c-2.4 0-3.7 1.1-3.7 2.9 0 1.7 1.2 2.9 3 2.9 1.3 0 2.3-.6 2.8-1.5h0v1.3h1.8V8.9c0-2.6-1.5-4.3-3.9-4.3zm.1 7.1c-1 0-1.6-.5-1.6-1.4 0-.9.7-1.5 2-1.5h1.9v.4c0 1.5-1 2.5-2.3 2.5zm7.1-7.1c-1.4 0-2.4.7-2.9 1.4h0V4.3h-1.8v12.4h1.8v-5.4c0-1.6 1-2.6 2.3-2.6.3 0 .6 0 .8.1V5.7c-.2-.1-.5-.1-.8-.1zm5.5 0c-2.5 0-4.4 1.9-4.4 4.5s1.9 4.5 4.5 4.5c1.5 0 2.7-.5 3.6-1.5l-1.2-1.1c-.6.6-1.4 1-2.4 1-1.5 0-2.6-1-2.8-2.4h7.2v-.5c0-2.6-1.7-4.5-4.5-4.5zm0 1.5c1.3 0 2.3.9 2.5 2.2h-5.1c.3-1.3 1.3-2.2 2.6-2.2z"
        />
      </svg>
      {/* Google Pay */}
      <svg className={mark} viewBox="0 0 56 24" height={20} role="img">
        <title>Google Pay</title>
        <path
          fill="currentColor"
          d="M25.2 10.6v6.9h-1.7v-6.6c0-1.6-.7-2.4-2-2.4-1.2 0-2.1.8-2.3 2v7h-1.7V7.2h1.6v1.3c.5-1 1.6-1.6 2.9-1.6 1.9 0 3.2 1.2 3.2 3.7zm7.4 4.9c0 1.6-1.3 2.4-2.8 2.4-1.4 0-2.4-.6-3-1.7l1.4-.9c.3.7.9 1.1 1.6 1.1.7 0 1.2-.3 1.2-.9 0-.5-.4-.8-1.4-1.1l-.9-.3c-1.5-.5-2.2-1.3-2.2-2.6 0-1.5 1.2-2.5 2.8-2.5 1.2 0 2.1.5 2.7 1.4l-1.4.9c-.3-.6-.8-.9-1.4-.9-.6 0-1 .3-1 .8 0 .5.4.8 1.3 1.1l.9.3c1.7.5 2.4 1.3 2.4 2.7zm7.5-8.3v2.1h2v1.4h-2v5.1c0 .7.3 1 .9 1h1.1v1.4h-1.3c-1.7 0-2.5-.9-2.5-2.4v-5.1h-1.5V9.3h1.5V6.2h1.8zm6.9 3.1c2.2 0 3.9 1.7 3.9 4.1s-1.7 4.1-3.9 4.1c-.9 0-1.7-.3-2.3-.8v3.6h-1.7V9.3h1.6v.8c.6-.6 1.5-1 2.4-1zm-.2 1.5c-1.3 0-2.2 1-2.2 2.5s.9 2.5 2.2 2.5 2.2-1 2.2-2.5-.9-2.5-2.2-2.5zM12.6 7.4l-1.3 4.7h2.7l-1.4-4.7zm4.2 10.1h1.8L15.3 7.2h-2.2l-3.3 10.3h1.9l.7-2.1h3.7l.7 2.1zM8.1 7.4C6.5 6.5 5.4 5.7 5.4 4.5 5.4 3.5 6.2 2.8 7.4 2.8c1.1 0 1.9.5 2.5 1.2l1.3-1.3C10.1 1.5 8.9.9 7.4.9 5.1.9 3.5 2.4 3.5 4.5c0 2.1 1.5 3.3 3.5 4.4 1.7.9 2.4 1.5 2.4 2.5 0 1-.8 1.7-2 1.7-1.2 0-2.2-.6-2.9-1.4L3.1 13c1 .1 2.2 1.7 4.1 1.7 2.4 0 4-1.5 4-3.7 0-1.9-1.1-3-3.1-4.1z"
        />
      </svg>
    </div>
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
  const btcOn = Boolean(settings.btcEnabled);

  useEffect(() => {
    if (!btcOn && value === "btc") onChange("card");
  }, [btcOn, value, onChange]);

  const rails: { id: Rail; label: string; hint: string }[] = [
    {
      id: "card",
      label: "Card (NexaPay)",
      hint: "Visa, Mastercard, Apple Pay, Google Pay",
    },
  ];
  if (btcOn) {
    rails.push({ id: "btc", label: "Bitcoin", hint: settings.btcWallet || "Address set in admin" });
  }

  const effective: Rail = !btcOn ? "card" : value;
  const selected = rails.find((r) => r.id === effective) ?? rails[0];
  const addr = effective === "btc" ? settings.btcWallet : "";

  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs text-muted">Pay {amountLabel}</p>
      <div className={`grid gap-2 ${rails.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {rails.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded-md border px-3 py-3 text-left text-sm ${
              effective === r.id ? "border-accent bg-raised text-fg" : "border-border text-muted"
            }`}
          >
            <span className="block">{r.label}</span>
            {r.id === "card" ? <CardRailMarks /> : null}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-faint">
        {effective === "card"
          ? selected.hint
          : addr
            ? `Send exactly ${amountLabel} on the correct network to ${addr}`
            : `${selected.hint}. Confirm after sending — admin can mark paid if chain watch is not connected.`}
      </p>
    </div>
  );
}
