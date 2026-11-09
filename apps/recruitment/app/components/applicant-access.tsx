import { Callout, Icon } from "@/app/components/ui";
import Link from "next/link";
import { signIn } from "@/app/auth/actions";
import { PageHeading } from "./ui";
import { ApplyEntry } from "@/app/apply/apply-entry";
import { GoogleSignInButton } from "./process-shell";
import { ApplicationOpportunity } from "./application-introduction";
import { getOpportunity } from "@/lib/catalog";

export function ApplicantAccess({ kind, authError, opportunity, redesign = false, formEntry = false }: { kind: "anonymous" | "unconfigured" | "unavailable"; authError?: "sign-in" | "sign-out"; opportunity?: string; redesign?: boolean; formEntry?: boolean }) {
  if (formEntry) {
    const anonymous = kind === "anonymous";
    const selected = getOpportunity(opportunity || "");
    return <ApplyEntry appearance={anonymous ? "dark" : "navy"} introduction>
      <div className="apply-entry-main">
        <p className="application-card-label"><Icon name="sparkles" size={16} />Your place on the team</p>
        <h2>{anonymous ? "Start your application" : "Applications are not available right now"}</h2>
        <p className="apply-lead">{anonymous ? "Sign in to save your progress and come back when you’re ready." : "Please try again later or contact the Alpha team for help."}</p>
        {selected && <ApplicationOpportunity opportunity={selected} />}
        <div className="application-privacy-summary"><Icon name="shield" size={22} /><div><h3>Data privacy & your choices</h3><p>Google sign-in creates your authentication account. We ask for recruitment processing consent after sign-in and before creating a draft. Community updates are a separate, optional choice.</p><Link href="/privacy">Read the recruitment privacy notice<Icon name="arrow" size={15} /></Link></div></div>
        {authError && <Callout tone="error" title="Something needs attention" className="apply-entry-notice" role="alert">{authError === "sign-out" ? "Sign-out could not be fully confirmed. Reload this page to check your session before leaving a shared device." : "Sign-in was cancelled or could not be completed. Please try again."}</Callout>}
        {anonymous ? <>
          <form action={signIn} className="apply-sign-in"><input type="hidden" name="opportunity" value={opportunity || ""} /><GoogleSignInButton /></form>
          <p className="application-signin-note">Use a personal or university Google account. Your verified email stays read-only.</p>
        </> : <a className="apply-contact" href="mailto:awslc.alpha@gmail.com">Contact Alpha for help</a>}
        <div className="application-entry-facts">{!selected && <p><Icon name="people" size={17} />Core Team or Committee</p>}<p><Icon name="file" size={17} />Three answers · 150 words each</p><p><Icon name="clip" size={17} />HTTPS resume required</p></div>
      </div>
    </ApplyEntry>;
  }
  if (redesign) return <main id="main-content" className={`container portal workspace-redesign workspace-auth${kind === "anonymous" ? " workspace-anonymous" : ""}`}>
    <section className="panel workspace-auth-content">
      <h1>{kind === "anonymous" ? "My application" : "Applications are not available right now"}</h1>
      <p>{kind === "anonymous" ? "Check your application status or continue your draft." : "Please try again later or contact the Alpha team for help."}</p>
      {authError && <Callout tone="error" title="Something needs attention" role="alert">{authError === "sign-out" ? "Sign-out could not be fully confirmed. Reload this page to check your session before leaving a shared device." : "Sign-in was cancelled or could not be completed. Please try again."}</Callout>}
      {kind === "anonymous" && <form action={signIn}><input type="hidden" name="opportunity" value={opportunity || ""} /><GoogleSignInButton /></form>}
      <details className="workspace-help"><summary>Account and privacy help</summary><p>Signing in creates an authentication account. Your verified email stays read-only. Recruitment consent is required before creating a draft.</p><p>Read the <Link href="/privacy">privacy notice</Link> or <a href="mailto:awslc.alpha@gmail.com">contact Alpha</a>.</p></details>
    </section>
  </main>;
  const heading = <PageHeading title={kind === "anonymous" ? "Your next chapter starts here" : "Applications are not available right now"} description={kind === "anonymous" ? "Sign in with Google to save your application and return to it later." : "Please try again later or contact the Alpha team for help."} />;
  return <main id="main-content" className="container portal narrow">
    {heading}
    <section className="panel prose">
      {authError && <Callout tone="error" title="Something needs attention" role="alert">{authError === "sign-out" ? "Sign-out could not be fully confirmed. Reload this page to check your session before leaving a shared device." : "Sign-in was cancelled or could not be completed. Please try again."}</Callout>}
      {kind === "anonymous" && <><p>Use a personal or university Google account. Your signed-in email will be your read-only application email.</p><p>Signing in creates an authentication account. Read our <Link href="/privacy">privacy notice</Link> before continuing. You will give recruitment processing consent before creating a draft.</p><form action={signIn}><input type="hidden" name="opportunity" value={opportunity || ""} /><button type="submit" className="button button-orange">Continue with Google</button></form></>}
      <p><a href="mailto:awslc.alpha@gmail.com">Contact Alpha</a></p>
    </section>
  </main>;
}
