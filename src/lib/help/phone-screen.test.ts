import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CASHAPP_WALKTHROUGH } from "./content.ts";
import {
  CASHAPP_ILLUSTRATION_AMOUNT,
  CASHAPP_PHONE_CAPTION,
  CASHAPP_PHONE_SCREENS,
  cashAppPhoneScreenHtml,
} from "./phone-screen.ts";

describe("Cash App phone illustrations", () => {
  it("renders a distinct screen for each walkthrough step", () => {
    assert.equal(CASHAPP_PHONE_SCREENS.length, 5);
    assert.equal(CASHAPP_PHONE_SCREENS.length, CASHAPP_WALKTHROUGH.length);

    for (const [index, meta] of CASHAPP_PHONE_SCREENS.entries()) {
      const html = cashAppPhoneScreenHtml(index, false);
      assert.equal(meta.id, CASHAPP_WALKTHROUGH[index]?.id);
      assert.match(html, new RegExp(`data-screen="${meta.id}"`));
      assert.match(html, new RegExp(`data-hit="${meta.highlight}"`));
      assert.match(html, /lw-cashapp-phone__hit/);
      assert.match(html, new RegExp(CASHAPP_PHONE_CAPTION));
      assert.doesNotMatch(html, / is-static/);
    }
  });

  it("shows amount + buffer and a pay-the-invoice hint", () => {
    const amount = cashAppPhoneScreenHtml(3);
    assert.match(amount, new RegExp(CASHAPP_ILLUSTRATION_AMOUNT.replace("$", "\\$")));
    assert.match(amount, /order \+ extra/);

    const confirm = cashAppPhoneScreenHtml(4);
    assert.match(confirm, /pay the Livewell42 invoice/i);
    assert.match(confirm, /Confirm/);
  });

  it("drops the pulse class when reduced motion is on", () => {
    const html = cashAppPhoneScreenHtml(1, true);
    assert.match(html, / is-static/);
    assert.match(html, /Illustration, not the actual app/);
  });

  it("does not embed logos, screenshots, or promo copy", () => {
    const blob = CASHAPP_PHONE_SCREENS.map((_, i) => cashAppPhoneScreenHtml(i)).join(
      "\n",
    );
    assert.doesNotMatch(blob, /png|jpg|svg\+xml|cash\.app/i);
    assert.doesNotMatch(blob, /promo/i);
    assert.doesNotMatch(blob, /referral/i);
  });
});
