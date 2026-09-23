/**
 * Address / tx lookups via mempool.space (mainnet only).
 */
import { btcToSats, satsToBtc } from "./rates.server";

const MEMPOOL_API = "https://mempool.space/api";
const MEMPOOL_EXPLORER = "https://mempool.space";

export type AddressSummary = {
  address: string;
  /** Net received to this address (funded - spent), chain only */
  chainReceivedSats: bigint;
  chainSpentSats: bigint;
  mempoolReceivedSats: bigint;
  mempoolSpentSats: bigint;
  /** Confirmed net balance on address */
  confirmedBalanceSats: bigint;
  /** Unconfirmed net inbound (mempool funded - spent) */
  mempoolBalanceSats: bigint;
  txCount: number;
};

type Stats = {
  funded_txo_sum?: number;
  spent_txo_sum?: number;
  tx_count?: number;
};

export async function addressSummary(address: string): Promise<AddressSummary> {
  const res = await fetch(`${MEMPOOL_API}/address/${encodeURIComponent(address)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`mempool address ${res.status}`);
  }
  const json = (await res.json()) as {
    chain_stats?: Stats;
    mempool_stats?: Stats;
  };
  const chainFunded = BigInt(json.chain_stats?.funded_txo_sum ?? 0);
  const chainSpent = BigInt(json.chain_stats?.spent_txo_sum ?? 0);
  const memFunded = BigInt(json.mempool_stats?.funded_txo_sum ?? 0);
  const memSpent = BigInt(json.mempool_stats?.spent_txo_sum ?? 0);
  return {
    address,
    chainReceivedSats: chainFunded,
    chainSpentSats: chainSpent,
    mempoolReceivedSats: memFunded,
    mempoolSpentSats: memSpent,
    confirmedBalanceSats: chainFunded - chainSpent,
    mempoolBalanceSats: memFunded - memSpent,
    txCount:
      (json.chain_stats?.tx_count ?? 0) + (json.mempool_stats?.tx_count ?? 0),
  };
}

export type AddressTx = {
  txid: string;
  confirmed: boolean;
  confirmations: number;
  /** Value received by `address` in this tx (sats) */
  receivedSats: bigint;
};

type MempoolTx = {
  txid: string;
  status?: { confirmed?: boolean; block_height?: number };
  vout?: Array<{ scriptpubkey_address?: string; value?: number }>;
};

export async function listAddressTxs(address: string): Promise<AddressTx[]> {
  const res = await fetch(
    `${MEMPOOL_API}/address/${encodeURIComponent(address)}/txs`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!res.ok) throw new Error(`mempool txs ${res.status}`);
  const txs = (await res.json()) as MempoolTx[];
  let tipHeight = 0;
  try {
    const tipRes = await fetch(`${MEMPOOL_API}/blocks/tip/height`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (tipRes.ok) tipHeight = Number(await tipRes.text()) || 0;
  } catch {
    /* ignore */
  }
  return txs.map((tx) => {
    const received = (tx.vout ?? [])
      .filter((o) => o.scriptpubkey_address === address)
      .reduce((s, o) => s + BigInt(o.value ?? 0), 0n);
    const confirmed = Boolean(tx.status?.confirmed);
    const bh = tx.status?.block_height;
    const confirmations =
      confirmed && tipHeight && bh
        ? Math.max(0, tipHeight - bh + 1)
        : confirmed
          ? 1
          : 0;
    return {
      txid: tx.txid,
      confirmed,
      confirmations,
      receivedSats: received,
    };
  });
}

export function explorerTxUrl(txid: string): string {
  return `${MEMPOOL_EXPLORER}/tx/${txid}`;
}

export function explorerAddressUrl(address: string): string {
  return `${MEMPOOL_EXPLORER}/address/${address}`;
}

/** Sum confirmed inbound to address across listed txs (ignores spends). */
export function sumConfirmedReceived(txs: AddressTx[]): bigint {
  return txs
    .filter((t) => t.confirmed && t.receivedSats > 0n)
    .reduce((s, t) => s + t.receivedSats, 0n);
}

export function sumMempoolReceived(txs: AddressTx[]): bigint {
  return txs
    .filter((t) => !t.confirmed && t.receivedSats > 0n)
    .reduce((s, t) => s + t.receivedSats, 0n);
}

export function formatReceivedBtc(sats: bigint): string {
  return satsToBtc(sats);
}

export function parseQuotedSats(btcAmount: string): bigint {
  return btcToSats(btcAmount);
}
