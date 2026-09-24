/**
 * Driver.js mapping for the Cash App Bitcoin explainer.
 *
 * Steps are element-less (centered popovers) on purpose: this tour teaches
 * Cash App, an external app. We do not spotlight Livewell42 shop DOM. Each
 * step injects a generic CSS phone illustration (not screenshots or logos).
 */

import {
  CASHAPP_WALKTHROUGH,
  FAQ_FEES_ID,
  FAQ_PATH,
} from "./content.ts";

export const CASHAPP_DRIVER_POPOVER_CLASS = "lw-cashapp-driver";
export const CASHAPP_TOUR_TITLE = "Buy Bitcoin in Cash App";

export const CASHAPP_FEE_NOTE =
  "Cash App (and other) fees vary. Add a few extra dollars so you cover fees and network costs.";

export const CASHAPP_FEE_FAQ_LABEL = "Why add extra? See FAQ → fees";

export function cashAppFeeFaqHref(): string {
  return `${FAQ_PATH}#${FAQ_FEES_ID}`;
}

export type CashAppDriverStep = {
  popover: {
    title: string;
    description: string;
    popoverClass: string;
  };
};

export function cashAppDriverSteps(): CashAppDriverStep[] {
  return CASHAPP_WALKTHROUGH.map((frame) => ({
    popover: {
      title: frame.title,
      description: frame.body,
      popoverClass: CASHAPP_DRIVER_POPOVER_CLASS,
    },
  }));
}
