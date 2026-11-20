import { StaffPageSkeleton, StaffWorkspaceIntro } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import type { ReactNode } from "react";
import Link from "next/link";
import { signIn, signOut } from "@/app/(recruitment)/recruitment/auth/actions";
import { Callout } from "@/app/(recruitment)/recruitment/components/ui";
import { GoogleSignInButton } from "@/app/(recruitment)/recruitment/components/process-shell";
import type { StaffStatus } from "@/recruitment/lib/staff";

export function StaffAuthPage({ children, title, description, wide = false, titleHidden = false }: {
  children: ReactNode; title: string; description?: string; wide?: boolean; titleHidden?: boolean;
}) {
  return <main id="main-content" className="container portal workspace-redesign workspace-auth staff-auth-page"><StaffWorkspaceIntro />
    <section className={`panel workspace-auth-content staff-auth-card${wide ? " staff-auth-card-wide" : ""}`}>
      <p className="staff-auth-eyebrow">Alpha recruitment</p>
      <h1 className={titleHidden ? "sr-only" : undefined}>{title}</h1>
      {description && <p className="staff-auth-description">{description}</p>}
      {children}
    </section>
  </main>;
}

export function StaffAccessView({ kind, email, status, authError = false }: {
  kind: "anonymous" | "applicant" | "staff" | "unavailable" | "unconfigured" | "loading";
  email?: string; status?: StaffStatus; authError?: boolean;
}) {
  if (kind === "loading") return <StaffPageSkeleton />;
  const unavailable = kind === "unavailable" || kind === "unconfigured";
  const title = unavailable ? "Staff access is unavailable" : kind === "applicant" ? "Staff access has not been added" : kind === "staff" ? `Staff access is ${status}` : "Staff sign-in";
  const description = unavailable ? "Your access could not be verified. Reload or contact the Alpha project owner." : kind === "anonymous" ? "Use the Google account approved for your recruitment role." : kind === "applicant" ? "Ask an administrator to add this Google account. Use a separate account if you also want to apply." : "This account cannot open staff or applicant workspaces. Contact an administrator to review your access.";
  return <StaffAuthPage title={title} description={description}>
    {email && <p className="workspace-account">Signed in as <strong>{email}</strong></p>}
    {authError && <Callout tone="error" title="Sign-in needs attention" role="alert">Sign-in was cancelled or could not be completed. Please try again.</Callout>}
    {kind === "anonymous" ? <form action={signIn}><input type="hidden" name="destination" value="staff" /><GoogleSignInButton /></form>
      : unavailable ? <form action={signOut}><button type="submit" className="button button-secondary">Sign out of this browser</button></form>
      : <form action={signIn}><input type="hidden" name="destination" value="staff" /><button type="submit" className="button button-orange">Use another Google account</button></form>}
    <details className="workspace-help"><summary>About staff access</summary><p>Signing in creates an authentication account. Sign in once before an administrator can add your staff access. Administrators also verify an authenticator code. Use a separate account if you want to apply.</p></details>
    <p className="staff-auth-support"><Link href="/recruitment/privacy">Privacy notice</Link><span aria-hidden="true"> · </span><a href="mailto:awslc.alpha@gmail.com">Contact Alpha</a></p>
  </StaffAuthPage>;
}
