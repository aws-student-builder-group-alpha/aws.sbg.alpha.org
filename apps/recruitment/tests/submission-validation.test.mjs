import test from "node:test";
import assert from "node:assert/strict";
import { validateSubmission } from "../lib/applications.ts";
import { questionsFor } from "../lib/catalog.ts";
import { validSubmission } from "./fixtures/submission.mjs";

test("submission accepts optional portfolio, phone and community updates left empty", () => {
  const input = validSubmission();
  assert.ok(input.resumeUrl);
  assert.equal(input.portfolioUrl, "");
  assert.equal(input.profile.mobile, "");
  assert.equal(input.updatesConsent, false);
  assert.deepEqual(validateSubmission(input), {});
});

test("Committee accepts enrolled external-university and postgraduate applicants", () => {
  const input = validSubmission();
  input.track = "COMMITTEE";
  input.opportunityId = "skillbuilders-web";
  Object.assign(input.profile, { university: "Other", otherUniversity: "Another University", programLevel: "postgraduate", year: "6+" });
  assert.deepEqual(validateSubmission(input), {});
});

test("submission rejects invalid academic values, incompatible opportunities and missing enrollment", () => {
  for (const [field, value] of [["year", "unexpected"], ["programLevel", "unexpected"]]) {
    const input = validSubmission();
    input.profile[field] = value;
    assert.ok(validateSubmission(input)[field]);
  }
  for (const opportunityId of ["skillbuilders-web", "not-a-role"]) {
    const input = validSubmission();
    input.opportunityId = opportunityId;
    assert.ok(validateSubmission(input).opportunityId);
  }
  const input = validSubmission();
  input.profile.enrolled = false;
  assert.ok(validateSubmission(input).enrolled);
  assert.ok(validateSubmission(input).eligibility);
});

test("each written question enforces its current minimum and maximum across Unicode separators", () => {
  const input = validSubmission();
  for (const question of questionsFor(input.opportunityId)) {
    for (const count of [question.min, question.max]) {
      input.answers[question.id] = Array(count).fill("学习").join("\u00a0\u2003\u2028");
      assert.equal(validateSubmission(input)[question.id], undefined);
    }
    for (const count of [question.min - 1, question.max + 1]) {
      input.answers[question.id] = Array(count).fill("learning").join(" ");
      assert.ok(validateSubmission(input)[question.id]);
    }
    input.answers[question.id] = validSubmission().answers[question.id];
  }
});

test("processing consent and accuracy are required independently of optional updates", () => {
  for (const field of ["processingConsent", "accuracy"]) {
    const input = validSubmission();
    input[field] = false;
    assert.ok(validateSubmission(input)[field]);
  }
  assert.ok(validateSubmission({ ...validSubmission(), verified: true }).form);
});

test("submission accepts formatted international phones and rejects invalid phones or unsafe evidence links", () => {
  const input = validSubmission();
  input.profile.mobile = "+63 (917) 123-4567";
  input.resumeUrl = "https://example.test/resume.pdf";
  input.portfolioUrl = "https://example.test/portfolio";
  assert.deepEqual(validateSubmission(input), {});
  input.profile.mobile = "please call";
  assert.ok(validateSubmission(input).mobile);
  for (const field of ["resumeUrl", "portfolioUrl"]) {
    for (const url of ["http://example.test", "javascript:alert(1)", "https://user:password@example.test"]) {
      input[field] = url;
      assert.ok(validateSubmission(input)[field]);
    }
  }
});
