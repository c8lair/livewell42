/**
 * BTC/USD spot rate. Coinbase primary, CoinGecko fallback.
 */
export type BtcRate = { rate: string; source: string };

async function fromCoinbase(): Promise<BtcRate> {
  const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Coinbase ${res.status}`);
  const json = (await res.json()) as { data?: { amount?: string } };
  const amount = json.data?.amount;
  if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error("Coinbase rate missing");
  }
  return { rate: String(amount), source: "coinbase" };
}

async function fromCoinGecko(): Promise<BtcRate> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const json = (await res.json()) as { bitcoin?: { usd?: number } };
  const usd = json.bitcoin?.usd;
  if (!usd || !Number.isFinite(usd) || usd <= 0) {
    throw new Error("CoinGecko rate missing");
  }
  return { rate: String(usd), source: "coingecko" };
}

export async function getBtcUsdRate(): Promise<BtcRate> {
  try {
    return await fromCoinbase();
  } catch (primary) {
    try {
      return await fromCoinGecko();
    } catch (fallback) {
      throw new Error(
        `Could not fetch BTC/USD rate (${String(primary)}; ${String(fallback)}). Try again shortly.`,
      );
    }
  }
}

/** Convert USD cents to BTC decimal string (8 places, ceil to favor merchant coverage). */
export function usdCentsToBtc(cents: number, rateUsd: string): string {
  if (cents <= 0) throw new Error("Amount must be positive.");
  const rate = Number(rateUsd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid BTC rate.");
  const usd = cents / 100;
  const btc = usd / rate;
  // ceil to 8 decimals so we never under-quote due to float noise
  const sats = Math.ceil(btc * 1e8 - 1e-9);
  return (sats / 1e8).toFixed(8);
}

export function btcToSats(btc: string): bigint {
  const s = String(btc ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid BTC amount.");
  const [whole, frac = ""] = s.split(".");
  const frac8 = (frac + "00000000").slice(0, 8);
  return BigInt(whole) * 100_000_000n + BigInt(frac8);
}

export function satsToBtc(sats: bigint): string {
  const neg = sats < 0n;
  const v = neg ? -sats : sats;
  const whole = v / 100_000_000n;
  const frac = (v % 100_000_000n).toString().padStart(8, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}


/** Convert USD cents to sats at a given USD/BTC rate (ceil, like usdCentsToBtc). */
export function usdCentsToSats(cents: number, rateUsd: string): bigint {
  if (cents < 0) throw new Error("Amount must be non-negative.");
  const rate = Number(rateUsd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Invalid BTC rate.");
  if (cents === 0) return 0n;
  return BigInt(Math.ceil((cents / 100 / rate) * 1e8 - 1e-9));
}

/**
 * True when confirmed received is short of quoted by LESS than maxUsdCents
 * (default $1) at the invoice rate. Exact/over is not a shortfall.
 */
export function shortfallWithinUsd(
  quotedSats: bigint,
  receivedSats: bigint,
  rateUsd: string,
  maxUsdCents = 100,
): boolean {
  if (receivedSats <= 0n || receivedSats >= quotedSats) return false;
  const shortfall = quotedSats - receivedSats;
  const maxSats = usdCentsToSats(maxUsdCents, rateUsd);
  return shortfall < maxSats;
}

export function remainingBtc(quoted: string, received: string): string {
  const q = btcToSats(quoted);
  const r = btcToSats(received || "0");
  const left = q > r ? q - r : 0n;
  return satsToBtc(left);
}
