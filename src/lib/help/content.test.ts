import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CASHAPP_STEPS_LIST,
  CASHAPP_WALKTHROUGH,
  FAQ_FEES_HASH,
  FAQ_FEES_ID,
  FAQ_ITEMS,
  FAQ_PATH,
} from "./content.ts";

describe("shopper help content", () => {
  it("exposes #faq-fees for the Cash App explainer link", () => {
    assert.equal(FAQ_PATH, "/faq");
    assert.equal(FAQ_FEES_ID, "faq-fees");
    assert.equal(FAQ_FEES_HASH, "#faq-fees");
    assert.ok(FAQ_ITEMS.some((item) => item.id === FAQ_FEES_ID));
  });

  it("walks through Cash App buy in five looping frames", () => {
    assert.equal(CASHAPP_WALKTHROUGH.length, 5);
    assert.equal(CASHAPP_STEPS_LIST.length, 5);
    assert.equal(CASHAPP_WALKTHROUGH[0]?.icon, "cash");
    assert.equal(CASHAPP_WALKTHROUGH[1]?.icon, "btc");
    assert.equal(CASHAPP_WALKTHROUGH[2]?.icon, "buy");
    assert.match(CASHAPP_WALKTHROUGH[3]?.body ?? "", /extra/i);
    assert.match(CASHAPP_WALKTHROUGH[4]?.body ?? "", /invoice/i);
  });

  it("gives Bitcoin-related answers numbered steps and a Watch the GIF action", () => {
    const gifItems = FAQ_ITEMS.filter((item) => item.watchGif);
    assert.deepEqual(
      gifItems.map((item) => item.id),
      ["faq-btc", "faq-fees", "faq-cashapp"],
    );
    for (const item of FAQ_ITEMS) {
      assert.ok(item.steps.length >= 3 && item.steps.length <= 4);
    }
    const fees = FAQ_ITEMS.find((item) => item.id === FAQ_FEES_ID);
    assert.ok(fees?.callout);
    assert.match(fees?.watchLabel ?? "", /Watch the GIF/i);
  });

  it("does not include promo, referral, or demo-mode copy", () => {
    const blob = JSON.stringify({ FAQ_ITEMS, CASHAPP_WALKTHROUGH, CASHAPP_STEPS_LIST });
    assert.doesNotMatch(blob, /promo/i);
    assert.doesNotMatch(blob, /referral/i);
    assert.doesNotMatch(blob, /demo mode/i);
  });
});
