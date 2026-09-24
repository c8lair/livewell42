/**
 * Generic Cash App-style phone illustrations for the Driver.js walkthrough.
 * CSS/HTML only — no screenshots, logos, or trademarked artwork.
 */

import { CASHAPP_WALKTHROUGH } from "./content.ts";

export const CASHAPP_PHONE_CAPTION = "Illustration, not the actual app";

/** Generic buffer amount shown on the keypad / confirm screens. */
export const CASHAPP_ILLUSTRATION_AMOUNT = "$55";

export const CASHAPP_PHONE_SCREENS = [
  { id: "open", highlight: "home-badge" },
  { id: "btc", highlight: "bitcoin-tile" },
  { id: "buy", highlight: "buy-btn" },
  { id: "amt", highlight: "amount" },
  { id: "ok", highlight: "confirm-btn" },
] as const;

function hit(id: string, className: string, inner: string): string {
  return `<span class="${className} lw-cashapp-phone__hit" data-hit="${id}">${inner}</span>`;
}

function tabs(active: "home" | "activity" | "pay"): string {
  return `<nav class="lw-ca-tabs" aria-hidden="true">
    <span class="lw-ca-tab${active === "home" ? " is-on" : ""}">Home</span>
    <span class="lw-ca-tab${active === "activity" ? " is-on" : ""}">List</span>
    <span class="lw-ca-tab lw-ca-tab--cash${active === "pay" ? " is-on" : ""}">$</span>
  </nav>`;
}

function screenOpen(): string {
  return `<div class="lw-ca-stage lw-ca-stage--home">
    <div class="lw-ca-status"><span></span><span></span></div>
    ${hit("home-badge", "lw-ca-badge", "$")}
    <p class="lw-ca-balance">$42.00</p>
    <p class="lw-ca-sub">Cash</p>
    <div class="lw-ca-tiles">
      <span class="lw-ca-tile">Pay</span>
      <span class="lw-ca-tile lw-ca-tile--btc">BTC</span>
      <span class="lw-ca-tile">Card</span>
    </div>
    ${tabs("home")}
  </div>`;
}

function screenBtc(): string {
  return `<div class="lw-ca-stage lw-ca-stage--home">
    <div class="lw-ca-status"><span></span><span></span></div>
    <span class="lw-ca-badge">$</span>
    <p class="lw-ca-balance">$42.00</p>
    <p class="lw-ca-sub">Cash</p>
    <div class="lw-ca-tiles">
      <span class="lw-ca-tile">Pay</span>
      ${hit("bitcoin-tile", "lw-ca-tile lw-ca-tile--btc", "BTC")}
      <span class="lw-ca-tile">Card</span>
    </div>
    ${tabs("home")}
  </div>`;
}

function screenBuy(): string {
  return `<div class="lw-ca-stage lw-ca-stage--asset">
    <p class="lw-ca-asset-kicker">Bitcoin</p>
    <p class="lw-ca-asset-amt">BTC</p>
    <svg class="lw-ca-spark" viewBox="0 0 120 36" aria-hidden="true">
      <polyline fill="none" stroke="#00d632" stroke-width="2"
        points="2,28 20,22 38,24 56,14 74,16 92,8 118,12" />
    </svg>
    <div class="lw-ca-pair">
      ${hit("buy-btn", "lw-ca-btn lw-ca-btn--go", "Buy")}
      <span class="lw-ca-btn">Sell</span>
    </div>
    ${tabs("activity")}
  </div>`;
}

function screenAmt(): string {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
  return `<div class="lw-ca-stage lw-ca-stage--amount">
    ${hit("amount", "lw-ca-amount", CASHAPP_ILLUSTRATION_AMOUNT)}
    <p class="lw-ca-sub">order + extra</p>
    <div class="lw-ca-pad">${keys.map((k) => `<span>${k}</span>`).join("")}</div>
    <span class="lw-ca-btn lw-ca-btn--go lw-ca-btn--wide">Continue</span>
  </div>`;
}

function screenOk(): string {
  return `<div class="lw-ca-stage lw-ca-stage--confirm">
    <span class="lw-ca-check">✓</span>
    <p class="lw-ca-confirm-title">Confirm</p>
    <p class="lw-ca-balance">${CASHAPP_ILLUSTRATION_AMOUNT}</p>
    <p class="lw-ca-sub">Bitcoin</p>
    ${hit("confirm-btn", "lw-ca-btn lw-ca-btn--go lw-ca-btn--wide", "Confirm")}
    <p class="lw-ca-invoice">Then pay the Livewell42 invoice</p>
  </div>`;
}

const INNERS: Record<string, () => string> = {
  open: screenOpen,
  btc: screenBtc,
  buy: screenBuy,
  amt: screenAmt,
  ok: screenOk,
};

export function cashAppPhoneScreenHtml(
  stepIndex: number,
  reducedMotion = false,
): string {
  const frame = CASHAPP_WALKTHROUGH[stepIndex] ?? CASHAPP_WALKTHROUGH[0];
  const inner = (INNERS[frame.id] ?? screenOpen)();
  const staticClass = reducedMotion ? " is-static" : "";
  return `<figure class="lw-cashapp-phone${staticClass}" data-lw-cashapp-phone data-screen="${frame.id}">
    <div class="lw-cashapp-phone__device">
      <div class="lw-cashapp-phone__notch"></div>
      <div class="lw-cashapp-phone__screen">${inner}</div>
    </div>
    <figcaption class="lw-cashapp-phone__caption">${CASHAPP_PHONE_CAPTION}</figcaption>
  </figure>`;
}

export function createCashAppPhoneScreen(
  doc: Document,
  stepIndex: number,
  reducedMotion: boolean,
): HTMLElement {
  const slot = doc.createElement("div");
  slot.innerHTML = cashAppPhoneScreenHtml(stepIndex, reducedMotion).trim();
  const figure = slot.firstElementChild;
  if (!(figure instanceof HTMLElement)) {
    throw new Error("Cash App phone illustration failed to render");
  }
  return figure;
}
