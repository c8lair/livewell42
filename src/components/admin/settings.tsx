import { useEffect, useState, type ReactNode } from "react";
import { adminSaveSettings, repairOwnerAdmin } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { AdminData } from "./types";

export function SettingsBlock({
  settings,
  nexapayWebhookSecretConfigured,
  btcZpubConfigured,
  onSave,
}: {
  settings: AdminData["settings"];
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
  useEffect(() => {
    setBtcEnabled(Boolean(settings.btc_enabled));
  }, [settings.btc_enabled]);
  const [nexapayEnabled, setNexapayEnabled] = useState(
    settings.nexapay_enabled !== false,
  );
  const [bannerEnabled, setBannerEnabled] = useState(Boolean(settings.banner_enabled));
  const [bannerText, setBannerText] = useState(settings.banner_text ?? "");
  const [busy, setBusy] = useState(false);

  const nexapayKeyConfigured = Boolean(nexapay?.trim()) || Boolean(settings.nexapay_api_key?.trim());

  async function save() {
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-[720px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-medium">Settings</h1>
        <Badge>Settings</Badge>
      </div>

      <Card title="Storefront" sub="Public name, support contact, and optional banner.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Store name</Label>
            <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </div>
          <div>
            <Label>Support email</Label>
            <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
          </div>
        </div>
        <ToggleRow
          label="Show banner"
          desc="Optional message at the top of the shop."
          checked={bannerEnabled}
          onChange={setBannerEnabled}
        />
        <div>
          <Label>Banner text</Label>
          <Input
            value={bannerText}
            maxLength={280}
            onChange={(e) => setBannerText(e.target.value)}
            placeholder="Shown at the top of the shop when enabled"
          />
        </div>
      </Card>

      <Card title="Shipping" sub="Flat rate and free-shipping threshold (lower 48 only).">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Shipping (USD)</Label>
            <Input value={ship} onChange={(e) => setShip(e.target.value)} />
          </div>
          <div>
            <Label>Free shipping at (USD)</Label>
            <Input value={freeAt} onChange={(e) => setFreeAt(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card
        title="Card payments (NexaPay)"
        sub="Card checkout is live only when the toggle is on and an API key is saved."
      >
        <ToggleRow
          label="Enable card checkout"
          desc="Requires a valid NexaPay API key."
          checked={nexapayEnabled}
          onChange={setNexapayEnabled}
        />
        <div>
          <Label>API key</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={nexapay}
            onChange={(e) => setNexapay(e.target.value)}
            placeholder={nexapayKeyConfigured ? "•••••••• (saved — paste to replace)" : "Paste NexaPay API key"}
          />
        </div>
        <div>
          <Label>Webhook secret</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={nexapayWebhookSecret}
            onChange={(e) => setNexapayWebhookSecret(e.target.value)}
            placeholder={
              webhookSecretConfigured
                ? "•••••••• (saved — leave blank to keep)"
                : "Paste webhook secret"
            }
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge on={nexapayKeyConfigured}>{nexapayKeyConfigured ? "Configured" : "Not configured"}</Badge>
          <Badge on={nexapayEnabled && nexapayKeyConfigured}>
            {nexapayEnabled && nexapayKeyConfigured ? "Enabled" : "Off"}
          </Badge>
          <Badge on={webhookSecretConfigured}>
            {webhookSecretConfigured ? "Webhook signed" : "Webhook unsigned"}
          </Badge>
        </div>
      </Card>

      <Card
        title="Bitcoin"
        sub="Mainnet only. zpub is never shown to customers."
      >
        <ToggleRow
          label="Enable Bitcoin checkout"
          desc="Requires a valid zpub. Mainnet addresses only."
          checked={btcEnabled}
          onChange={setBtcEnabled}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Minimum order (USD)</Label>
            <Input value={btcMin} onChange={(e) => setBtcMin(e.target.value)} />
          </div>
          <div className="flex items-end pb-1">
            <Badge on={zpubConfigured}>{zpubConfigured ? "Configured" : "Not configured"}</Badge>
          </div>
        </div>
        <details className="rounded-lg border border-dashed border-border bg-raised p-3">
          <summary className="cursor-pointer text-sm text-accent">
            Configure receiving wallet (zpub) →
          </summary>
          <div className="mt-3">
            <Label>zpub (BIP84 mainnet)</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={btcZpub}
              onChange={(e) => setBtcZpub(e.target.value)}
              placeholder={
                zpubConfigured ? "•••••••• (saved — leave blank to keep)" : "Paste mainnet zpub"
              }
            />
            <p className="mt-2 rounded-r-md border-l-[3px] border-danger bg-danger/10 px-2.5 py-2 text-xs text-faint">
              Paste a mainnet zpub only. Testnet vpub/tpub keys are rejected.
            </p>
          </div>
        </details>
      </Card>

      <Card title="Operator" sub="Owner notifications, settlement wallets, and access repair.">
        <div>
          <Label>Owner notify email (order pings)</Label>
          <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
        </div>
        <div>
          <Label>USDC settle wallet (NexaPay payout)</Label>
          <Input value={usdc} onChange={(e) => setUsdc(e.target.value)} />
        </div>
        <div>
          <Label>Legacy BTC note address (optional display)</Label>
          <Input value={btc} onChange={(e) => setBtc(e.target.value)} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save settings"}
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

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-medium">{title}</h2>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">{sub}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <div>
        <p className="text-sm text-fg">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </div>
  );
}
