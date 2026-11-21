## Multiple application checks - 21 November 2026

Using synthetic applicant accounts, submit to one role, then start and submit to a second role. Confirm separate references, submitted answers, enrollment documents and notifications. Switch between both in the portal and refresh each receipt. Verify the desktop left sidebar and phone card list, keyboard focus and no page overflow. While a draft is open, Continue draft must resume it.

Attempt the first role again and confirm it is blocked. Withdraw only that application; the second must remain submitted and the first role must remain blocked. Check an exact old submission retry after starting the second draft, stale-tab save conflicts, and cross-account selected-application reads and withdrawals. Keep provider-session, synthetic SQL/HTTP and physical-device results separate.

# Manual testing flow

## Recruitment staff workspace

1. Sign in through `/recruitment/staff` as an active System Admin and complete MFA. Visit Overview, Applications, Intake, Staff accounts, Organization members and Security activity from the sidebar or mobile Admin sections dialog.
2. Compare Overview totals with the queue. Scroll the workspace on desktop and mobile and confirm navigation stays in view. Tab to the Admin workspace and verify that the keyboard can scroll it. On mobile Applications, scroll partway into the queue, open a record, then use **Back to applications** to verify the row regains focus and the prior scroll position returns. Open the account popover with the keyboard, verify navigation and workspace scroll stay in place, then press Escape and check that focus returns. Try the account popover in the drawer on a phone and a short desktop window. A failed read should show unavailable data.
3. Check the Filters drawer and queue views, assignment and decision edits, intake controls, membership invitations and the staff drawer. Verify that dirty inputs survive canceled navigation. Compare an empty application queue and a search with zero matches. Both show centered guidance. The no-results reset restores the full list. Loading and failed reads show their own feedback. On Security activity, click **Load latest activity**, then filter the loaded events by action and reference. Check the no-matches and empty-log panels and verify that filtering does not trigger a fresh read.
   In **Staff accounts**, search the directory and use **Clear search** after a query with no matches. On a phone, check that account, role, access and update time are visible in each card. Open an account, expand **Access history**, and verify **Back to staff list** restores focus to that account.
   In **Organization members**, verify the invitations table is visible below Membership tools. Check the four desktop columns and the labeled rows on phones. Confirm the empty and read-error states, and verify that refreshing invitations preserves an unfinished membership form.
4. Repeat Staff sign-in and evaluator checks with authorized test accounts. Confirm that recruitment access and the Skillbuilder `/admin` route follow their separate permissions. See the [recruitment user guide](recruitment-user-guide.md) for the interaction steps.

## Two-track removal retest - 16 November 2026

Confirm the main site has two joining cards, the directory has All roles/Core Team/Committee filters and sixteen roles, and the form/staff queue expose only the two supported tracks. Check 320/375/768/1440px, keyboard and reduced motion; both role colors, consent/Google handoff, search/back navigation, draft/upload recovery, capped vacancy counts, submission, review and CSV export must still work. Old track/role links must not restore a retired role. The deleted draft owner can start a new supported application; preserve their account and uploads. Membership ID, existing-member invitation acceptance and portrait/download remain available. Verify live zero retired drafts/applications/catalog entries and unchanged other records through counts/fingerprints, not personal data output. Keep real-provider testing distinct from synthetic checks.

## Draft and enrollment recovery retest - 16 November 2026

1. Restart npm run dev:combined after applying the gateway fix. Open http://localhost:4300/recruitment/apply with a supported query; confirm document navigation lands at the same path/query on http://127.0.0.1:4300. Use that canonical origin for Google/session testing. Keep APP_URL and the allowed callback aligned; standalone development follows its separately configured exact origin. Redirects do not transfer cookies or unsaved answers between hosts, so copy any unsaved text before leaving an existing alias tab.
2. With an authorized test account, change an answer, wait for acknowledged autosave, then Save & exit and resume; confirm the saved answer. Simulate an explicit 403 DENIED: the original-website instruction appears, the answer remains and Save & exit stays put. Restore transport and Retry save. Test an unacknowledged response separately; it must retain uncertain-write recovery and exact retry behavior.
3. In Your story choose a synthetic PDF/JPG/PNG within 3 MB. Confirm the acknowledged filename, private download bytes and proof readiness; reload the page and confirm persistence. Invalid bytes/types or oversized files must fail without replacing confirmed proof.
4. Delay the initial document read, upload successfully, then release an empty or failed read. The uploaded filename remains and Continue does not report missing proof. Repeat with a failed replacement: the previous confirmed document remains usable and Reload saved document recovers it.
5. Change account or leave the component while an upload response is held; release the old response and confirm it cannot set a document/readiness in the new account or departed page. Changing only the readiness callback during upload must not strand the disabled input. Repeat existing keyboard/mobile/Review and required-proof submission checks.

Automated coverage uses synthetic identities, actual multipart handlers and isolated SQL/Blob storage. It does not establish live Google/cookie behavior or hosted Storage delivery. Do not submit real applications or send messages as part of this regression without authorization.

## Role modal redesign retest - 14 November 2026

Open Core Team and Committee cards at 320/375/768/1440px. Check matching glossy headers, one role title, readable eligibility/description/preparation, accurate availability and one clear action panel. Test anonymous, new applicant, saved draft, submitted applicant, member, staff and unavailable/unconfigured access; existing destinations must remain exact. For a new applicant, submit without consent (no request), agree, simulate an unavailable response, retry and confirm the same role/request creates one draft. Pending creation disables close and Escape. Check long names/emails, unavailable/zero/capped counts, 200% text, short screens, scrolling and keyboard access through consent/privacy/recovery to Start. Escape/backdrop restores card focus and preserves filters/search. Compare default staff confirmation dialogs and standalone preparation to ensure their layout and guards remain intact.

## Uniform header retest - 14 November 2026

Compare the main and recruitment headers at 375/640/1024/1280/1440/1920px: logo/full text, gutters, row heights, typography and desktop breakpoint. Check transparent initial and frosted scrolled light/dark surfaces, hide on scroll-down/reveal on scroll-up, and visibility while focused. Repeat with reduced motion (no reveal/stagger/scroll animation), 200% text and short screens. In the full-screen mobile menu, Tab/Shift+Tab must stay inside; Escape/Close restores focus and body scrolling. In the desktop account dropdown, check verified display label, keyboard entry, outside/Escape dismissal and correct applicant/member/admin/head/MFA-pending/inactive staff actions. Pending session must not flash unauthorized actions. Verify all recruitment routes, retained-page transitions, Events to main /#events, unsaved sign-out cancellation, and focused form errors clear of the header. Main authentication, destinations and permissions stay separate.

## Whole-card opportunity retest - 14 November 2026

At /opportunities (or /recruitment/opportunities in combined preview), check the glossy opportunity cards at 320, 375, 768 and 1440px. Core Team must stay bronze, Committee purple in All roles, filtered and searched views, with readable white titles, light labels, gold availability, raised orange icons, a divided View role footer and a white page background. Check beveled edges and static gloss; hover adds a brief shine. Check one/two/three columns as appropriate, wrapped long titles, track badges and readable vacancy footers. Descriptions belong only in the modal. Click the icon, title, footer, arrow and blank padding; each opens the same role. Tab to a card, check its visible outline, press Enter, then Escape and confirm focus returns. Search/filter before opening; closing and browser Back must preserve that context. Verify full modal descriptions and exact Google role handoff. Hover should lift on a fine pointer and stay still without shine animation with reduced motion. Check numeric, zero and unavailable counts without inventing vacancies.

## Events navigation retest - 14 November 2026

Click Events in desktop/mobile navigation and footer links from the homepage, another main-site page, and recruitment. Confirm the destination is the main homepage /#events and the Events section is visible below navigation. Repeat by keyboard and with reduced motion. In standalone recruitment, verify the main-site origin; in combined preview, verify the root homepage rather than /recruitment/#events. Individual cards and direct /events access retain their behavior.


## November QA report retest

Use the feature preview with its matching forward migration installed in isolated staging. Do not replay historical migrations or use real applicant data. Report Pass/Fail/Blocked with the PDF page number.

1. Pages 1-2: check the full group heading, secondary motto, requested description, waves, photo pause and three Start your journey cards. Each Apply action must select its own category. Benefits use existing content.
2. Page 3: check alternating About photos/group wording, followed immediately by Testimonials.
3. Pages 3-5: check viewport Gallery, larger images, absent filters, SCD audience finale and white-wash/collage message. Pause/reverse scroll. Filter List, switch back and confirm Gallery includes all stories; original details/credits remain. Reduced motion stays readable.
4. Pages 5-7: check Available Roles, search/icons/individual cards and all two track filters. Reload and Back preserve URL state. Keyboard opens roles, Escape restores focus, and Google preserves the selected role.
5. Page 7: verify no draft before consent, then Start opens /apply. Existing drafts require explicit role switching and preserve answers; submitted users keep receipts, members keep IDs, staff cannot use staff identities to apply.
6. Pages 8-10: check larger text, required markers, no promotional hero/subheading, inset chevrons, required editable institution/suggestions, ordinal years and visible optional fields. Resume legacy Other/year data without loss.
7. Page 11: publish/amend a synthetic acceptance and refresh/focus to confirm remaining counts. Full roles remain selectable for waitlist decisions; all roles retain their fixed capacities. Outages show unavailable, never zero.
8. Pages 11-12: evidence precedes the weekday calendar in Your story. Blank resume/proof/availability blocks Continue/Submit and focuses the right field, but unfinished drafts save. Proof survives navigation; Review shows acknowledged summary/Edit.
9. Pages 12-13: receipt/history/notifications/withdrawal still work. Both tracks follow assigned review/admin decisions, with one application per account and explicit membership ID issuance.
10. Check 320/390/768/1440px, both device preferences, 200% text, keyboard, short screens and reduced motion. Distinguish local/synthetic outcomes from real provider/staging verification.


## Quick links and photo persistence

From the main homepage footer and Events footer, open About, Team and Connect; verify the destination section is visible after pin layout/fonts settle, and manual scrolling is not pulled back. Check recruitment footer links reach the main site, Events resolves to /events/, Skillbuilders retains its sign-in guard and Apply now reaches aws-alpha-recruitment.vercel.app. As an existing member, choose a valid JPG/PNG, give photo consent and save. Verify the actual private processed portrait appears in the card, remains after reload and is included in the canvas export. Invalid bytes/oversized files and another account must be denied. Use synthetic files for automated tests.


## Existing-member invitation checks

As an MFA administrator, Add existing member saves an invitation even before first sign-in. Cancel confirmation and verify no write; retry an uncertain exact request and verify one invitation. Open Member invitations to send a confirmed email or share /membership. A different Google account must not see or accept the invitation. The invited account accepts once, gets an ID without an application, uploads its portrait and downloads the same preview. Existing active members should go directly to Membership ID when using Apply now or resuming a draft, while submitted receipts remain accessible. Check canceled/revoked invitations and private ID lookup. Treat Gmail acceptance separately from inbox delivery. Test empty/error states, focus refresh, account switching and panel contrast at 320/390/768/1440px. Open long staff-change/member forms and verify the Staff management panel ends above Organization members with a visible gap. Do not send real mail during automated checks.


## Existing-member administration — 9 November 2026

1. Sign in once at Membership ID with a separate existing-member Google account that has no recruitment application. As an MFA-verified System Admin, open Organization members and choose Add existing member. Enter the same email, name, position, joining date and private reason. Cancel the confirmation and verify no record is created; confirm it explicitly to save.
2. A not-yet-registered email must fail without clearing the entered fields. After acknowledged creation, the member can open their own ID, edit their name/photo and download it. They cannot edit position, date or another person's membership.
3. Use Update or revoke membership and verify revocation does not invite an ID download. Check private history. Membership and security-log headings, labels and actions must remain readable over the moving gradient at 320px, phone, tablet and desktop widths. No real membership has been added by the automated UI checks; they use synthetic transport.

## Text-only department sequence — 9 November 2026

Confirm the opportunity catalog contains no photos. Scroll through the eight department cards, checking each enters, stays readable and gives way to the next; pause and reverse must remain stable. Test short screens and reduced motion without sticky/readability traps. Open Finance/Operations to compare Core Team and Committee, verify role-specific Apply IDs and Escape/focus return, and retain track filtering and form-only scenario prompts.

## Department cards and reversible scroll motion — 9 November 2026

1. All roles should show eight department entries containing sixteen roles; Core Team shows six departments/six roles, Committee eight departments/ten roles. Open Finance or Operations and compare the two role options under All roles. Each Apply action must carry its own opportunity ID. SkillBuilders has three Committee specialties; BuildHer+ has its actual Ambassador option.
2. At desktop widths, verify image left and copy right; on phones verify stacked content and no horizontal overflow. Stop mid-scroll and confirm the photo/copy settle no further; reverse and confirm the same positions return. Test filters while scrolled, keyboard popup opening, Escape/focus return and reduced-motion stillness. Scenario prompts remain absent from these popups and required inside the form.

## Individual role cards and form-only scenario — 9 November 2026

1. At 320, 390, 768 and 1440px, inspect the compact photo cards and floating department/eligibility labels. All roles must remain reachable in normal flow without horizontal overflow. Core Team shows six cards, Committee ten and All roles sixteen; counts still name the correct departments.
2. Open a role with the keyboard. The popup must show responsibilities, eligibility and its exact Apply action, without Required role scenario or its question. Escape returns focus to the same card. Apply carries the chosen opportunity through the existing Google entry.
3. In the form, confirm the selected role still has its scenario prompt and required response/review rules. Check subtle pointer tilt and photo zoom on desktop, staggered scroll entrances and still readable cards under reduced motion. Other main-site sections retain their existing presentation.

## Enrollment, staff email and membership — 9 November 2026

1. Compare anonymous and signed-in navigation, desktop and mobile. About, Events, Team, Connect and Skillbuilders must point to the correct main sections/pages. An applicant sees Apply now before sign-in and My application/Sign out afterward, never both application actions. On Staff with the wrong Google account, Use another Google account must show Google's chooser. The nominated System Admin must complete authenticator verification; a normal applicant must not gain staff access.
2. In About you, certify current enrollment. In Review & submit, leave proof empty and submit: expect an associated inline error, focus on the upload control and no submission request. Draft saving remains possible. Try an oversized file, renamed SVG/executable and mismatched MIME signature; all must be rejected. Upload a current COR or official enrollment certificate showing name, school and current academic term, within 3 MiB. Refresh to verify the saved filename; replace it and download the saved document. Final accuracy confirms ownership/current term. Submit only with valid required resume, enrollment and all other fields.
3. With separate real accounts, prove another applicant cannot read the proof via API or Storage, an unassigned head cannot read it, and an MFA-verified admin/current assigned head can. After submission, replacement and deletion must fail. A missing Storage object must block submission even if metadata exists. Compare the submitted snapshot/reference before and after retries. Staff still need to review the document's content; an upload is not registrar verification.
4. Publish each approved status and check the applicant's private notification/title/history. Mark one read and refresh. An unrelated account cannot mark it read. With a current head assignment, compose an interview invitation using a real HTTPS calendly.com link. Check that acceptance/rejection types are unavailable unless the matching outcome is published. Review the full recipient/message/link confirmation. With email credentials absent, Send stays disabled; no email or sent receipt is invented.
5. Only after sender setup and an approved consenting test recipient, send one real interview message. Check Gmail acceptance, actual recipient inbox and the functional scheduling link separately. Replay the same request and confirm no second transport call. Timeout/unknown delivery must retain the exact request and never automatically resend. Test suspended/reassigned access, changed application revision, per-app/global request caps and mismatched status. Mocked transport evidence does not prove live delivery.
6. A System Admin issues membership for an accepted applicant or a verified existing member, with position, date and private reason. A normal applicant/head and an admin without MFA must fail. The member signs in at Membership ID, finds their own exact ID, updates name/photo and downloads a PNG containing name, position, join date and Alpha/Alphy branding. Use a clear JPG/PNG portrait within 2 MiB. Members cannot change role/position/date or find another account's record. Revoke membership and confirm the ID workspace/photo become unavailable. Check automatic revocation if a linked accepted application moves to another outcome.
7. Inspect the admin's security log and staff/membership history for actor, action, object, time and reason where relevant. Applicants/heads cannot read or erase these logs or forge a sent receipt. Recheck 390/1440px, keyboard focus, enlarged text, reduced motion and no horizontal overflow. The separate practice form/card must remain visibly labeled, with no hosted writes; downloaded preview cards are not real issued IDs.

Use synthetic documents and portraits for local automation. Use the [setup guide](community-services-setup.md) for the sender, private environment and live-provider checks. Free-tier storage capacity, actual mailbox authorization, physical devices and operational deletion are separate checks.

## Form workspace and homepage event modes — 9 November 2026

1. Enter the existing application through Google sign-in and processing consent, or use the separately labeled local practice form. Confirm the four steps. Check that the white form sits above a moving gradient and the left sidebar scrolls together with its fields. On phones, progress sits above the form. Reduced motion keeps the gradient still.
2. Submit an empty required field, check its message/focus, then correct it. Move forward and back through Opportunity, Your story and Review; keep the selected role, all three answers, counters, resume requirement and existing save/exit behavior. Check enlarged text, keyboard access and a short viewport. Practice is not evidence of hosted persistence.
3. On the Alpha homepage, confirm all 19 records and all four category filters. Gallery tiles show only images. At the beginning, photos are small and distant; scroll to the middle and end to see deeper images grow and move forward. Stop scrolling and confirm the zoom stops; reverse and confirm it retraces the same sizes/positions. Check that the scene starts at the gallery rather than during Vision, and releases before Team. List view removes the pin and shows all metadata in normal flow. Switching categories/views should keep the gallery controls in view. Select each category and open a photo, checking its matching event details, links and slides. Close with Escape and check focus return. Repeat at phone/tablet widths. With reduced motion, check the unpinned normal-flow gallery and keyboard access to all images.
4. In Review & submit, confirm Resume & portfolio, the required Resume link label and the visible required-submission/draft-saving hint. Leave the resume empty: Submit must focus its inline error and make no submission; saving an unfinished draft must still work. Supply a view-only HTTPS link and complete the remaining declarations. Portfolio stays optional; the app does not upload or inspect the linked file.
5. Open the separate Events page and confirm its category filters and existing grid still work. Confirm Team scrolling and the main navigation still reach their original sections.

Pass when layout changes preserve the application workflow and both event modes expose the same records without clipping or an inaccessible card.

## Public performance and responsive checks — 8 November 2026

1. Open Home and refresh it twice in the same tab. Confirm the mascot intro plays each time, then the Day One title and photo cards enter in a stagger. Open Events in a fresh tab, confirm the intro plays and refresh to check its once-per-tab behavior. Open Recruitment and refresh to check its document replay.
2. Check the main homepage, Events and recruitment at 320, 390, 768, 1024 and 1440px. Open collapsed menus, follow page/section links and reach the footer; check for horizontal overflow and missing images. Verify touch scrolling on a physical phone when available.
3. Scroll each hero completely offscreen and back. The wave should resume on return. With reduced motion enabled, the wave remains still and navigation remains usable.
4. Open Student Community Day on Events. Wait three seconds for the next photo; check manual navigation, credits, Escape/focus return and edge-to-edge photos at both short and tall viewport heights.
5. For comparisons, use production builds, a fresh browser context and disabled cache. Record network and CPU conditions, actual transferred bytes, navigation timing and scroll frame gaps. Keep local emulation separate from physical-device or deployed measurements; a decorative intro line is not measured download progress.

Pass when content and navigation remain accessible at each width, media fill their containers, decorative work pauses as described, and measurements use matching conditions.

## Combined local Alpha preview — 7 November 2026

At `http://127.0.0.1:4300`, use Apply now in the Alpha menu to reach the recruitment homepage. With a configured test backend, select Apply now there and verify that it opens Google sign-in. Use a non-staff Google account and check that the browser returns to consent or an existing draft. Try Apply for this opportunity from the catalog and confirm that the selected role survives sign-in. Without a backend, check that the application action returns to the recruitment homepage with a setup message. Repeat using the mobile menus and a signed-out visit to `/recruitment/apply`.

Save a draft partway through the form and confirm Save & exit opens the saved-draft summary. Use My application in the navbar to reopen the editor at the saved step with the saved answers. Repeat after signing out and back in. For a submitted test application, the same menu link opens its status.

On desktop and a phone, follow the recruitment header logo to the Alpha homepage. Compare each site's footer quick links with its chapter navigation. Follow Team, About Us and Connect from Events and Skillbuilders, checking the homepage section anchors. Confirm Apply now returns to recruitment and My application still reaches applicant progress. Scroll through the Team to Let's Connect boundary and back, checking its continuous navy background.

With practice enabled, the Apply now button on the recruitment homepage opens About you. A role's Apply link should open Your story with three blank answer fields. Try incomplete answers and an invalid resume link, then complete the form with sample values and submit the test application. Confirm the practice completion message and check that the browser sends no application API requests.

## Hero handoff and FAQ scroll entrance — 6 November 2026

Scroll between the hero and Opportunities slowly on a phone and desktop. Check that the hero title recedes as the Opportunities title rises, then scroll back and watch the motion reverse. Use Find my track and confirm the section settles below the masthead. Scroll from How to apply into FAQs and watch the questions arrive in sequence. Toggle an answer with Enter and Space while checking focus, then test a direct visit to the FAQ anchor. With reduced motion or without JavaScript, the sections are readable immediately and the FAQ can still be opened.

## FAQ and applicant page entrances — 6 November 2026

Scroll through How to apply and the closing invitation. Their copy should rise into view while the action links stay in place. At FAQs, open a question with Enter and close it with Space. Check focus, the chevron, and the expanding and collapsing answer. Open a second question while the first is expanded. Follow Start application and My application to check their short entrances. Repeat at narrow widths and with reduced motion. With JavaScript disabled, verify that the FAQ can still be opened.

## Home scroll transitions — 6 November 2026

Check that the opening shows Find my track and Continue application as text-only actions. Scroll slowly into Opportunities and back on phone and desktop. The curved panel should overlap the glow while leaving both hero actions unobstructed. The catalog photo and selected headings should rise on entry. Repeat with reduced motion and confirm the layout still works while the effects stay still. The catalog role rows display circular arrows, and the whole row still opens the detail popup by mouse or keyboard.

## Catalog, scenario and stable navigation — 6 November 2026

At phone and desktop widths, scroll between the hero, catalog and How to apply. The navbar stays dark and visible, and its dropdown opens and closes by keyboard. From the Core Team card, confirm the catalog filters to six roles, then check Committee and All. The department cards should rise as they enter the viewport and stay still with reduced motion. In Operations and Events, open both Show details buttons. Check the distinct responsibilities and the corresponding role IDs in the Apply links. Use Escape to return focus to each role button. Open Vice Chief Creatives Officer and verify its exact question in the popup and in Your story on a synthetic draft. Try continuing without the response, then write and save one. Confirm How to apply links reach the catalog, application, preparation checklist and status.

## Opportunity handoff and recovery — 6 November 2026

Open a Core Team role from Opportunities. Check that its name appears at sign-in, after a failed callback and on the consent screen. After creating a synthetic draft, enter the academic details one at a time and confirm the role stays selected. With year three, verify the Committee alternative and the block before Your story; correct to year two and continue. Reopen an existing draft from a different role link and check both Keep my draft and Use this opportunity, including answer preservation and review for the new role.

## Previous-flow continuity — 5 November 2026

Check that Apply has no repeated chapter label above its headline while the masthead still identifies Alpha/RTU. Follow an opportunity into Apply with its approved query ID, then use a configured or synthetic session to check Google handoff, real consent before draft creation, four-stage editing, saved-draft recovery, review/submission and the status portal. Public reference inspection alone does not verify real Google sessions or hosted mutations.


## Alpha entry continuity check — 5 November 2026

Open /apply on desktop and at 320/375px. Check signature lettering, readable four-step orientation, compact access/consent card, privacy link and all actions without overflow. Confirm Google entry preserves the selected opportunity and no draft is created before actual consent. In a synthetic or configured session, check compact editor heading, labeled numbered progress, keyboard navigation and save/submit recovery. On the main-site preview, verify hero Apply now and desktop/mobile Apply now target the same recruitment /apply URL; Team still reaches #members.


Follow these steps in order. Use the [testing checklist](checklist.md) to track the run. Each section has numbered actions and a **Pass when** result. This guide describes tests to perform; it is not a record of completed testing.

## Before you start

Chapter navigation and Apply checks: Home/About Us/Events use Alpha's main-site destinations, FAQs returns to recruitment's FAQ, and the main site's Apply actions lead to the recruitment homepage. Check applicant and staff menus without losing their workspace links. Confirm RTU Alpha branding, access to the privacy notice and direct Google sign-in from Apply now when configured. Consent is requested after verified sign-in and before any draft write. In the editor, labeled four-stage progress enables only completed stages; Back, future-stage gating, pending commands, dirty-navigation cancellation and sign-out guards remain. Check the expanded menu and long progress labels at narrow widths and enlarged text. Do not accept consent or submit real data merely to inspect the public reference.

Main-site visual checks: Home uses the centered Alpha logo, large headline, orange script accent and dark gradient. Follow What should I prepare? to the public checklist. Track cards have visible static depth; with a fine mouse pointer, move across a card and leave it to verify bounded tilt/reflection and return to rest. Keyboard links retain visible focus without requiring hover. On touch/coarse pointers, reduced motion and without JavaScript, read the same content and use every link with static cards. Inspect 320px/375px and wide layouts for horizontal overflow, stacked preparation, unclipped shadows/actions and natural hero/track scrolling. These checks do not authorize or exercise a hosted application write.

Public discovery checks need no applicant data: follow the main site's recruitment entry, confirm Home's visible track action and preparation checklist, and read Privacy before entering Apply. Explore each track and verify the catalog filter matches. Open an opportunity and confirm its application action retains the opportunity ID. Test keyboard focus/Escape and all checklist/return links, including Alpha home in the shared navbar and footer. At 320px, inspect actual text/control bounds and scroll through the entire stacked preparation panel; it must not be pinned outside the viewport. Reduced-motion and JavaScript-disabled views retain readable guidance and navigable links. These checks do not submit an application or establish real Google-session verification.

Shared process design checks: My application, Staff sign-in/MFA, Staff management, Applications, Evaluator workspace and Intake use near-black waves with white task-specific surfaces and the shared navbar, without utility footers. Anonymous entry cards are dark; MFA QR alone retains its white backing/perimeter; the surrounding setup stays white. Optional help opens through disclosures. On phones, staff list/detail Back preserves edits and focus; desktop keeps the list beside details. Try empty required fields and over-limit reasons/notes: errors appear beside fields and the attempted action focuses the first invalid control without opening confirmation. Typing/refresh must not steal focus. Network/access/capacity and uncertain-result messages remain actionable; exact retries and finality confirmations stay intact. Check 320/375/414/768/1024/1440px, enlarged text, short viewports and reduced motion; navigate between process routes and Home to check backgrounds/footer/chrome restore correctly.

Ask the owner for the app URL, version, unique run label, chosen one-place Core Team opportunity and approval to test Pause/Resume. The owner must prepare administrator access and an accepting submission window. Setup guidance is in [owner setup](architecture.md#owner-setup-and-recovery).

| Account | Start here | Requirement |
| --- | --- | --- |
| Admin | /staff | Existing administrator access; verify its authenticator |
| Evaluator | /staff | Sign in once before an admin can grant Evaluator access |
| Applicant A | Recruitment homepage | Separate account that has never submitted or held staff access |
| Applicant B | Recruitment homepage | Another separate account with the same requirements |

Use separate browser profiles or different browsers. Tabs in one profile share the same signed-in account. If several people test together, agree who performs each role.

Use made-up details and a unique label such as **QA-20261028-01**. Full names should be **[run label] Applicant A** and **[run label] Applicant B**. Save the two application references in private test notes.

Both applicants must choose the **same** owner-approved Core Team opportunity, with one place and no existing accepted applicant. Keep other test runs out of that opportunity during this run. Do not change or delete unrelated records.

If a prerequisite is missing, mark the affected checks **Blocked** and contact the owner. Never choose **Close intake permanently** during this run. Withdrawal is final, so perform it only in step 12.

## 1. Start the website

For everyone:

1. Open the URL supplied by the owner.
2. Open opportunities, Privacy and Staff sign-in from the home page.

**Pass when:** The pages open and links work.

For local testing only, the owner must first configure the project and provide the branch/version to use. With Node 24.22.1 and dependencies installed, run:

```bash
npm run dev
```

Use the Local URL printed in the terminal. A localhost URL works on the device running that server; a remote tester needs a URL reachable from their own device. All paths below use the same app URL.

## 2. Set up the administrator

As **Admin**:

1. Open **/staff** and sign in with the owner-approved Google account.
2. If asked to set up an authenticator, scan the QR code or use the manual setup key, then verify a fresh six-digit code.
3. If an authenticator is already configured, enter its current code without enrolling again.

**Pass when:** **/admin** opens Staff management. If the page says staff access has not been added, stop and ask the owner to prepare access. Keep keys and codes in the app/browser.

## 3. Set up the evaluator

As **Evaluator**, then **Admin**, then **Evaluator**:

1. Evaluator signs in at **/staff** once.
2. Admin opens **Staff management**, chooses **Add staff**, enters the evaluator's exact Google email, selects **Evaluator**, gives a reason and confirms the access change. Skip the grant if that account is already an active evaluator.
3. Evaluator refreshes **/staff** and opens **/reviewer**.
4. Evaluator tries **/admin**.
5. On a phone, Admin types a temporary access-change reason without submitting, uses **Back to staff list** and reopens the same evaluator. Confirm the reason remains, then clear it.

**Pass when:** The evaluator workspace opens, A and B are not yet assigned, and administrator content is blocked. Other existing assigned test records may appear. A staff grant does not send an email invitation.

## 4. Create two drafts

As **Applicant A**, then **Applicant B**:

1. Open the recruitment homepage and choose **Apply now**. Confirm that this opens Google sign-in directly. Privacy and Contact remain in Home/footer, with privacy also linked in processing consent. After sign-in, review **Ready to start?**, confirm your read-only email and open the collapsed **Application details** below the action for dates/preparation guidance. Give the linked processing consent and choose **Start application**. About you opens directly.
2. Enter the run-labeled made-up full name. Use an enrolled undergraduate in year 1 or 2.
3. Select **Core Team** and the opportunity agreed with the owner.
4. In **Your story**, add the required view-only HTTPS resume link and upload proof of enrollment. Select a range using two date clicks, then try a backwards drag, a long press, and cancellation. Verify that past days are disabled and the calendar works with arrow keys. Set daily times in Philippine time and confirm that 7 AM is the first start, 9:45 PM is the last start, and 10 PM is the last end. Check that an incomplete range saves and a reversed range blocks Continue with a field error. Complete the three required responses, each up to 150 words. Refresh after autosave and confirm the schedule and answers persist. Continue to **Review & submit** and verify the schedule, evidence, and answers.
5. Confirm the saved status beneath **Your application**. Choose **Save & exit** on the left of the form action row, wait for **/application**, then choose **Continue my draft**. Confirm the latest changes persisted. On a save failure, input stays in the editor with retry/reload controls rather than exiting.
6. Before submission, check the draft on a phone: previous progress segments move backward and focus the heading; future steps are unavailable until **Continue** validates prerequisites. All three responses remain on one page. Confirm **Optional details** shows preferred name and mobile number, then verify those values persist after saving. Confirm progress sits inside the white card above the heading and no secondary toolbar/account menu or repeated Privacy/Contact row appears. Confirm the shared navbar and its account actions stay visible when scrolling. Confirm the form action row scrolls with the card and never overlays fields or spans the viewport. On Review, Refresh intake availability gives compact status without warning/reload actions; refocusing the window refreshes quietly. A failed read retains an appropriate retry, while an uncertain submission stays frozen with its exact retry. Typing must not navigate away from the response. Check the first profile field, long text, 200% text size, landscape and the open software keyboard for usable fields/actions without sideways scrolling.
7. Check that the signed-in email cannot be edited and that each account shows its own name and answers.

| Answer | Limit |
| --- | --- |
| Why Alpha? (motivation and contribution) | Required, up to 150 words |
| Working together | Required, up to 150 words |
| Put yourself in the role | Required, up to 150 words |

**Pass when:** Saved input survives refresh and stays private to its owner. Incomplete drafts may be saved; forward navigation checks required and conditional fields, word limits and supplied URL formats; final submission rechecks everything. New submissions require an accessible HTTPS resume link; portfolios remain optional. Files are not uploaded.

Resume/navigation checks: try Continue with missing fields, invalid conditional values and blank or 151-word responses. Expect inline errors only, preserved answers and usable Back/autosave. Continue/Submit focus the first invalid control in visual order on the earliest affected step. With both university and a hidden invalid mobile, university comes first; after fixing it, Optional details opens and mobile receives focus. Check enrollment, opportunity/availability/track, scenario review, resume and accuracy error associations. Typing/autosave must keep focus. Unsupported server/form/step errors have one compact message near actions, while connection/conflict and uncertain submission failures retain their exact recovery controls. Reopen a draft saved beyond missing prerequisites and expect the first incomplete step. Add a view-only Google Drive or other HTTPS resume link; verify Open resume link opens a new tab. A missing resume blocks Submit, while an optional blank portfolio does not. Older submitted records retain their original prompts/answers and remain readable and withdrawable. On an old unfinished draft, confirm no text is truncated and retired answers are available in Previous draft answers for copying. Change opportunities: all three responses stay; the selected row expands with its description/scenario and Continue remains blocked until its scenario review checkbox is checked. Switch back and confirm review is required again.

## 5. Prepare submission testing

As **Admin**, then both applicants:

The official intake is **1-30 November 2026, Philippine time**. An early development opening was authorized on 28 October, but the owner must confirm current availability for this run. **Resume does not bypass opening or closing dates.**

1. Admin opens **/admin/intake** and checks that the availability panel says **Accepting submissions**. If the schedule or final closure blocks submissions, mark submission checks Blocked and contact the owner.
2. With the owner's approval, select **Pause intake**, enter a reason, review and confirm.
3. Applicants use **Refresh intake availability** on the Review step.
4. Confirm submission is unavailable, then change and save a draft answer.
5. Admin selects **Resume intake**, enters a reason, reviews and confirms. Applicants refresh availability again.

**Pass when:** Pause blocks submission while draft saving works. Resume restores acceptance inside the confirmed window. Do not permanently Close intake or edit dates. Restore the temporary schedule only on the owner's request, not automatically when testing finishes.

## 6. Submit both applications

As **Applicant A**, then **Applicant B**:

1. In A's draft, leave one required field blank and try Continue and a later step shortcut. Confirm both are blocked. After correcting all section errors and adding the required resume link, enter Review, leave accuracy unchecked and try **Submit application**.
2. Confirm the error explains what needs fixing and the other answers remain. Follow its error link: it must reveal the correct section and written-response panel, then focus the field. Correct the missing value.
3. Complete each applicant's required fields, word counts and accuracy confirmation.
4. Review and submit A, then B. Record their references.
5. Open **/application**, use **View submitted answers**, and refresh. Try returning to **/apply**.

**Pass when:** Each applicant has a unique reference, **Submitted** status, a Submitted history entry and read-only submitted answers. Returning to /apply opens the existing application. Optional recruitment updates are not required; the app does not promise an email receipt.

## 7. Assign and review Applicant A

As **Admin**, **Applicant A**, then **Evaluator**:

1. Admin opens **/recruitment/admin/applications**, enters the run label and submits **Search**.
2. Open A, choose **Review & decision**, select the evaluator, review and confirm the assignment.
3. While A is editable, type a temporary assignment reason without submitting. Switch tabs and, on a phone, use **Back to list** and reopen A. Confirm the text remains, then use **Reload latest details** and confirm discarding that temporary edit.
4. Applicant A uses **Refresh status** in /application.
5. Evaluator opens /reviewer, chooses **Refresh applications**, opens A and reads **Application**.
6. In **Recommendation**, choose **Accepted** and enter a made-up private note. Switch tabs and, on a phone, use **Back to list** and reopen A. Confirm the note remains, then **Save recommendation**. Refresh and reopen the record.

**Pass when:** A becomes **Under Review**. The evaluator can see A, but not the still-unassigned B. The saved recommendation persists; A cannot see evaluator identity or private notes. Publication remains unavailable until the current recommendation is saved.

Earlier assignments' saved reviews, if any, appear under **Previous reviews**. Evaluator tabs do not include administrator assignment or publication controls.

## 8. Publish Applicant A's decision

As **Admin**, **Applicant A**, then **Evaluator**:

1. Admin opens A's **Review & decision** and uses **Reload latest details** if needed to load the saved recommendation.
2. Set **Outcome to publish** to **Accepted**, choose **Review publication**, check the applicant/reference and choose **Publish outcome**.
3. Applicant A uses **Refresh status**.
4. Evaluator reloads A's latest details and checks **Recommendation**.

**Pass when:** A sees **Accepted** and its public history. The current evaluator can still read A but cannot edit its published review.

## 9. Test capacity with Applicant B

As **Admin**, then **Evaluator**, then **Admin** and **Applicant B**:

1. Admin assigns B to the evaluator from **Review & decision**.
2. Evaluator refreshes applications, opens B and saves an **Accepted** recommendation.
3. Admin reloads B's details and attempts to publish **Accepted**.
4. After the capacity rejection, choose **Waitlisted**, review and publish it. Applicant B refreshes status.

**Pass when:** B cannot take the place already occupied by A. B sees **Waitlisted**, and A remains Accepted. If an unrelated record occupies the chosen place, contact the owner instead of changing that record.

## 10. Test decision changes

As **Admin** and **Applicant A**:

1. Open A's **Review & decision**.
2. Change **Accepted to Waitlisted**, then **Waitlisted to Not Selected**, then **Not Selected to Accepted**.
3. For each change, select **New outcome**, enter an amendment reason, choose **Review outcome amendment** and **Confirm amendment**.
4. A refreshes status after each change. Admin opens **History** to check the private audit.

**Pass when:** A sees every public outcome in order without private amendment reasons. B remains Waitlisted throughout; releasing a place never promotes B automatically. Reviews stay read-only.

## 11. Test filters and CSV

As **Admin**:

1. In Applications, use **Back to applications** on a phone. Choose **Clear all** if a query is active, then search for the run label. Confirm both A and B match.
2. Open **Filters**, select **Accepted** and apply. A should match.
3. Reopen **Filters**, select **Waitlisted** and apply. B should match. Choose **More actions → Export CSV**.
4. Choose **Clear all**, then submit the run label in the search field before exporting both A and B.
5. Open both files and compare them with the test records.

**Pass when:** The Waitlisted export contains B; the test-run export contains A and B. Written answers are present. Evaluator identities, recommendations, private notes/reasons and evidence links are absent. Exports follow applied filters, not unapplied edits, and the app confirms Download started rather than claiming the file was saved.

## 12. Test withdrawal last

As **Applicant A**, then **Evaluator** and **Applicant B**, then **Admin**:

1. In A's **/application**, scroll below **View submitted answers**, choose **Withdraw application** and confirm.
2. Refresh A's portal and try /apply again.
3. Evaluator uses **Refresh applications**. Applicant B refreshes status.
4. Admin opens B's **Review & decision** and amends B from **Waitlisted to Accepted**, with a reason and confirmation.

**Pass when:** A is **Withdrawn**, retains its reference/history and cannot submit again. The evaluator loses access to A. B stays Waitlisted until the administrator's manual change, which now succeeds because A released the place.

## 13. Finish with access and mobile checks

As All roles; **Admin** handles suspension/reactivation:

1. Admin suspends the evaluator with a reason while its workspace is open. Keep that window visible; private content should disappear on the next access check, within 30 seconds. Reactivate the evaluator afterward and refresh its access.
2. Applicants cannot open administrator/evaluator content. Staff cannot use applicant workflows.
3. On a phone or narrow browser, check all seven routes: /apply, /application, /staff, /admin, /admin/applications, /reviewer and /admin/intake. Look for cut-off text, page-level horizontal scrolling and inaccessible buttons. On Home, the complete supporting paragraph should remain readable at 16px on phones and may wrap beyond two lines.
4. Compare every route, including `/apply`, with Home and Privacy at the same phone and desktop widths. The logo, navbar size and navigation/menu alignment match Home at the same width. Scroll down and back up over light and dark sections; confirm the navbar stays dark and visible. Open the mobile menu and confirm it overlays the page without pushing it down; enlarge text and check the last menu action remains reachable. Apply keeps its near-black process shell below the navbar without duplicate branding, a global footer or repeated Privacy/Contact row. Cancel unsaved Home navigation and Sign out from the navbar and confirm answers remain intact. Check the consent privacy link, Home footer Privacy/Contact links and explicit no-JavaScript loading help.
5. Confirm the `/apply` draft checks were completed in step 4 while editing was available: gated forward progression, backward progress segments, heading focus, autosave and Save & exit. After submission `/apply` intentionally opens the portal; do not attempt to create another application for these accounts.
6. Check **Back to list** and record tabs on the remaining read-only applications. Input preservation was checked earlier in steps 3 and 7, before publication locked the records.
7. Use Tab and Enter to operate controls. After opening the top mobile menu, Tab enters its first link and Escape returns to the menu button. Check visible focus and arrow/Home/End navigation between record tabs.

**Pass when:** The evaluator is active again, permissions hold, and mobile/keyboard controls remain usable. Every route keeps the landing navbar with appropriate account links. Home/Privacy keep their full footer; all seven recruitment routes omit the global footer. Apply keeps its minimal process shell without a global footer.

## Expected final state and reporting

| Account | Expected result |
| --- | --- |
| Admin | Active administrator; MFA verified |
| Evaluator | Active evaluator after reactivation |
| Applicant A | Withdrawn; cannot resubmit |
| Applicant B | Accepted after the manual amendment |

Record each step as **Pass**, **Fail** or **Blocked** in private notes. For a failure, include step number, account role, page path, expected/actual result, visible error and browser/device. Hide passwords, authenticator QR codes, keys and codes from screenshots.

If the app says a change may have completed, keep that confirmation and use its provided retry/latest-details controls. Do not start a different change while the result is uncertain.

Leave test records for the owner to inspect. Completing this guide does not prove concurrent-load or deliberately lost-response recovery behavior; those gaps remain in the [progress tracker](progress-tracker.md).

Visual check: recruitment routes should begin with their form, progress controls, reference or workbench rather than a full-width title banner. Confirm My application still shows its current status beside the reference, and Staff sign-in/MFA still explains access and verification.

Flow refinement walkthrough: confirm submission warnings and server-confirmed reference/status guidance. In Applications, test all three shortcuts within an applied track/opportunity/search, including dirty/pending guards. As evaluator, save a recommendation, choose Review next application, and verify saved/published items are skipped, unsaved changes block navigation, and empty/error results preserve the current application. Owner performs Google/MFA and physical-device interactions using approved accounts; record actual results privately and anonymized outcomes in the tracker.


Compact-content checks: generic step leads are absent, approved prompts and counters remain, and resume sharing starts collapsed. Portal Status history, staff Access history and Private intake history start collapsed. In Applications, check the static counts, the filter drawer, and More actions. Close and reopen the drawer to confirm that unapplied choices persist. Submit search with a staged filter to confirm the search uses the applied query. Cancel a guarded filter change and verify that the drawer stays open with its selections.

Modern Apply/feedback checks: all seven process routes retain white working surfaces and dark anonymous entry under both device preferences. Check light working selects, placeholders, read-only email, disabled controls, autofill, selected light-tint rows, all four notice severities and native confirmation dialogs for readable text/borders; only the MFA QR backing stays white. Home and Privacy retain their own colors.  anonymous entry has a dark translucent card over slow orange/violet waves; preparation/editor/loading/recovery use white working surfaces. Google shows Connecting only while its action is pending. Reduced motion and no JavaScript retain a readable static background and support links. Across staff, MFA, portal, intake, evaluation/decision and CSV, verify severity icons/titles, field associations and wrapping recovery actions. Errors and summaries remain immediate; save/count/loading text stays quiet. Confirm recovery preserves input and the same operation, without duplicate live announcements or auto-dismissal.

## Membership showcase - 14 November 2026

Membership showcase: inspect no-ID, pending invitation, signed-out and issued-ID states. Check the verified email and Switch account, invitation acceptance, portrait consent/save and Download ID. Completed cards start with editing collapsed; missing portraits open editing and disable download. Find ID is a secondary disclosure. Check phones, keyboard focus and enlarged text; confirm PNG artwork remains unchanged.

## Recruitment document intro - 14 November 2026

Open or refresh Opportunities, Apply, Membership and Staff. Check that the wolf hops across the unrolling sticker, the segmented loading highlight moves and the curved backdrop lifts away. Repeat on a phone in portrait and landscape to check that the wolf stays in view and the single Loading label fits the right panel. Follow internal recruitment links and change filters or form steps to confirm the intro stays dismissed. Check Back/Forward, keyboard focus, reduced motion and disabled JavaScript to confirm the page stays accessible.

## Centered Apply step cards - 15 November 2026

Apply responsive-card walkthrough: inspect consent/start, About you, Opportunity, Your story, Review, loading and recovery. Check one task heading, compact email/role summary, four labeled progress items above the form below 1024px (two columns on phones) and vertically beside the form from 1024px. On desktop at least 768px tall, scroll a long step and confirm progress stays 24px below the site header and stops at the card bottom. At 1440x600 it scrolls naturally. Check past-step keyboard navigation, role-change confirmation, required/optional fields and private proof. Verify white inputs, visible error focus, counters, autosave, exact retries, save/exit and submission. At 390x844, 768x1024 and 1440x900 inspect spacing and action labels; also check 1023/1024px and 1920px, and at 320px ensure Submit fits. Mobile/short-window actions stay in document flow; roomy desktop actions may stick, while long recovery stays in reading flow. Check 200% text, reduced motion and mobile keyboard reachability. Receipt/status is unchanged.

## Recruitment scrollbars - 16 November 2026

On desktop, inspect the page edge and an overflowing role dialog/panel: the slim orange thumb uses a navy track and darkens on hover. Drag the thumb, scroll with the wheel, and use keyboard scrolling in a focused panel. Confirm dialog Escape/focus handling and sticky application progress still work. Check a touch device and Windows high contrast retain usable system scrollbars; Firefox uses the native thin/color fallback. Record real browser/device evidence separately from emulated Chromium checks.

## Full-height Apply progress panel - 16 November 2026

Inspect all four steps on desktop: the light left panel and divider must extend from the card's top to its bottom, including below the progress text and behind Your application. Check both rounded left corners, short and long steps, and scrolling while the compact progress stays sticky. Confirm the form remains white, completed-step keyboard navigation still works, and narrow screens keep their original single-card/top-progress layout. Retain short-window and enlarged-text checks.

The expanded-control refinement replaces the compact desktop list: verify the title/Draft badge at the top, four large connected step sections filling the visible sidebar and the step count at the bottom. Check current/completed/future styling on every stage and Enter activation of a completed step. The whole sidebar group sticks below the header and stops within the card; short windows use natural flow. Phones retain the existing compact top progress and header.
