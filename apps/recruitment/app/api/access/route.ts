import { NextResponse } from "next/server";
import { accountSession } from "@/lib/server/session";

export async function GET() {
  const session = await accountSession();
  const body = session.kind === "staff" ? {
    kind: "staff", accountId: session.identity.id, role: session.membership.role,
    status: session.membership.status, needsMfa: session.needsMfa,
  } : session.kind === "applicant" ? { kind: "applicant", accountId: session.identity.id } : { kind: session.kind };
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
