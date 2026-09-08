import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  acceptLegal,
  getBootstrap,
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
        Access is by referral. Create an account or sign in to continue.
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
      ) : (
        <Shop me={me} settings={settings} products={products} onPaid={() => void refresh()} />
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
  const normalShip = shippingCents(merchandise, settings.freeShippingAtCents, settings.shippingCents);
  // Test Bitcoin mode: free shipping on the shop cart so small carts (e.g. $1) can pay BTC.
  const ship =
    settings.btcEnabled && settings.testBitcoinPayments ? 0 : normalShip;
  const due = merchandise - credit + ship;

  function setQ(id: number, next: number, stock: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(stock, next)) }));
  }

  async function checkout() {
    if (!lines.length) {
      toast.error("Add a quantity first.");
      return;
    }
    const shipName = name.trim();
    const shipStreet = street.trim();
    const shipCity = city.trim();
    const shipState = state.trim().toUpperCase();
    const shipZip = zip.trim();
    if (shipZip && !/^\d{5}(-\d{4})?$/.test(shipZip)) {
      toast.error("Error: enter a 5-digit ZIP");
      return;
    }
    if (!shipState || shipState.length !== 2) {
      toast.error("Error: choose a state we ship to");
      return;
    }
    if (!shipName || !shipStreet || !shipCity || !shipZip) {
      toast.error("Error: please enter shipping address");
      return;
    }
    setBusy(true);
    try {
      const res = await placeOrder({
        data: {
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          shipName,
          shipStreet,
          shipCity,
          shipState,
          shipZip,
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
      if (res && "paymentUrl" in res && res.paymentUrl) {
        window.location.href = res.paymentUrl as string;
        return;
      }
      toast.success(`Order ${res.orderNumber} placed · ${cents(res.totalCents)}`);
      setQty({});
      onPaid();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const msg = raw.trim();
      if (!msg || msg.startsWith("[") || msg.startsWith("{") || msg.includes('"code"')) {
        toast.error("Error: please enter shipping address");
      } else {
        toast.error(msg);
      }
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
        <RailPicker value={rail} onChange={setRail} settings={settings} amountLabel={cents(due)} dueCents={due} />
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
            <Button disabled={busy || merchandise === 0 || (!settings.nexapayEnabled && !(settings.btcEnabled && (settings.testBitcoinPayments || due >= (settings.btcMinCents ?? 2500))))} onClick={() => void checkout()}>
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
  const pill =
    "inline-flex h-[44px] w-[68px] shrink-0 items-center justify-center rounded-md border border-border/70 bg-black/40 px-1.5";
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
      {/* Visa — blue wordmark */}
      <span className={pill} title="Visa">
        <svg width={56} height={36} viewBox="0 0 48 32" role="img">
          <title>Visa</title>
          <rect width="48" height="32" rx="4" fill="#1A1F71" />
          <text
            x="24"
            y="21"
            textAnchor="middle"
            fill="#fff"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="700"
            fontSize="11"
            letterSpacing="1.5"
          >
            VISA
          </text>
        </svg>
      </span>
      {/* Mastercard — overlapping circles */}
      <span className={pill} title="Mastercard">
        <svg width={56} height={36} viewBox="0 0 38 24" role="img">
          <title>Mastercard</title>
          <circle cx="14" cy="12" r="10" fill="#EB001B" />
          <circle cx="24" cy="12" r="10" fill="#F79E1B" />
          <path
            d="M19 3.1a10 10 0 0 0 0 17.8 10 10 0 0 0 0-17.8z"
            fill="#FF5F00"
            fillOpacity="0.6"
          />
        </svg>
      </span>
      {/* Apple Pay */}
      <span className={pill} title="Apple Pay">
        <svg width={56} height={36} viewBox="0 0 44 18" role="img">
          <title>Apple Pay</title>
          <path
            fill="#E8E8ED"
            d="M8.2 3.6c-.5.6-1.3 1-2.1.9-.1-.8.3-1.7.8-2.2.5-.6 1.4-1 2.1-1 .1.9-.3 1.7-.8 2.3zm.9 1.4c-1.2-.1-2.3.7-2.9.7-.7 0-1.6-.7-2.6-.6-1.3.1-2.5.8-3.2 2-1.4 2.3-.3 5.8.9 7.7.7.9 1.5 2 2.5 1.9 1-.1 1.4-.6 2.6-.6s1.5.6 2.6.6c1.1 0 1.8-.9 2.5-1.9.8-1.1 1.1-2.1 1.1-2.2 0 0-2.1-.8-2.1-3.2 0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.5-3.1-1.5z"
          />
          <text
            x="28"
            y="13.5"
            textAnchor="middle"
            fill="#E8E8ED"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="500"
            fontSize="9"
          >
            Pay
          </text>
        </svg>
      </span>
      {/* Google Pay */}
      <span className={pill} title="Google Pay">
        <svg width={56} height={36} viewBox="0 0 48 18" role="img">
          <title>Google Pay</title>
          {/* Multicolor G */}
          <path
            fill="#4285F4"
            d="M8.6 9.2c0-.3 0-.6-.1-.9H4.5v1.7h2.3c-.1.5-.4 1-.9 1.3v1.1h1.4c.9-.8 1.3-2 1.3-3.2z"
          />
          <path
            fill="#34A853"
            d="M4.5 13.5c1.2 0 2.2-.4 3-1.1l-1.4-1.1c-.4.3-.9.4-1.6.4-1.2 0-2.2-.8-2.6-1.9H.4v1.1c.7 1.5 2.3 2.6 4.1 2.6z"
          />
          <path
            fill="#FBBC05"
            d="M1.9 9.8c-.1-.3-.1-.6-.1-.9s0-.6.1-.9V6.9H.4C.1 7.5 0 8.1 0 8.9s.1 1.4.4 2l1.5-1.1z"
          />
          <path
            fill="#EA4335"
            d="M4.5 5.2c.7 0 1.3.2 1.8.7l1.3-1.3C6.7 3.8 5.7 3.3 4.5 3.3 2.7 3.3 1.1 4.4.4 5.9l1.5 1.1c.4-1.1 1.4-1.8 2.6-1.8z"
          />
          <text
            x="30"
            y="12.5"
            textAnchor="middle"
            fill="#E8E8ED"
            fontFamily="Arial, Helvetica, sans-serif"
            fontWeight="500"
            fontSize="9"
          >
            Pay
          </text>
        </svg>
      </span>
    </div>
  );
}

function RailPicker({
  value,
  onChange,
  settings,
  amountLabel,
  dueCents,
}: {
  value: Rail;
  onChange: (r: Rail) => void;
  settings: PublicSettings;
  amountLabel: string;
  dueCents: number;
}) {
  const cardOn = Boolean(settings.nexapayEnabled);
  const min = settings.btcMinCents ?? 2500;
  // Skip $25 minimum when Test Bitcoin payments is on — independent of Testnet.
  const testBtc = Boolean(settings.testBitcoinPayments);
  const btcOn =
    Boolean(settings.btcEnabled) && (testBtc || dueCents >= min);

  useEffect(() => {
    if (cardOn && (!btcOn || value !== "btc")) {
      if (value !== "card") onChange("card");
      return;
    }
    if (!cardOn && btcOn && value !== "btc") onChange("btc");
    if (!btcOn && value === "btc" && cardOn) onChange("card");
  }, [cardOn, btcOn, value, onChange]);

  const effective: Rail =
    cardOn && (!btcOn || value !== "btc") ? "card" : btcOn ? "btc" : "card";

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-muted">Pay {amountLabel}</p>
      {cardOn ? (
        <div
          className={`space-y-1.5 ${btcOn ? "cursor-pointer rounded-md border border-transparent p-1" : ""} ${
            effective === "card" && btcOn ? "border-accent bg-raised/40" : ""
          }`}
          onClick={btcOn ? () => onChange("card") : undefined}
          onKeyDown={undefined}
          role={btcOn ? "button" : undefined}
        >
          <CardRailMarks />
          <p className="text-xs leading-relaxed text-faint">
            Visa, Mastercard, Apple Pay, Google Pay
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">Card checkout is temporarily off.</p>
      )}
      {btcOn ? (
        <button
          type="button"
          onClick={() => onChange("btc")}
          className={`w-full rounded-md border px-3 py-3 text-left text-sm sm:max-w-xs ${
            effective === "btc" ? "border-accent bg-raised text-fg" : "border-border text-muted"
          }`}
        >
          Pay with Bitcoin
        </button>
      ) : settings.btcEnabled && !testBtc && dueCents > 0 && dueCents < min ? (
        <p className="text-xs text-faint">
          Bitcoin available for orders of {cents(min)} or more.
        </p>
      ) : null}
      {effective === "btc" ? (
        <p className="text-xs leading-relaxed text-faint">
          You will get a 15-minute Bitcoin quote with a QR code. Payment confirms
          after 1 on-chain confirmation.
          {settings.btcTestnet ? " (Testnet mode is on.)" : ""}
        </p>
      ) : null}
      {!cardOn && !btcOn ? (
        <p className="text-sm text-muted">No payment methods are available right now.</p>
      ) : null}
    </div>
  );
}
