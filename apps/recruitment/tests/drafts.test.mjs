import test from "node:test";
import assert from "node:assert/strict";
import { emptyDraftInput, validateDraft, editableDraft, isSaveRequest, draftFromRow } from "../lib/drafts.ts";
import { DraftSaveQueue } from "../lib/draft-save-queue.ts";

const payload = () => ({ ...emptyDraftInput(), processingConsent: true });
const draft = () => ({ ...payload(), profile: { ...payload().profile, email: "applicant@example.test" }, id: crypto.randomUUID(), version: 1, savedAt: "2026-10-18T00:00:00Z", status: "Draft" });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("incomplete drafts do not require submission eligibility, word minimums, or accuracy", () => {
  assert.deepEqual(validateDraft(payload()), {});
  assert.ok(validateDraft(emptyDraftInput()).processingConsent);
  const input = payload(); input.answers.motivation = "Still thinking";
  assert.deepEqual(validateDraft(input), {});
});
test("draft validator rejects private/identity fields, malformed nested values, and storage overflow", () => {
  for (const changed of [{ ...payload(), owner_id: "someone" }, { ...payload(), status: "Accepted" }, { ...payload(), profile: { ...payload().profile, email: "other@example.test" } }, { ...payload(), answers: null }, { ...payload(), profile: { ...payload().profile, availability: ["Monday", "Monday"] } }]) assert.notDeepEqual(validateDraft(changed), {});
  const input = payload(); input.profile.fullName = "x".repeat(121); input.answers.scenario = "x".repeat(10001);
  assert.ok(validateDraft(input).fullName); assert.ok(validateDraft(input).scenario);
  input.answers.scenario = "😀".repeat(5000); input.answers.motivation = input.answers.scenario; input.answers.collaboration = input.answers.scenario; input.answers.pathway = input.answers.scenario;
  assert.ok(validateDraft(input).form);
});
test("evidence is optional HTTPS links and opportunities must belong to the chosen track", () => {
  for (const url of ["http://example.test", "javascript:alert(1)", "https://user:password@example.test", "invalid"]) assert.ok(validateDraft({ ...payload(), resumeUrl: url }).resumeUrl);
  assert.deepEqual(validateDraft({ ...payload(), resumeUrl: "https://example.test/resume.pdf", portfolioUrl: "https://example.test/" }), {});
  assert.ok(validateDraft({ ...payload(), track: "CORE_TEAM", opportunityId: "skillbuilders-web" }).opportunityId);
});
test("save requests have explicit revisions and operation IDs; serialized drafts exclude email and workflow metadata", () => {
  const value = draft(); const input = editableDraft(value);
  assert.equal("email" in input.profile, false); assert.equal("status" in input, false); assert.equal("id" in input, false);
  const request = { accountId: crypto.randomUUID(), payload: input, expectedVersion: 1, mutationId: crypto.randomUUID() };
  assert.equal(isSaveRequest(request), true);
  assert.equal(isSaveRequest({ ...request, expectedVersion: -1 }), false);
  assert.equal(isSaveRequest({ ...request, mutationId: "not-a-uuid" }), false);
  assert.equal(isSaveRequest({ ...request, status: "Accepted" }), false);
  assert.equal(draftFromRow({ data: input, id: value.id, status: "Draft", version: 1, updated_at: value.savedAt }, "server@example.test").profile.email, "server@example.test");
  assert.equal(draftFromRow({ data: input, status: "Accepted" }, "server@example.test"), null);
});
test("save queue serializes autosaves, coalesces typing, and preserves edits made during a save", async () => {
  const initial = draft(); const first = deferred(); const requests = [];
  const queue = new DraftSaveQueue("account-a", initial, async request => {
    requests.push(request);
    if (requests.length === 1) await first.promise;
    return { ok: true, draft: { ...initial, ...request.payload, profile: { ...request.payload.profile, email: initial.profile.email }, version: request.expectedVersion + 1, savedAt: "2026-10-18T01:00:00Z" } };
  });
  queue.patch({ answers: { ...initial.answers, motivation: "first edit" } });
  const save = queue.save();
  queue.patch({ answers: { ...initial.answers, motivation: "second edit" } });
  const sameSave = queue.save(); assert.equal(save, sameSave); assert.equal(requests.length, 1);
  assert.equal(queue.getSnapshot().phase, "saving");
  first.resolve(); assert.equal(await save, true);
  assert.equal(requests.length, 2); assert.equal(requests[1].expectedVersion, 2);
  assert.equal(requests[1].payload.answers.motivation, "second edit");
  assert.equal(queue.getSnapshot().draft.answers.motivation, "second edit");
  assert.equal(queue.getSnapshot().phase, "saved");
});
test("uncertain network writes retry the same operation before saving newer edits", async () => {
  const initial = draft(); const requests = [];
  const queue = new DraftSaveQueue("account-a", initial, async request => {
    requests.push(request);
    if (requests.length === 1) throw new Error("connection lost after commit");
    return { ok: true, draft: { ...initial, version: request.expectedVersion + 1 } };
  });
  queue.patch({ resumeUrl: "https://example.test/resume" });
  assert.equal(await queue.save(), false);
  queue.patch({ portfolioUrl: "https://example.test/portfolio" });
  assert.equal(await queue.save(), true);
  assert.equal(requests[0].mutationId, requests[1].mutationId);
  assert.notEqual(requests[1].mutationId, requests[2].mutationId);
  assert.equal(requests[2].expectedVersion, 2);
  assert.equal(queue.getSnapshot().draft.portfolioUrl, "https://example.test/portfolio");
});
test("conflicts preserve local answers and remain blocked while editing", async () => {
  const initial = draft();
  const queue = new DraftSaveQueue("account-a", initial, async () => ({ ok: false, code: "CONFLICT", message: "Saved elsewhere" }));
  queue.patch({ answers: { ...initial.answers, motivation: "My unsaved response" } });
  assert.equal(await queue.save(), false);
  queue.patch({ stage: 3 });
  assert.equal(queue.getSnapshot().phase, "error");
  assert.equal(queue.getSnapshot().draft.answers.motivation, "My unsaved response");
  assert.equal(queue.getSnapshot().draft.version, 1);
});

test("submission freeze drains the final save and ignores edits until released", async () => {
  const initial = draft(), saving = deferred(), requests = [];
  const queue = new DraftSaveQueue("account-a", initial, async request => {
    requests.push(request); await saving.promise;
    return { ok: true, draft: { ...initial, version: request.expectedVersion + 1 } };
  });
  queue.patch({ resumeUrl: "https://example.test/final" });
  const flush = queue.save();
  queue.freeze();
  queue.patch({ resumeUrl: "https://example.test/late" });
  saving.resolve();
  assert.equal(await flush, true);
  assert.equal(queue.getSnapshot().draft.version, 2);
  assert.equal(queue.getSnapshot().draft.resumeUrl, "https://example.test/final");
  assert.equal(requests.length, 1);
  queue.unfreeze(); queue.patch({ stage: 4 });
  assert.equal(queue.getSnapshot().phase, "dirty");
});
