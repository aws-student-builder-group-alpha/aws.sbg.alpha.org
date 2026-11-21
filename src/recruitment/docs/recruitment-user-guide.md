## Applying for more than one role

You can apply once for each role. Open My application and choose **Apply for another role**. Keep one draft at a time; the sidebar shows **Continue draft** until you submit it. Give processing consent for the new draft, complete its answers, and upload its enrollment proof.

Choose an application in the left sidebar to see its reference, status, notifications and submitted answers. On phones, the application cards appear above the receipt. Withdrawal closes only the selected application. You can still apply for other roles, but you cannot apply again for a withdrawn role.

# Alpha Recruitment: where to go and what to click

This guide covers recruitment only: applicants, Organization Heads/evaluators, System Admins, and membership IDs. It describes the current implementation; it is not a record that someone completed these actions on a deployed site.

The application tracks are **Core Team** and **Committee**, with sixteen opportunities. Membership IDs and existing-member invitations remain available, but there is no General Member application track.

## Quick navigation

- [Pages and accounts](#pages-and-accounts)
- [Applicant: start, save, submit, and track an application](#applicant-start-save-submit-and-track-an-application)
- [System Admin: sign in and add staff](#system-admin-sign-in-and-add-staff)
- [System Admin: assign an evaluator](#system-admin-assign-an-evaluator)
- [Organization Head: review an application](#organization-head-review-an-application)
- [System Admin: publish or amend a decision](#system-admin-publish-or-amend-a-decision)
- [Staff: send an interview or application message](#staff-send-an-interview-or-application-message)
- [System Admin: manage intake and export applications](#system-admin-manage-intake-and-export-applications)
- [System Admin: issue IDs and invite existing members](#system-admin-issue-ids-and-invite-existing-members)
- [Member: accept membership and download an ID](#member-accept-membership-and-download-an-id)
- [Status meanings and recovery](#status-meanings-and-recovery)

## Pages and accounts

Start the app with `npm run dev` from the repository root. Use **http://localhost:3000**, or the origin configured for your checkout.

| Where you want to go | Local page |
| --- | --- |
| Browse roles | [Opportunities](http://localhost:3000/recruitment/opportunities) |
| Edit an application | [Application editor](http://localhost:3000/recruitment/apply) |
| Resume a draft or check a submitted application | [My application](http://localhost:3000/recruitment/application) |
| Sign in as staff | [Staff sign-in](http://localhost:3000/recruitment/staff) |
| Administration overview | [Overview](http://localhost:3000/recruitment/admin) |
| Manage recruitment staff access | [Staff accounts](http://localhost:3000/recruitment/admin/staff) |
| Manage existing memberships and invitations | [Organization members](http://localhost:3000/recruitment/admin/members) |
| Inspect security activity | [Security activity](http://localhost:3000/recruitment/admin/activity) |
| Assign reviewers and publish results | [Applications](http://localhost:3000/recruitment/admin/applications) |
| Pause, resume, or close intake | [Intake](http://localhost:3000/recruitment/admin/intake) |
| Review assigned applications | [Organization Head workspace](http://localhost:3000/recruitment/reviewer) |
| Accept membership or download an ID | [Membership ID](http://localhost:3000/recruitment/membership) |

Recruitment administration is at `/recruitment/admin`. The root `/admin` is the Skillbuilder workspace and uses its own access rules.

Use the Google account approved for your role. Staff access is granted by an administrator, not selected during sign-in. Staff accounts, including former staff accounts, need a separate Google account if they also want to apply. When testing several roles, use separate browser profiles: tabs in one profile share the signed-in account.

On phones, open the navigation menu to find your account links. On desktop, signed-in links are in the account dropdown. The direct links above work without finding a menu item first.

## Applicant: start, save, submit, and track an application

### A. Choose a role and create a draft

1. Open [Opportunities](http://localhost:3000/recruitment/opportunities).
2. Click **Core Team** or **Committee**, or keep **All roles** selected. To search, enter a role, department, or specialization in **Search roles**, then click **Search**.
3. Click a role card or its **View role** area. Read the role details, eligibility, preparation checklist, and remaining places.
4. Click **Continue with Google** and choose your applicant Google account.
5. In the selected role's application panel or preparation screen, confirm the displayed account. Read the **privacy notice** and check **I have read the privacy notice and agree to recruitment processing.**
6. Click **Start application**.

**Expected result:** Your draft opens at **About you**. Signing in alone does not create a consented draft. If you already have one, use **Continue application** instead of starting another.

### B. Complete the four steps

1. **About you:** enter your full name, university/institution, degree/program, program level, and academic year. Complete any conditional fields shown. Preferred name and mobile number are optional. Check the current-enrollment declaration, then click **Continue**.
2. **Opportunity:** choose **Core Team** or **Committee**, then click the radio button for one role. Read its description and scenario. Click **Continue**.
3. **Your story:** complete the following, then click **Continue**:
   - Enter a required **Resume link (required)**. Use an HTTPS link that opens without signing in. For Google Drive, set sharing to **Anyone with the link → Viewer**, then test it in a private browser window.
   - Under **Proof of enrollment**, use the file picker to select your current registration form/COR or official enrollment certificate. It must show your name, school, and current academic term. Use PDF, JPG, or PNG, up to **3 MB**. Wait for **Uploaded** and your filename to appear inside the file control. Use **Replace file** to upload a replacement.
   - Add a **Portfolio link** if you have one; it is optional.
   - Tap the start and end dates on the calendar, or hold and drag across dates. Previous days are disabled. Choose daily start and end times between 7 AM and 10 PM in Philippine time. You can also enter dates directly and use the arrow keys in the calendar. If your draft already has weekdays saved, you can keep them or enter a date and time range to replace them.
   - Answer the three prompts: motivation/contribution, collaboration, and the selected role's scenario. Each response is required and allows up to **150 words**.
   - If a role change requires confirmation that you reviewed the scenario response, check that confirmation before continuing.
4. **Review:** inspect the supporting evidence and application summary. Use **Edit supporting evidence** or **Edit details** to correct information. Check the required accuracy/enrollment-document declaration. **Keep me informed about future community updates** is optional.

**Expected result:** Review shows your saved information and confirmed proof. **Core Team** requires a currently enrolled first- or second-year undergraduate. **Committee** accepts enrolled students across university year/program levels. Both tracks accept students from other universities.

### C. Save and return later

1. While editing, wait for the saved status beneath **Your application**.
2. Click **Save & exit**. Wait for **My application** to open.
3. When returning, open [My application](http://localhost:3000/recruitment/application) with the same account.
4. Click **Continue my draft**.

**Expected result:** Your latest acknowledged answers return. You can save an incomplete draft, including one without a resume. Draft saving remains available when intake is paused or outside its submission window.

If **Save & exit** cannot confirm a save, it keeps you in the editor. Read the message and use **Retry save**. Keep the tab open until the saved status confirms your changes.

### D. Submit and follow the result

1. Return to **Review** and check the final declarations.
2. Click **Submit application** while intake is accepting submissions.
3. Wait for an acknowledged application reference on **My application**.
4. Keep that reference. On later visits, open [My application](http://localhost:3000/recruitment/application) or use the account menu's **My application** link.
5. Read the status beside **Application reference**. Open **Status history** or **View submitted answers** for more detail.
6. In **Notifications**, click **Refresh** to check updates or **Mark as read** on an item. If staff has sent an interview scheduling link, click **Choose an interview schedule**.

**Expected result:** Submitted answers, links, and enrollment proof are locked. You can apply once for each role across both tracks. A full role may still be selected; acceptance remains subject to capacity.

### E. Withdraw only if you intend to leave the cycle

1. Open [My application](http://localhost:3000/recruitment/application).
2. Click **Withdraw application**.
3. Read the confirmation. Click **Back** to cancel, or **Confirm withdrawal** to proceed.

**Expected result:** The application becomes **Withdrawn**. Its reference and history remain. Withdrawal is final for this role. You can still apply for other roles.

## System Admin: sign in and add staff

### A. Enter administration

Staff sign-in uses a white card with an orange action over a navy background with orange and violet glows. Authenticator setup and access-recovery screens use the same design; the steps below are unchanged.

1. Open [Staff sign-in](http://localhost:3000/recruitment/staff).
2. Click **Continue with Google** and select your approved administrator account.
3. If this is your first authenticator setup, click **Set up authenticator**. Scan the QR code with an authenticator app or use its manual setup key. Enter the current six-digit **Authenticator code**, then click **Enable and continue**.
4. If an authenticator already exists, enter its current code and click **Verify and continue**.

**Expected result:** **Overview** opens. Click **Staff accounts** in the administration sidebar to manage access. If the page says **Staff access has not been added**, the project owner or an existing administrator must prepare your access. The first administrator is set up outside this user flow; do not repeat authenticator enrollment merely because you are signing in again.

Administrator pages use the navy sidebar instead of the website top navbar. Open your account at the sidebar bottom for **Membership ID**, **Back to website**, or **Sign out**. On smaller screens, click **Admin sections** to open the administration menu and account controls. Use **Back to applications** to return from a record; use **Back to staff list** or the drawer close button to return from staff editing.

### B. Add an Organization Head/evaluator

1. Ask the evaluator to open [Staff sign-in](http://localhost:3000/recruitment/staff) and sign in with Google once. They may initially see **Staff access has not been added**.
2. In your administrator session, open [Staff accounts](http://localhost:3000/recruitment/admin/staff).
3. Click **Add staff**.
4. Enter their exact **Google account email**.
5. In **Role**, choose **Evaluator**. This is the Organization Head role used in the reviewer workspace.
6. Enter **Reason for this change**.
7. Click **Review access change**, check the account and role, then click **Confirm access change**.
8. Ask the evaluator to reopen Staff using the same account.

**Expected result:** The evaluator can open their workspace. This grants access; it does not send an email invitation. To add another System Admin, choose **Administrator** instead; that user must also complete authenticator verification.

### C. Change or suspend staff access

1. On **Staff accounts**, click the staff member's email.
2. Choose the available action under **Access change**, such as **Change role**, **Suspend access**, or **Revoke access**. For a suspended/revoked account, use the available reactivation/restoration action.
3. Enter the reason, click **Review access change**, then **Confirm access change**.
4. Open **Access history** to inspect recorded changes.

**Expected result:** The acknowledged access change takes effect. Ordinary controls prevent self-changes and removal of the last active administrator.

## System Admin: assign an evaluator

1. Open [Applications](http://localhost:3000/recruitment/admin/applications), or click **Applications** in recruitment navigation.
2. Search by applicant name, email, or reference and click **Search**. For more options, click **Filters**, select your criteria, then **Apply filters**.
3. Click an applicant's name/reference entry in the results list. Drafts are not included in this queue.
4. Open the **Application** tab to read the submission.
5. Click **Review & decision**.
6. Under **Evaluator assignment**, choose an active account from **Evaluator**.
7. Add an assignment reason if useful. A reason is required when changing an existing evaluator.
8. Click **Review evaluator assignment**, check the confirmation, then **Confirm assignment**.

**Expected result:** The applicant becomes **Under Review** and appears in the chosen evaluator's workspace. Only one evaluator is assigned at a time. Reassignment requires a fresh saved recommendation from the new assignment.

Tip: open **Filters**, choose **Unassigned**, **Awaiting recommendation**, or **Ready for decision**, then click **Apply filters**. Click **Back to applications** to return from an open administrator record on a narrow screen.

## Organization Head: review an application

1. Open [Staff sign-in](http://localhost:3000/recruitment/staff), click **Continue with Google** if needed, and use your approved evaluator account.
2. Open the [Organization Head workspace](http://localhost:3000/recruitment/reviewer). An active evaluator is normally sent here after Staff sign-in.
3. Click an assigned applicant's name/reference in the list. Use **Search applications → Search** if needed.
4. Open **Application** and read the submitted details, responses, and evidence links.
5. Under **Applicant communication**, click **Download proof of enrollment** to inspect the uploaded proof. Uploading a file does not itself verify that the student is enrolled.
6. Click the **Recommendation** tab.
7. In **Recommendation**, select **Accepted**, **Waitlisted**, or **Not Selected**.
8. Add **Private notes (optional)** when needed.
9. Click **Save recommendation** and wait for the **Saved recommendation** section to show the saved result.
10. Click **Review next application** if available, or **Back to list** and choose another assigned applicant. **Previous reviews** shows earlier saved reviews available to your assignment.

**Expected result:** Your recommendation is saved privately for administrator review. It does not publish the applicant's outcome. Applicants cannot see your identity, recommendation, or notes. Published applications are read-only; withdrawn applications are no longer available to the evaluator.

## System Admin: publish or amend a decision

### A. Publish the first outcome

1. Open [Applications](http://localhost:3000/recruitment/admin/applications).
2. Find and click the applicant. To narrow the queue to ready records, open **Filters**, choose **Ready for decision**, then click **Apply filters**.
3. Click **Review & decision**.
4. Check the saved recommendation and the number of accepted places filled.
5. In **Outcome to publish**, select **Accepted**, **Waitlisted**, or **Not Selected**.
6. Click **Review publication**.
7. Check the applicant/reference and chosen result, then click **Publish outcome**.

**Expected result:** The result appears in the applicant portal and status history. The administrator's outcome can differ from the recommendation. Acceptance cannot exceed the role's capacity. Publication requires a saved recommendation from the current assignment and makes assignments/recommendations read-only.

### B. Amend a published outcome

1. Reopen the applicant's **Review & decision** tab.
2. Choose a different **New outcome** and enter the required private reason for the amendment.
3. Click **Review outcome amendment**, check the confirmation, then **Confirm amendment**.
4. Open **History** to inspect review/assignment and decision records.

**Expected result:** History retains the earlier outcome and records the amendment. Acceptance still checks capacity. Releasing a place does not automatically promote someone from the waitlist. Moving a linked accepted application to another outcome revokes its linked membership; reactivation is explicit.

## Staff: send an interview or application message

**Who:** System Admins and currently authorized assigned evaluators, using their application workspace.

1. Open the applicant in **Applications** or the Organization Head workspace.
2. Scroll to **Applicant communication**.
3. Choose **Email type**. **Interview invitation** is available while Under Review; acceptance/non-selection messages require the matching published outcome.
4. Review or edit **Subject** and **Message**.
5. For an interview, enter the **Calendly scheduling link** supplied by your team.
6. Click **Review and send email**.
7. Read the browser confirmation containing the recipient, message, and link. Confirm with **OK** to send, or **Cancel** to stop.
8. Inspect the result and **Recent email activity**. Click **Refresh delivery history** when needed.

**Expected result:** The application records the message request and the applicant receives an in-app notification when the send flow confirms it. A reported Gmail acceptance is not proof of inbox arrival. If email is not connected, sending remains disabled. An uncertain request offers **Check same email request**; do not create repeated messages while delivery is unresolved. The app does not automatically send an email merely because you publish an outcome.

## System Admin: manage intake and export applications

### A. Pause, resume, or close intake

1. Open [Intake](http://localhost:3000/recruitment/admin/intake).
2. Check the displayed submission availability and schedule.
3. Under **Intake change**, choose an available action: **Pause intake**, **Resume intake**, or **Close intake permanently**.
4. Enter **Private reason (required)**.
5. Click **Review intake change**, read the consequences, then **Confirm intake change**.

**Expected result:** Pausing blocks new submissions while applicants can keep saving drafts. Resume respects the configured opening/deadline and does not change dates. Permanent closure cannot be reopened through the app. Reviewing, publishing decisions, and withdrawal remain available independently of intake.

### B. Export applications

1. Open [Applications](http://localhost:3000/recruitment/admin/applications).
2. Use **Search** or **Filters → Apply filters** to select the records you need. To export all submitted applications, use **Clear all** when a search or filter is active.
3. Check the matching count. Changing a field without applying it does not change the export scope.
4. Choose **More actions → Export CSV** and wait for the download to start. **Cancel export** is available below the toolbar during preparation.

**Expected result:** The CSV includes all matching pages, not just visible rows. It includes submitted applications, including Withdrawn when matched, but excludes drafts, evidence links, and private evaluator/admin notes. No matches means export is unavailable.

## System Admin: issue IDs and invite existing members

### A. Issue an ID for an accepted applicant

1. In [Applications](http://localhost:3000/recruitment/admin/applications), open the applicant whose published status is **Accepted**.
2. Scroll below **Applicant communication** to **Membership ID**.
3. Click **Issue membership ID**.
4. Check **Verified Google email**, **Member name**, **Position**, and **Date joined**. Enter **Private reason**.
5. Click **Review and add member**. Check the browser confirmation, then click **OK**.
6. Wait for **Membership saved. ID:** and share the [Membership ID page](http://localhost:3000/recruitment/membership) with the applicant.

**Expected result:** The accepted applicant has an active ID record and can complete their card. Publishing acceptance alone does not issue the ID.

### B. Invite someone who is already an Alpha member

1. Open [Organization members](http://localhost:3000/recruitment/admin/members) and use **Membership tools**.
2. Click **Add existing member**.
3. Enter their intended **Verified Google email**, **Member name**, **Position**, **Date joined**, and **Private reason**. They do not need to have signed in before you save the invitation.
4. Click **Review and add member**, check the browser confirmation, then **OK**.
5. Wait for the invitation-saved message. This creates a pending invitation, not an immediately issued ID.
6. Share the [Membership ID page](http://localhost:3000/recruitment/membership). If email is configured, find the pending invitation in **Member invitations**, click **Send invitation email**, and confirm the recipient with **OK**.
7. To withdraw a pending invitation, use **Member invitations → Cancel invitation** and confirm.

**Expected result:** The invited person must sign in with the invited Google account and accept membership before an ID is issued. They do not complete a recruitment application. Saving an invitation does not automatically email it.

### C. Update or revoke an existing membership

1. On **Organization members**, or the accepted applicant's **Membership ID** section, click **Update or revoke membership**.
2. Enter the registered email and correct name, position, and joining date.
3. Choose **Active** or **Revoke membership** under **Membership access**, and enter the private reason.
4. Click **Review membership change**, check the browser confirmation, then **OK**.

**Expected result:** An acknowledged update keeps the same membership ID. Revocation removes active membership-card access. Membership does not grant a recruitment staff role; staff access is managed separately.

## Member: accept membership and download an ID

### A. Accept an existing-member invitation

1. Open [Membership ID](http://localhost:3000/recruitment/membership).
2. Click **Continue with Google** if asked, and select the exact account Alpha invited. Use **Switch account** if necessary.
3. Under **You're invited**, check your name, position, and joining date.
4. Click **Accept membership**, read the browser confirmation, then **OK**.

**Expected result:** Your active membership card opens. If you already have an issued active ID, skip acceptance and complete your card. If the page says **No ID linked yet**, check the account and click **Check again**, or ask a System Admin to review the invitation/issuance.

### B. Complete and download the card

1. On **Membership ID**, find **Card details** and open **Complete your card**. If a portrait already exists, click **Edit card details** instead.
2. Check or update **Full name**.
3. Use **Portrait** to select a JPG or PNG up to **2 MB**. A portrait is required before the first download.
4. Check **I agree to use this photo on my Alpha membership ID.**
5. Click **Save details** and wait for confirmation and the rendered preview.
6. Click **Download ID** when enabled.

**Expected result:** A PNG downloads with the same card shown in the preview. Position and joining date must be corrected by a System Admin. **Find ID** only looks up IDs linked to your own account.

## Status meanings and recovery

| Status | Meaning / next action |
| --- | --- |
| Draft | Continue editing and submit when intake accepts submissions. |
| Submitted | The application was acknowledged; wait for assignment. |
| Under Review | A reviewer is assigned. Check notifications for any staff instructions. |
| Accepted | The administrator published acceptance. Wait for explicit membership issuance if applicable. |
| Waitlisted | The administrator published a waitlist outcome. Promotion is not automatic. |
| Not Selected | The administrator published non-selection. |
| Withdrawn | The applicant permanently withdrew from this role; other roles remain available. |

| What you see | What to do |
| --- | --- |
| A required field error | Correct the highlighted field, then click Continue or Submit application again. |
| Draft save failed | Keep your answers open, read the message, and use Retry save. |
| Upload failed | Read the upload message. A failed replacement retains the last confirmed document; use Reload saved document to recheck it. |
| Saving/submission/decision could not be confirmed | Use the displayed check-latest or same-request retry controls. Do not assume the server rolled back, or start a replacement application. |
| Use the application from its original website | Return to the app origin where you signed in. Copy any unsaved text before leaving the tab. |
| Staff access has not been added | Give the exact signed-in Google email to a System Admin. Signing in does not grant staff access. |
| No active assignments | Ask an administrator to assign the application, then refresh the reviewer workspace. |
| Submit application is disabled | Check intake availability and resolve any pending operation. Drafts can still be saved during a pause. |
| No ID linked yet | Check the Google account, click Check again, or ask an administrator to invite the account or issue its membership. |
| Email sending is disabled | Save/share invitations through their supported link flow, or ask the owner to configure email. Do not describe an unsent message as delivered. |

For setup and troubleshooting beyond normal user actions, use the [recruitment README](../README.md). The [manual testing flow](manual-testing-flow.md) is the separate QA guide; [progress tracker](progress-tracker.md) records what was actually verified.
