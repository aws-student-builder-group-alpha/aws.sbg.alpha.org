import "server-only";
import { draftFromRow } from "@/recruitment/lib/drafts";
import { applicantSession } from "./session";
import { applicationsIn, isApplicationState } from "@/recruitment/lib/applications";
import { memberEntry } from "@/recruitment/lib/member-entry";

export async function loadApplicantDraft() {
  const session = await applicantSession();
  if (session.kind !== "authenticated") return session;
  try {
    const result = await session.client.rpc("get_application_state");
    if (result.error || !isApplicationState(result.data)) return { kind: "unavailable" } as const;
    const { application, intake } = result.data;
    const applications = applicationsIn(result.data);
    const entry = applications.length ? "application" : await memberEntry(session.client);
    if (!applications.length && entry === "membership") return { kind: "member" } as const;
    if (entry === "unavailable") return { kind: "unavailable" } as const;
    const { data, error } = await session.client.from("applicant_drafts").select("id,data,status,version,updated_at").eq("owner_id", session.applicant.id).maybeSingle();
    if (error) return { kind: "unavailable" } as const;
    const draft = data ? draftFromRow(data, session.applicant.email) : null;
    if (data && !draft) return { kind: "unavailable" } as const;
    const draftSubmitted = result.data.applications === undefined ? !!application
      : !!draft && applications.some(item => item.sourceDraftVersion === draft.version);
    return { kind: "ready", applicant: session.applicant, draft: draftSubmitted ? null : draft, previousDraft: draft, application, applications, intake } as const;
  } catch {
    return { kind: "unavailable" } as const;
  }
}
