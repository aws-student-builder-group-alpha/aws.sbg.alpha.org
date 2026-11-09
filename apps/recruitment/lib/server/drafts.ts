import "server-only";
import { draftFromRow } from "@/lib/drafts";
import { applicantSession } from "./session";
import { isApplicationState } from "@/lib/applications";

export async function loadApplicantDraft() {
  const session = await applicantSession();
  if (session.kind !== "authenticated") return session;
  try {
    const result = await session.client.rpc("get_application_state");
    if (result.error || !isApplicationState(result.data)) return { kind: "unavailable" } as const;
    const { application, intake } = result.data;
    if (application) return { kind: "ready", applicant: session.applicant, draft: null, application, intake } as const;
    const { data, error } = await session.client.from("applicant_drafts").select("id,data,status,version,updated_at").eq("owner_id", session.applicant.id).maybeSingle();
    if (error) return { kind: "unavailable" } as const;
    const draft = data ? draftFromRow(data, session.applicant.email) : null;
    if (data && !draft) return { kind: "unavailable" } as const;
    return { kind: "ready", applicant: session.applicant, draft, application: null, intake } as const;
  } catch {
    return { kind: "unavailable" } as const;
  }
}
