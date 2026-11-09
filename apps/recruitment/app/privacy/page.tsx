import Link from "next/link";
import { PageHeading } from "@/app/components/ui";

export default function PrivacyPage() {
  return (
    <main id="main-content" className="container portal narrow privacy-page">
      <PageHeading
        title="Privacy notice"
        description="Understand the information in your application, how it supports recruitment, and how to contact Alpha."
      />
      <article className="panel prose">
        <h2>Information in your application</h2>
        <p>
          Google sign-in creates an authentication account before recruitment processing consent. It provides your account identity, verified email address,
          and name. Your application email follows that account and cannot be
          edited in the form. The application asks for academic details,
          a chosen opportunity, availability, and written answers. Earlier drafts
          and applications may also contain experience and additional responses.
          A resume link and an uploaded proof of current enrollment are required for new submissions. The enrollment document is private to you and authorized recruitment staff. A mobile number and portfolio link are optional. These details help
          the recruitment team understand your eligibility, interests, and
          potential contribution to Alpha.
        </p>
        <h2>Your choices</h2>
        <p>
          Recruitment processing consent is required to continue. Community
          updates are a separate, optional choice and do not affect your
          application. You can review and edit your saved draft, then submit
          during 1–30 November 2026, Philippine time. Submission locks your answers.
          You can withdraw your application; withdrawal is final and does not
          allow another submission for this cycle. Assignment changes your public
          status to Under Review. An administrator can publish Accepted, Waitlisted,
          or Not Selected to your portal. Later amendments preserve earlier outcomes.
        </p>
        <h2>Your application workspace</h2>
        <p>
          Your portal shows your own draft or submitted answers, application reference,
          public status, and status history. Access is linked
          to your signed-in account. Staff accounts, including suspended and
          revoked staff accounts, use separate access and cannot open applicant
          workflows. Earlier records remain stored. Recommendations and private
          evaluation notes are not included in your portal or public history.
        </p>
        <h2>Staff access information</h2>
        <p>
          Staff management records an account’s verified email, administrator
          or evaluator role, access state, and access changes. Each change has
          a reason, actor, time, and previous and new access. Only administrators
          who complete authenticator verification can manage staff or read this
          history. Evaluators cannot browse staff accounts or applicant drafts.
        </p>
        <h2>Intake administration</h2>
        <p>
          Pausing, resuming, or closing recruitment records the administrator,
          time, previous and new state, and required private reason. Only
          administrators who complete authenticator verification can read this
          history. Applicants see submission availability without private reasons.
          An automated deletion schedule for intake history has not been implemented.
        </p>
        <h2>Application evaluation</h2>
        <p>
          Authenticator-verified administrators can read submitted applications and
          assign an active evaluator. Only the current assigned evaluator can read
          the application through the evaluator workspace. They can save and revise
          a recommendation with optional private notes. Administrators retain assignment
          reasons and review revisions. After reassignment, the new evaluator can read
          each earlier assignment’s latest saved recommendation and notes, and must
          save their own recommendation. The previous evaluator loses access. Withdrawal
          ends evaluator access and further review changes; administrators retain the
          records for accountability. Administrators publish outcomes independently of
          recommendations and record private reasons for amendments. Active assigned
          evaluators keep read-only access after publication; reviews cannot be edited.
          Your portal shows the outcome and time, without private reasons or evaluator details.
          Withdrawal ends evaluator access, releases an accepted place, and does not
          automatically promote another applicant. Recommendations do not automatically publish outcomes.
        </p>
        <p>
          Supabase Auth manages administrator authenticator factors. Setup keys
          and codes are not stored in recruitment records or browser storage.
          Contact the project owner for lost-authenticator recovery. Staff
          access history remains available for accountability; an automated
          deletion schedule for this history has not been implemented.
        </p>
        <h2>Saving and sign-in</h2>
        <p>
          After you agree to recruitment processing, your draft is stored in
          the recruitment database hosted by Supabase. A confirmed save can be
          resumed after reloading or signing in again. Unsaved changes remain
          in the current page only; wait for the saved confirmation before
          leaving. Session cookies keep you signed in. Application answers are
          not stored in local storage or IndexedDB.
        </p>
        <h2>Application exports</h2>
        <p>
          Administrators who complete authenticator verification can download
          CSV files of submitted applications matching their applied filters.
          These files include applicant details, written answers, public status
          and times, and consent choices. Drafts, evidence links, evaluator
          identities, recommendations, private notes and administrative history
          are excluded. The app generates each download on demand and does not
          retain the file. Authorized staff must protect downloaded copies and
          apply the organization&apos;s retention and deletion requirements.
        </p>
        <h2>Evidence and communication</h2>
        <p>
          Only the evidence links you enter are stored. This application does
          not upload, fetch, embed, or scan linked documents. Keep access to
          those documents under your control. Authorized recruitment staff can send application updates, interview invitations with Calendly links and published decision emails from awslc.alpha@gmail.com. Your portal also shows in-app notifications. Delivery history records the message, recipient, staff actor, time and delivery state; unrelated applicants cannot access it.
        </p>
        <h2>Retention and requests</h2>
        <p>
          The planned release retention periods are 30 days after intake closes
          for inactive drafts and 180 days after recruitment finalization for
          submitted applications. Automated deletion and backup activation are
          deferred; prepared encrypted backup tooling is disabled. These planned
          retention periods are not enforced by an automated deletion schedule.
          Contact Alpha to request access,
          correction, consent withdrawal, or deletion of your information during
          this local verification stage.
        </p>
        <h2>Enrollment documents and membership IDs</h2>
        <p>Enrollment proof is stored privately and locked to your submitted application. Staff access follows current assignments and roles. If you become a member, a System Admin issues your membership ID, position and joining date. You can then provide your display name and a portrait for your downloadable Alpha ID. Portraits are cropped and image metadata is removed. ID lookup is limited to your signed-in account; there is no public directory. Membership, document-access and delivery events are recorded in a private security log. Automated deletion of these new records and files is not active; contact Alpha for a deletion request.</p>
        <h2>Site appearance</h2>
        <p>
          The site uses a fixed light appearance. It does not save an
          appearance preference in browser storage.
        </p>
        <h2>Questions for Alpha</h2>
        <p>
          Contact the chapter at{" "}
          <a href="mailto:awslc.alpha@gmail.com">awslc.alpha@gmail.com</a>.
          Visiting an external portfolio or the main website follows that
          website’s own privacy practices.
        </p>
        <Link href="/apply" className="button button-orange">
          Back to your application
        </Link>
      </article>
    </main>
  );
}
