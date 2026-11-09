import test from "node:test";
import assert from "node:assert/strict";
import { blockedDestination } from "../lib/application-progress.ts";
import { validateSubmission } from "../lib/applications.ts";
import { validateDraft } from "../lib/drafts.ts";
import { validSubmission } from "./fixtures/submission.mjs";

test("later invalid URLs cannot mask earlier required fields or story word limits", () => {
  const draft=validSubmission();draft.profile.fullName="";draft.resumeUrl="http://invalid.test";
  assert.ok(validateSubmission(draft).fullName);
  assert.equal(blockedDestination(draft,5).stage,1);
  draft.profile.fullName="Student";draft.answers.motivation="short";
  const blocked=blockedDestination(draft,5);
  assert.equal(blocked.stage,3);assert.equal(blocked.part,"motivation");
  assert.deepEqual(Object.keys(blocked.errors),["motivation"]);
});
test("Committee-eligible students can reach track selection; Review declarations do not gate entry", () => {
  const draft=validSubmission();draft.profile.year="3";
  assert.equal(blockedDestination(draft,2),null);
  assert.equal(blockedDestination(draft,3).stage,2);
  draft.track="COMMITTEE";draft.opportunityId="skillbuilders-web";draft.accuracy=false;
  assert.equal(blockedDestination(draft,5),null);
  assert.ok(validateSubmission(draft).accuracy);
});
test("blank resumes remain saveable but gate Review; any valid HTTPS host is accepted", () => {
  const draft=validSubmission();draft.resumeUrl="";
  assert.deepEqual(validateDraft(draft),{});assert.equal(blockedDestination(draft,5).stage,4);
  for(const url of ["https://drive.google.com/file/d/example/view","https://example.test/resume.pdf"]){draft.resumeUrl=url;assert.equal(blockedDestination(draft,5),null);}
});
