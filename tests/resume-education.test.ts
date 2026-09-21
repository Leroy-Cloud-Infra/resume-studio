import assert from "node:assert/strict";
import test from "node:test";

import { getEducationIdentityParts } from "../src/lib/resume-rendering.ts";
import { parseCourseworkLines } from "../src/lib/resume-text.ts";

test("Education identity only separates populated degree and school", () => {
  assert.equal(getEducationIdentityParts({ degree: "McDegree", school: "Hamburger University" }).showSeparator, true);
  assert.equal(getEducationIdentityParts({ degree: "", school: "Hamburger University" }).showSeparator, false);
  assert.equal(getEducationIdentityParts({ degree: "McDegree", school: "" }).showSeparator, false);
  assert.equal(getEducationIdentityParts({ degree: "", school: "" }).showSeparator, false);
});

test("coursework parsing preserves internal and trailing spaces while typing", () => {
  assert.deepEqual(
    parseCourseworkLines("Network and Security Foundations\nOperating Systems\n\nData Structures and Algorithms"),
    ["Network and Security Foundations", "Operating Systems", "Data Structures and Algorithms"],
  );
  assert.deepEqual(parseCourseworkLines("Network "), ["Network "]);
  assert.deepEqual(parseCourseworkLines("  \n\t"), []);
});
