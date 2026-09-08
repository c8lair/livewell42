/**
 * BIP84 zpub/vpub → native SegWit address. Server-only — never import from client.
 * Uses @scure/@noble only (no bitcoinjs ECC init) for reliable Node/Vite builds.
 */
import { HDKey } from "@scure/bip32";
import { base58check, bech32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";

const b58 = base58check(sha256);

/** mainnet zpub → xpub version bytes */
const ZPUB_VERSION = new Uint8Array([0x04, 0xb2, 0x47, 0x46]);
const XPUB_VERSION = new Uint8Array([0x04, 0x88, 0xb2, 0x1e]);
/** testnet vpub → tpub */
const VPUB_VERSION = new Uint8Array([0x04, 0x5f, 0x1c, 0xf6]);
const TPUB_VERSION = new Uint8Array([0x04, 0x35, 0x87, 0xcf]);

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

function toXpub(extended: string, testnet: boolean): string {
  const decoded = b58.decode(extended.trim());
  if (decoded.length < 4) throw new Error("Invalid extended public key.");
  const version = decoded.slice(0, 4);
  const target = testnet ? TPUB_VERSION : XPUB_VERSION;
  const altOk = testnet
    ? bytesEq(version, TPUB_VERSION) || bytesEq(version, VPUB_VERSION)
    : bytesEq(version, XPUB_VERSION) || bytesEq(version, ZPUB_VERSION);
  if (!altOk) {
    throw new Error(
      testnet
        ? "Expected a testnet vpub (or tpub)."
        : "Expected a mainnet zpub (or xpub).",
    );
  }
  const next = new Uint8Array(decoded.length);
  next.set(target, 0);
  next.set(decoded.slice(4), 4);
  return b58.encode(next);
}

function p2wpkhAddress(pubkey: Uint8Array, testnet: boolean): string {
  if (pubkey.length !== 33) throw new Error("Expected compressed public key.");
  const prog = hash160(pubkey);
  const words = bech32.toWords(prog);
  const hrp = testnet ? "tb" : "bc";
  return bech32.encode(hrp, [0, ...words]);
}

/**
 * Derive external-chain native SegWit address at m/0/i from account-level zpub/vpub.
 * zpub is already at m/84'/0'/0' (or m/84'/1'/0' for testnet).
 */
export function deriveAddress(zpub: string, index: number, testnet = false): string {
  if (!zpub?.trim()) throw new Error("Bitcoin zpub is not configured.");
  if (!Number.isInteger(index) || index < 0 || index > 2_147_483_647) {
    throw new Error("Invalid derivation index.");
  }
  const xpub = toXpub(zpub, testnet);
  const root = HDKey.fromExtendedKey(xpub);
  const child = root.deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("Could not derive public key.");
  return p2wpkhAddress(child.publicKey, testnet);
}

export function isZpubConfigured(zpub: string | null | undefined): boolean {
  return Boolean(zpub?.trim());
}
