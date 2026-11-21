"use client";

import { useEffect, useId, useRef, useState } from "react";
import { downloadApplicationExport } from "@/recruitment/lib/application-export-client";
import type { ExportFailure } from "@/recruitment/lib/application-export";
import type { QueueFilters } from "@/recruitment/lib/application-queue";
import { useVerifiedAccess } from "./access-guard";
import { Callout, Icon } from "./ui";

export function ApplicationExportControl({ accountId, filters, disabled, refreshing, onRefresh, onBusy, onDenied }: {
  accountId: string; filters: QueueFilters; disabled: boolean; onBusy: (busy: boolean) => void; onDenied: (failure: ExportFailure) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const allowed = useVerifiedAccess();
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "error">("success");
  const active = useRef(true), request = useRef<AbortController | null>(null), objectUrl = useRef<string | null>(null);
  const actionsId = useId();
  const actionsButton = useRef<HTMLButtonElement>(null);
  const actionsMenu = useRef<HTMLDivElement>(null);
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
  return <>
    <button ref={actionsButton} type="button" className="button button-secondary queue-more-trigger" popoverTarget={actionsId}>
      <Icon name="more" size={17} /> More actions
    </button>
    <div ref={actionsMenu} id={actionsId} className="queue-more-menu" popover="auto" role="group" aria-label="Application actions"
      onBeforeToggle={event => {
        if (event.newState !== "open" || !actionsButton.current) return;
        const bounds = actionsButton.current.getBoundingClientRect();
        const menu = event.currentTarget;
        const above = window.innerHeight - bounds.bottom < 210 && bounds.top > window.innerHeight - bounds.bottom;
        menu.style.right = `${Math.max(12, window.innerWidth - bounds.right)}px`;
        menu.style.top = above ? "auto" : `${bounds.bottom + 8}px`;
        menu.style.bottom = above ? `${window.innerHeight - bounds.top + 8}px` : "auto";
        menu.style.maxHeight = `${Math.max(0, (above ? bounds.top : window.innerHeight - bounds.bottom) - 20)}px`;
      }}>
      <button type="button" className="text-button" disabled={refreshing || busy} onClick={() => { actionsMenu.current?.hidePopover(); onRefresh(); }}>Refresh applications</button>
      <button type="button" className="text-button" disabled={disabled || busy || !allowed} aria-describedby={actionsId + "-help"}
        onClick={() => { actionsMenu.current?.hidePopover(); void download(); }}>Export CSV</button>
      <p id={actionsId + "-help"}>Exports all matching pages with applicant details and answers. Private reviews and evidence links are excluded.</p>
    </div>
    {(busy || notice) && <section className="application-export queue-export-feedback" aria-label="Application CSV export">
      {busy && <div className="inline-actions"><span role="status">Preparing CSV…</span><button type="button" className="text-button" onClick={() => request.current?.abort()}>Cancel export</button></div>}
      {notice && <Callout tone={noticeTone} title={noticeTone === "success" ? "Download started" : "Check your export"} role="status">{notice}</Callout>}
    </section>}
  </>;
}
