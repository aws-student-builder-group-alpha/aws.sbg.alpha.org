import { accountSession } from "@/lib/server/session";
import { SiteHeader } from "./ui";

export async function SessionHeader() {
  const session = await accountSession();
  return <SiteHeader signedIn={session.kind === "applicant" || session.kind === "staff"} staff={session.kind === "staff" ? { role: session.membership.role, status: session.membership.status, needsMfa: session.needsMfa } : undefined} />;
}
