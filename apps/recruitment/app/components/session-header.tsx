import { accountSession } from "@/lib/server/session";
import { SiteHeader } from "./ui";
import { memberEntry } from "@/lib/member-entry";

export async function SessionHeader() {
  const session = await accountSession();
  const member = session.kind === "applicant" && await memberEntry(session.client) === "membership";
  return <SiteHeader member={member} signedIn={session.kind === "applicant" || session.kind === "staff"} staff={session.kind === "staff" ? { role: session.membership.role, status: session.membership.status, needsMfa: session.needsMfa } : undefined} />;
}
