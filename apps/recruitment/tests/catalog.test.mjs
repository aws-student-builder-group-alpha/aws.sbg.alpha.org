import test from "node:test";
import assert from "node:assert/strict";
import { getOpportunity, isCoreEligible, opportunities, wordCount } from "../lib/catalog.ts";
import { validSubmission } from "./fixtures/submission.mjs";

test("approved catalog retains sixteen distinct opportunities and department routing", () => {
  assert.equal(opportunities.length, 16);
  assert.equal(new Set(opportunities.map(item => item.id)).size, 16);
  assert.equal(opportunities.filter(item => item.track === "CORE_TEAM").length, 6);
  assert.equal(opportunities.filter(item => item.track === "COMMITTEE").length, 10);
  assert.equal(getOpportunity("core-secretariat").department, "Secretariat");
  assert.deepEqual(opportunities.filter(item => item.specialization).map(item => item.specialization), ["Cloud", "AI/ML", "Web Development"]);
  assert.equal(getOpportunity("buildher").track, "COMMITTEE");
  assert.equal(getOpportunity("buildher").title, "Ambassador");
  assert.equal(getOpportunity("not-an-opportunity"), undefined);
});

test("Core Team eligibility requires enrollment and a first- or second-year undergraduate", () => {
  const profile = { ...validSubmission().profile, email: "applicant@example.test" };
  for (const year of ["1", "2"]) assert.equal(isCoreEligible({ ...profile, year }), true);
  for (const year of ["3", "4", "5", "6+", "other", ""]) assert.equal(isCoreEligible({ ...profile, year }), false);
  for (const programLevel of ["postgraduate", "other", ""]) assert.equal(isCoreEligible({ ...profile, programLevel, year: "1" }), false);
  assert.equal(isCoreEligible({ ...profile, enrolled: false }), false);
});

test("word counts handle Unicode whitespace, non-Latin words and empty input", () => {
  assert.equal(wordCount("  Alpha\n\tbuilders\u00a0together  "), 3);
  assert.equal(wordCount("你好\u2003世界"), 2);
  assert.equal(wordCount("\uFEFF\u3000\n\t"), 0);
});
