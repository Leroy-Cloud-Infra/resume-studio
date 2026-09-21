import assert from "node:assert/strict";
import test from "node:test";

import { calculateTextareaHeight } from "../src/lib/textarea-autosize.ts";

test("textarea height respects the minimum and maximum bounds", () => {
  assert.equal(calculateTextareaHeight(40, 96, 220), 96);
  assert.equal(calculateTextareaHeight(160, 96, 220), 160);
  assert.equal(calculateTextareaHeight(280, 96, 220), 220);
  assert.equal(calculateTextareaHeight(280, 96, 0), 280);
});
