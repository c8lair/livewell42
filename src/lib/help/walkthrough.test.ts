import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CASHAPP_STEPS_LIST,
  CASHAPP_WALKTHROUGH,
  FAQ_FEES_ID,
  FAQ_PATH,
} from "./content.ts";
import {
  CASHAPP_DRIVER_POPOVER_CLASS,
  CASHAPP_FEE_FAQ_LABEL,
  CASHAPP_FEE_NOTE,
  cashAppDriverSteps,
  cashAppFeeFaqHref,
} from "./walkthrough.ts";

describe("Cash App Driver.js walkthrough", () => {
  it("maps each educational frame to an element-less popover step", () => {
    const steps = cashAppDriverSteps();
    assert.equal(steps.length, 5);
    assert.equal(steps.length, CASHAPP_WALKTHROUGH.length);
    assert.equal(steps.length, CASHAPP_STEPS_LIST.length);

    for (const [index, step] of steps.entries()) {
      const frame = CASHAPP_WALKTHROUGH[index];
      assert.equal("element" in step, false);
      assert.equal(step.popover.title, frame?.title);
      assert.equal(step.popover.description, frame?.body);
      assert.equal(step.popover.popoverClass, CASHAPP_DRIVER_POPOVER_CLASS);
    }

    assert.match(steps[3]?.popover.description ?? "", /extra/i);
    assert.match(steps[4]?.popover.description ?? "", /invoice/i);
  });

  it("keeps the fee note and FAQ fees link", () => {
    assert.equal(FAQ_PATH, "/faq");
    assert.equal(FAQ_FEES_ID, "faq-fees");
    assert.equal(cashAppFeeFaqHref(), `${FAQ_PATH}#${FAQ_FEES_ID}`);
    assert.match(CASHAPP_FEE_NOTE, /fees vary/i);
    assert.match(CASHAPP_FEE_FAQ_LABEL, /FAQ/i);
    assert.match(CASHAPP_FEE_FAQ_LABEL, /fees/i);
  });
});
