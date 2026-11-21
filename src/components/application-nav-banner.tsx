"use client";

import { useEffect, useState } from "react";
import { RECRUITMENT_URL } from "@/lib/recruitment";

const applicationPath = RECRUITMENT_URL + "/application";

export default function ApplicationNavBanner({ pathname, inert }: {
  pathname: string;
  inert?: boolean;
}) {
  const [applicant, setApplicant] = useState<{ name: string } | null>(null);
  const inApplication = pathname === applicationPath || pathname === RECRUITMENT_URL + "/apply";

  useEffect(() => {
    if (inApplication) return;
    let request: AbortController | undefined;

    async function refresh() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      let continuation: { name: string } | null = null;
      try {
        const response = await fetch(RECRUITMENT_URL + "/api/application/continuation", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json();
          if (result?.canContinue === true) {
            continuation = { name: typeof result.name === "string" ? result.name : "" };
          }
        }
      } catch {
        // Hide the application link when its status cannot be verified.
      }
      if (!controller.signal.aborted) setApplicant(continuation);
    }

    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      request?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [pathname, inApplication]);

  if (inApplication || !applicant) return null;

  return (
    <a className="alpha-recruiting-banner alpha-application-banner" href={applicationPath + "?resume=1"} inert={inert}>
      <span className="alpha-recruiting-dot" aria-hidden="true" />
      <strong className="alpha-application-banner-label">
        Continue your Application{applicant.name && <>, <bdi>{applicant.name}</bdi></>}
      </strong>
      <span className="alpha-recruiting-cta" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      </span>
    </a>
  );
}
