"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Callout, PageHeading } from "./ui";
import { fetchJson } from "@/lib/http-request";
import { record } from "@/lib/drafts";

const VerifiedAccess = createContext(true);
export function useVerifiedAccess() { return useContext(VerifiedAccess); }

/** Polls only own access; protected operations still authorize independently. */
export function AccessGuard({ accountId, expected, children, blockedContent }: {
  accountId: string; expected: "applicant" | "administrator" | "administrator-mfa" | "evaluator"; children: ReactNode;
  blockedContent?: ReactNode;
}) {
  const [state, setState] = useState<"allowed" | "blocked" | "unavailable">("allowed");
  useEffect(() => {
    let active = true, pending = false;
    const controller = new AbortController();
    const check = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const { response, data: access } = await fetchJson("/api/access", { signal: controller.signal });
        if (!response.ok || !record(access) || typeof access.kind !== "string") throw new Error("Access check unavailable");
        if (!active) return;
        if (["unavailable", "unconfigured"].includes(access.kind)) setState("unavailable");
        else {
          const role = expected === "administrator-mfa" ? "administrator" : expected;
          const allowed = access.accountId === accountId && (expected === "applicant" ? access.kind === "applicant" : access.kind === "staff" && access.status === "active" && access.role === role && (expected !== "administrator" || access.needsMfa === false));
          setState(allowed ? "allowed" : "blocked");
        }
      } catch { if (active) setState("unavailable"); }
      finally { pending = false; }
    };
    const timer = setInterval(() => void check(), 30000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    void check();
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", check); document.removeEventListener("visibilitychange", check); };
  }, [accountId, expected]);
  if (state === "blocked") return blockedContent ?? <main id="main-content" className="container portal narrow"><PageHeading title="Your access has changed" description="This workspace has been cleared. Sign in with the correct account or check your staff access." /><Link href="/staff" className="button button-orange">Check staff access</Link><p><Link href="/apply">Applicant sign-in</Link></p></main>;
  // Applicant edits survive connection failures; staff data is hidden until reverified.
  const hidden = state === "unavailable" && expected !== "applicant";
  return <VerifiedAccess value={!hidden}>
    {state === "unavailable" && <div className="container portal narrow"><Callout tone="warning"><p role="alert">{hidden ? "Staff access could not be verified. The workspace is hidden while your connection is checked; your unfinished change is preserved." : "Access could not be rechecked. Your unsaved input is still here; saving will verify your account again."}</p>{hidden && <button type="button" className="button button-secondary" onClick={() => window.dispatchEvent(new Event("focus"))}>Retry access check</button>}</Callout></div>}
    <div hidden={hidden} inert={hidden || undefined}>{children}</div>
  </VerifiedAccess>;
}
