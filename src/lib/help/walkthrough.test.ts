import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CASHAPP_WALKTHROUGH } from "./content.ts";
import {
  CASHAPP_WALKTHROUGH_FRAME_MS,
  stepWalkthroughIndex,
} from "./walkthrough.ts";

describe("Cash App walkthrough frame advance", () => {
  const length = CASHAPP_WALKTHROUGH.length;

  it("loops forward through every step and wraps to the first", () => {
    assert.equal(length, 5);
    assert.equal(CASHAPP_WALKTHROUGH_FRAME_MS, 1600);

    const seen: string[] = [];
    let index = 0;
    for (let tick = 0; tick < length; tick++) {
      seen.push(CASHAPP_WALKTHROUGH[index]?.id ?? "");
      index = stepWalkthroughIndex(index, 1, length);
    }
    assert.deepEqual(
      seen,
      CASHAPP_WALKTHROUGH.map((frame) => frame.id),
    );
    assert.equal(index, 0);
    assert.equal(stepWalkthroughIndex(length - 1, 1, length), 0);
  });

  it("steps backward from the first frame to the last", () => {
    assert.equal(stepWalkthroughIndex(0, -1, length), length - 1);
    assert.equal(stepWalkthroughIndex(2, -1, length), 1);
  });

  it("stays usable when length is empty", () => {
    assert.equal(stepWalkthroughIndex(3, 1, 0), 0);
    assert.equal(stepWalkthroughIndex(0, -1, 0), 0);
  });
});
