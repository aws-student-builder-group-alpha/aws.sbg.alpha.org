import { editableDraft } from "./drafts.ts";
import type { Draft, DraftInput, SaveRequest, SaveResult } from "./drafts.ts";

function fingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return "{" + entries.map(([key, item]) => `${JSON.stringify(key)}:${fingerprint(item)}`).join(",") + "}";
  }
  return JSON.stringify(value);
}
export type SaveState = { draft: Draft; phase: "saved" | "dirty" | "saving" | "error"; error: Extract<SaveResult, { ok: false }> | null };

/** Serializes manual/autosaves, coalesces edits, and retries uncertain writes with the same operation ID. */
export class DraftSaveQueue {
  private state: SaveState;
  private saved: string;
  private pending: SaveRequest | null = null;
  private inFlight: Promise<boolean> | null = null;
  private listeners = new Set<() => void>();
  private frozen = false;
  freeze = () => { this.frozen = true; };
  unfreeze = () => { this.frozen = false; };
  private accountId: string;
  private persist: (request: SaveRequest) => Promise<SaveResult>;
  constructor(accountId: string, draft: Draft, persist: (request: SaveRequest) => Promise<SaveResult>) {
    this.accountId = accountId;
    this.persist = persist;
    this.state = { draft, phase: "saved", error: null };
    this.saved = fingerprint(editableDraft(draft));
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(state: SaveState) { this.state = state; for (const listener of this.listeners) listener(); }
  patch = (patch: Partial<DraftInput>) => {
    if (this.frozen) return;
    const draft = { ...this.state.draft, ...patch, profile: patch.profile ? { ...patch.profile, email: this.state.draft.profile.email } : this.state.draft.profile };
    const keepError = this.state.error && this.state.error.code !== "VALIDATION";
    const phase = this.inFlight ? "saving" : keepError ? "error" : fingerprint(editableDraft(draft)) === this.saved ? "saved" : "dirty";
    this.emit({ draft, phase, error: keepError ? this.state.error : null });
  };
  save = (): Promise<boolean> => {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.drain().finally(() => { this.inFlight = null; });
    return this.inFlight;
  };
  private async drain() {
    while (this.pending || fingerprint(editableDraft(this.state.draft)) !== this.saved) {
      const request = this.pending || { accountId: this.accountId, payload: structuredClone(editableDraft(this.state.draft)), expectedVersion: this.state.draft.version, mutationId: crypto.randomUUID() };
      this.pending = request;
      this.emit({ ...this.state, phase: "saving", error: null });
      let result: SaveResult;
      try { result = await this.persist(request); }
      catch { result = { ok: false, code: "UNAVAILABLE", message: "Saving could not be confirmed. Your input is preserved; retry saving." }; }
      if (!result.ok) {
        if (result.code === "VALIDATION") this.pending = null;
        this.emit({ ...this.state, phase: "error", error: result });
        return false;
      }
      this.saved = fingerprint(request.payload);
      this.pending = null;
      const draft = { ...this.state.draft, version: result.draft.version, savedAt: result.draft.savedAt, profile: { ...this.state.draft.profile, email: result.draft.profile.email } };
      this.emit({ draft, phase: fingerprint(editableDraft(draft)) === this.saved ? "saved" : "saving", error: null });
    }
    return true;
  }
}
