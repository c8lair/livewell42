/** Client-safe Bitcoin checkout view types (no server-only imports). */

export type BtcPaymentView = {
  orderNumber: string;
  status: string;
  btcStatus: string;
  usdTotalCents: number;
  btcAmount: string;
  btcReceived: string;
  btcRemaining: string;
  address: string;
  bip21: string;
  quoteExpiresAt: string | null;
  txid: string;
  explorerTxUrl: string | null;
  testnet: boolean;
  testBitcoinPayments: boolean;
  overpayNote: string;
  paid: boolean;
};
