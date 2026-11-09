"use client";

import { useEffect, useRef, useState } from "react";
import { downloadApplicationExport } from "@/lib/application-export-client";
import type { ExportFailure } from "@/lib/application-export";
import type { QueueFilters } from "@/lib/application-queue";
import { useVerifiedAccess } from "./access-guard";
import { Callout } from "./ui";

export function ApplicationExportControl({ accountId, filters, disabled, onBusy, onDenied, compact = false }: {
  accountId: string; filters: QueueFilters; disabled: boolean; onBusy: (busy: boolean) => void; onDenied: (failure: ExportFailure) => void;
  compact?: boolean;
}) {
  const allowed = useVerifiedAccess();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "error">("success");
  const active = useRef(true), request = useRef<AbortController | null>(null), objectUrl = useRef<string | null>(null);
  const release = () => { if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; } };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; request.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); };
  }, []);
  useEffect(() => { if (!allowed) request.current?.abort(); }, [allowed]);
  async function download() {
    if (request.current || disabled || !allowed) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); onBusy(true); setNotice(""); release();
    try {
      const result = await downloadApplicationExport(accountId, { ...filters }, controller.signal);
      if (!active.current) return;
      if (result.ok && !controller.signal.aborted) {
        const url = URL.createObjectURL(result.blob); objectUrl.current = url;
        const link = document.createElement("a"); link.href = url; link.download = result.filename;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => { if (objectUrl.current === url) release(); }, 1000);
        setNoticeTone("success"); setNotice(`CSV download started for ${result.count} application${result.count === 1 ? "" : "s"}.`);
      } else if (!result.ok) {
        setNoticeTone(result.code === "CANCELLED" ? "warning" : "error"); setNotice(result.message);
        if (["AUTH_REQUIRED", "ACCOUNT_CHANGED", "MFA_REQUIRED", "DENIED"].includes(result.code)) onDenied(result);
      }
    } catch { if (active.current) { setNoticeTone("error"); setNotice("The CSV download could not start. Retry the export; your edits are preserved."); } }
    finally { if (active.current) { request.current = null; setBusy(false); onBusy(false); } }
  }
  return <section className="application-export" aria-label="Application CSV export" aria-busy={busy}>
    {!compact && <p>Export all applications matching the applied filters, across every page. Unapplied filter edits are excluded. The CSV contains applicant details and written answers.</p>}
    <div className="inline-actions"><button type="button" className="button button-secondary" disabled={disabled || busy || !allowed} onClick={() => void download()}>{busy ? "Preparing CSV..." : "Export CSV"}</button>{busy && <button type="button" className="text-button" onClick={() => request.current?.abort()}>Cancel export</button>}</div>
    {compact && <details className="export-help"><summary>Export details</summary><p>Exports every matching page using applied filters. Includes applicant details and written answers; excludes private reviews and evidence links.</p></details>}
    {notice && <Callout tone={noticeTone} title={noticeTone === "success" ? "Download started" : "Check your export"} role="status">{notice}</Callout>}
  </section>;
}
