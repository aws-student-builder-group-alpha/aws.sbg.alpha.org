# Alpha Recruitment

Alpha recruitment connects enrolled university students with chapter leadership and contribution opportunities.

## Language

**System Admin**: The current UI label for the existing administrator permission role. Requires authenticator verification to manage staff, publish outcomes or issue memberships.

**Organization Head**: The current UI label for an evaluator. A head can review and communicate with current assigned applicants; final decisions remain administrator-controlled.

**Organization member**: A person with an active, staff-approved Alpha membership record. This is distinct from applicant or staff access. Members can maintain their name/photo and download an ID; staff control their position and joining date.

**Proof of enrollment**: A current registration form/COR or official enrollment certificate, uploaded privately and reviewed by authorized staff. An upload is not automatic proof of registrar authenticity.

**Recruitment cycle**: One application period with its own opportunities and published outcomes.
_Avoid_: Batch, season, campaign

The first production release supports one recruitment cycle. Workflows for additional cycles are out of scope; see the [scope and enduring decisions](docs/project-overview.md#scope-and-enduring-decisions).

**Applicant**: A student applying to an opportunity in a recruitment cycle.
_Avoid_: Candidate account, member

**Application**: One applicant's profile, selected opportunity, answers, declarations, and supporting evidence for a cycle.
_Avoid_: Registration, membership renewal

**Track**: One of the two recruitment pathways: Core Team or Committee.
_Avoid_: Department, specialization

**Department**: The organizational group associated with an opportunity, including SkillBuilders and BuildHer+ under Committee.
_Avoid_: Track

**Opportunity**: One valid combination of track, department, role, and, where applicable, specialization that a student can apply for.
_Avoid_: Independent role selection

**Specialization**: One technical focus within SkillBuilders: Cloud, AI/ML, or Web Development.
_Avoid_: Track, department

**Evaluator**: The one currently assigned person who recommends Accepted, Waitlisted, or Not Selected, with optional private notes. There is no numerical rubric.
_Avoid_: Decision maker, administrator

**Recommendation**: The current assignment's private assessment, required before an administrator can publish a decision. It is explicitly saved and can be revised while Under Review. Reassignment requires a fresh recommendation; previous assessments never satisfy the current assignment.
_Avoid_: Score, saved proposed outcome, public status

**Draft**: An applicant-owned, consented application that may be incomplete and can be saved and resumed. Submission copies its acknowledged revision into an immutable application; subsequent draft writes are blocked.
_Avoid_: Submitted application, browser-only sample

**Draft revision**: The database version used to reject stale saves. Retrying the latest committed operation with the same identifier and payload does not increment it again.
_Avoid_: Answer history, published revision

**Application reference**: The unique server-issued receipt for one immutable submission. It remains unchanged after withdrawal and retries.
_Avoid_: Draft ID, email receipt

**Withdrawal**: A final applicant action that retains submitted answers/reference and records a public Withdrawn event. It releases an accepted place, ends evaluator access, and does not permit another application or automatically promote a waitlisted applicant.
_Avoid_: Delete draft, resubmission

**Published decision**: Accepted, Waitlisted, or Not Selected released by an administrator after a current-assignment review and visible in the applicant portal. Publication freezes evaluation; amendments preserve earlier outcomes.
_Avoid_: Score, automatic selection

**Public status**: The application progress or outcome visible in the applicant's portal.
_Avoid_: Internal proposal

**Staff membership**: One verified Google account's administrator or evaluator role and access state. A current or former staff account stays separate from applicant workflows.
_Avoid_: Persona, applicant role, deployment-team membership

**Staff access state**: Active, Suspended, or Revoked. Suspended access can be reactivated; revoked access requires explicit restoration. These are staff permissions, not application statuses.
_Avoid_: Application outcome, account deletion

**Access history**: The private, immutable record of a staff access change, including actor, target, reason, time, and previous/new access.
_Avoid_: Applicant status history, evaluator notes

**Administrator verification**: A Supabase AAL2 session established through authenticator verification after Google sign-in. Google sign-in alone does not unlock administrator access.
_Avoid_: Verified email, Google account MFA setting

**Assignment generation**: A distinct evaluator assignment for one application. Switching evaluators, including switching back, starts a new generation and revokes the previous evaluator's access.
_Avoid_: Reusing a previous recommendation

**Previous review**: An earlier assignment's latest saved recommendation and notes, readable as context by the current evaluator. Older revisions and assignment reasons remain administrator-only.
_Avoid_: Editable peer review, public outcome

**Amendment**: An administrator's change from one published outcome to another, with a private required reason, preserved history, and capacity revalidation. It never reopens evaluation.
_Avoid_: Correction request, resubmission

**Capacity**: The fixed number of accepted places for one opportunity; occupied places are counted from current Accepted applications.
_Avoid_: Submission limit, automatic waitlist position

**Matching applications**: Submitted application records satisfying every applied search and queue filter. Totals/status counts include all matching pages and include Withdrawn by default.
_Avoid_: Page count, whole-cycle total when filters are active

- **Configured intake state:** Open, Paused or Closed. Effective acceptance also requires the fixed server-enforced November window. Open before opening is scheduled, not accepting.
- **Final intake closure:** An administrator action with a private recorded reason that prevents new submissions permanently through the app. It changes neither the deadline nor recruitment finalization; drafts and existing application workflows remain available.

- **Application CSV export:** An MFA-verified administrator download of every submitted application matching applied queue filters across all pages. It contains a fixed allowlist and excludes drafts, private review/audit data and evidence links. The app retains no generated file.
