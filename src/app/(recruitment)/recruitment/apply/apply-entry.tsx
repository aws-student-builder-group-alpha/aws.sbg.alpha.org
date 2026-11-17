import Link from "next/link";
import type { ReactNode } from "react";
import { ProcessShell } from "@/app/(recruitment)/recruitment/components/process-shell";
import { Icon } from "@/app/(recruitment)/recruitment/components/ui";

/** Shared entry and recovery frame for the application process. */
export function ApplyEntry({ children, appearance = "navy", preparation = false, introduction = false }: { children: ReactNode; appearance?: "navy" | "dark"; preparation?: boolean; introduction?: boolean }) {
  return <ProcessShell contentHeight appearance="navy">
    <main id="main-content" className={`apply-page apply-entry apply-step-entry${appearance === "dark" ? " apply-auth" : ""}${preparation ? " apply-preparation" : ""}${introduction ? " application-welcome" : ""}`}>
      <div className="apply-entry-card">{children}</div>
    </main>
  </ProcessShell>;
}

export function ApplyLoading() {
  return <ApplyEntry>
    <div className="apply-entry-main" role="status">
      <h1>Loading your application…</h1>
      <p className="apply-lead">Getting your latest details ready.</p>
      <div className="apply-loading-lines" aria-hidden="true"><span /><span /><span /></div>
    </div>
    <noscript><div className="apply-entry-notice">
      <p>Turn on JavaScript in your browser, then reload this page to continue. You can still read the <Link href="/recruitment/privacy">privacy notice</Link> or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p>
    </div></noscript>
  </ApplyEntry>;
}

export function ApplyAccessChanged() {
  return <ApplyEntry>
    <div className="apply-entry-main">
      <p className="apply-kicker">Account access</p>
      <h1>Your access has changed</h1>
      <p className="apply-lead">This workspace has been cleared. Sign in with the correct account or check your staff access.</p>
      <div className="apply-inline-actions"><Link href="/recruitment/apply" className="button button-orange">Applicant sign-in<Icon name="arrow" size={17} /></Link><Link href="/recruitment/staff" className="button button-secondary">Check staff access</Link></div>
    </div>
  </ApplyEntry>;
}
