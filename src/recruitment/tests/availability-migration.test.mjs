import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applicationRuntime } from "./fixtures/application-runtime.mjs";
import { validSimplifiedSubmission } from "./fixtures/submission.mjs";

test("date-range save fails on the old database and persists after the atomic validator migration", async () => {
  const runtime = await applicationRuntime("https://application.example.test", { throughMigration: "20261121119999" });
  try {
    const payload = validSimplifiedSubmission();
    payload.profile.availability = {
      startDate: "2026-11-22", endDate: "2026-11-24", startTime: "09:00", endTime: "12:30",
    };
    payload.answers.motivation = "Keep this response with my availability.";
    const request = {
      action: "save",
      request: {
        accountId: runtime.identity.id, payload, expectedVersion: 0, mutationId: crypto.randomUUID(),
      },
    };
    assert.equal((await runtime.post(request)).status, 422);
    await runtime.db.exec(await readFile(new URL("../supabase/migrations/20261121120000_recruitment_availability_range.sql", import.meta.url), "utf8"));
    const saved = await runtime.post(request);
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.deepEqual(result.draft.profile.availability, payload.profile.availability);
    assert.equal(result.draft.answers.motivation, payload.answers.motivation);
    const retry = await runtime.post(request);
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).draft.version, result.draft.version);
    const stored = await runtime.db.query("select data from public.applicant_drafts where owner_id=$1", [runtime.identity.id]);
    assert.deepEqual(stored.rows[0].data.profile.availability, payload.profile.availability);
    assert.equal(stored.rows[0].data.answers.motivation, payload.answers.motivation);
  } finally {
    await runtime.db.close();
  }
});
