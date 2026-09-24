/**
 * Shopper help copy for the Cash App Bitcoin explainer and FAQ accordion.
 * Promo / referral / demo mode copy is intentionally omitted (later phases).
 */

export const FAQ_FEES_ID = "faq-fees";
export const FAQ_PATH = "/faq";
export const FAQ_FEES_HASH = `#${FAQ_FEES_ID}`;

export type CashAppWalkthroughFrame = {
  id: string;
  title: string;
  body: string;
  icon: "cash" | "btc" | "buy" | "amt" | "ok";
  iconLabel: string;
};

export const CASHAPP_WALKTHROUGH: CashAppWalkthroughFrame[] = [
  {
    id: "open",
    title: "1. Open Cash App",
    body: "Launch Cash App on your phone",
    icon: "cash",
    iconLabel: "$",
  },
  {
    id: "btc",
    title: "2. Tap Bitcoin",
    body: "Bitcoin tile on the home screen",
    icon: "btc",
    iconLabel: "₿",
  },
  {
    id: "buy",
    title: "3. Tap Buy",
    body: "Start a Bitcoin purchase",
    icon: "buy",
    iconLabel: "Buy",
  },
  {
    id: "amt",
    title: "4. Enter amount",
    body: "Match order total + a little extra",
    icon: "amt",
    iconLabel: "$+",
  },
  {
    id: "ok",
    title: "5. Confirm",
    body: "Then send BTC to the Livewell42 invoice",
    icon: "ok",
    iconLabel: "✓",
  },
];

export const CASHAPP_STEPS_LIST = [
  "Open Cash App",
  "Tap Bitcoin",
  "Tap Buy",
  "Enter amount (order + buffer)",
  "Confirm, then pay the invoice",
] as const;

export type FaqItem = {
  id: string;
  question: string;
  intro: string;
  steps: string[];
  callout?: string;
  watchGif?: boolean;
  watchLabel?: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-membership",
    question: "How do I become a member?",
    intro: "Membership is required before checkout. Here is the short path:",
    steps: [
      "Create an account with your email",
      "Sign in",
      "Confirm you are 21+ and products are for laboratory research use only",
      "Shop — the catalog unlocks after those steps",
    ],
  },
  {
    id: "faq-btc",
    question: "How do I pay with Bitcoin?",
    intro: "At checkout, choose Bitcoin. You will get an invoice address and amount.",
    steps: [
      "Select Bitcoin as payment",
      "Copy the invoice address (or scan QR)",
      "Send the BTC amount from your wallet / Cash App",
      "Wait for 1 confirmation — we mark the order paid when it clears",
    ],
    watchGif: true,
    watchLabel: "Watch the GIF — Cash App buy walkthrough",
  },
  {
    id: FAQ_FEES_ID,
    question: "Why should I add extra dollars for Cash App / Bitcoin fees?",
    intro:
      "Cash App and network fees vary. If you buy or send exactly the order total, fees can leave the invoice short.",
    callout:
      "Recommendation: buy / send a few dollars more than the order total so fees do not underpay the invoice.",
    steps: [
      "Note your Livewell42 order total (USD / BTC shown at checkout)",
      "In Cash App, buy a bit more BTC than that amount",
      "Send the invoice amount (or slightly more if your wallet allows)",
      "Keep any leftover BTC in Cash App for next time",
    ],
    watchGif: true,
    watchLabel: "Watch the GIF — fees called out in the overlay",
  },
  {
    id: "faq-cashapp",
    question: "How do I buy Bitcoin in Cash App?",
    intro: "You do not need a separate exchange — Cash App can buy BTC on the phone.",
    steps: [
      "Open Cash App",
      "Tap Bitcoin",
      "Tap Buy, enter amount (order + buffer), confirm",
      "Send to the Livewell42 invoice address",
    ],
    watchGif: true,
    watchLabel: "Watch the GIF",
  },
  {
    id: "faq-shipping",
    question: "How does shipping work?",
    intro: "Flat-rate shipping for the lower 48, with a free-shipping threshold when enabled.",
    steps: [
      "Add products to cart",
      "See shipping at checkout (or free if you hit the threshold)",
      "Confirm address — we ship after payment clears",
      "Track via your order email or the Orders page",
    ],
  },
];
