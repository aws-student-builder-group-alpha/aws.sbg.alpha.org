# Alpha community services setup

The owner selected **awslc.alpha@gmail.com** as both the sender and first System Admin account. That existing verified account has been bootstrapped in the free Alpha Recruitment Test project. It must sign in through Staff and complete authenticator verification before managing roles or decisions. A separate applicant account has no staff privileges. Staff management grants the internal evaluator role as **Organization Head** and keeps suspension, revocation, reasons and last-admin protection.

The nominated account's real MFA-protected System Admin workspace was observed during setup. Local migration `20261109005924` is installed as hosted version `20261109013156`; the forward guard `20261109062617` is installed as `20261109063128`. Reconcile these version mappings before any generic migration push.

## Email activation

Email UI and storage are implemented, but sending remains disabled unless both server-only values are present in the ignored local environment or the hosting environment:

```dotenv
ALPHA_GMAIL_APP_PASSWORD=
ALPHA_SUPABASE_SECRET_KEY=
```

Use an app password issued specifically by the **awslc.alpha@gmail.com** mailbox, with Google 2-Step Verification enabled, or adapt the transport in a separately verified OAuth unit. Do not use the mailbox's normal password. The privileged Supabase key must belong to the same Alpha test project; it is used only to record delivery acknowledgements. Never put either value in browser code, NEXT_PUBLIC variables, source, chat, logs or screenshots. Restart the server after configuring them. The sender and SMTP host are fixed in server code; they are not editable by applicants or Organization Heads.

Current setup status: both connections are verified locally. The existing Alpha test Supabase secret is saved only in ignored `.env.local`; its privileged acknowledgement RPC returned HTTP 204 against a fresh nonexistent message UUID, changing no application/message record. The first manually entered Gmail password was rejected with EAUTH/535. After explicit approval and the owner's Google verification, captured the new one-time password directly from the generated-password dialog and saved it only in `.env.local`. Google lists this owner-created credential as **AWSSITE**. Nodemailer TLS SMTP verification for the fixed Alpha sender passed. No prior app password was revoked and no email was sent. Restarted the live recruitment server on 4301 and the separate practice server on 4302 to load the credentials. The combined site, Apply, Admin and practice form returned HTTP 200; anonymous community access still returned private/no-store HTTP 401. This verifies authentication and local availability, not delivery to an inbox. Hosting configuration remains unchanged.

The feature adds no paid email provider or subscription. Gmail and free Storage limits still apply. The application imposes three email requests per applicant and 100 overall per rolling 24 hours, with explicit confirmation and duplicate-send prevention. A transport timeout is uncertain, not a failed delivery that is safe to resend. Review provider history before creating a new message after uncertainty. A sent state means Gmail accepted the message; it does not guarantee inbox arrival.

After configuration, use an approved synthetic application and consenting recipient to test one interview email, its real Calendly link and its in-app notification. Then test acceptance/rejection emails only after the matching outcome is published. Record these as real-provider tests only if they actually ran. No live test email has been sent during the current implementation.

## Enrollment and membership

The additive migration creates two private buckets: alpha-enrollment (PDF/JPEG/PNG, 3 MiB) and alpha-member-photos (JPEG/PNG, 2 MiB). No public file URLs are used. Enrollment proof is required before a new submission and locks to that application. The expected evidence is a current registration form/COR or official enrollment certificate with the applicant's name, institution and term. Staff must review it; upload/type checks do not verify registrar authenticity or scan malware.

Accepted applicants can receive a membership through the application record. For an existing member without an application, first ask them to sign in once with Google at `/membership` (`/recruitment/membership` in combined mode). In the System Admin workspace, choose **Add existing member** under Organization members and enter the same verified email, name, position, date joined and private reason. Review the confirmation before saving. No recruitment application is required for this path. Use **Update or revoke membership** for later staff-controlled changes; an existing email retains its ID. Members complete their own name and portrait and download their branded PNG ID. Search is an exact own-account lookup. Position/date/active state remain staff controlled. The supplied Alphy asset is local under public/brand.

The downloadable PNG is a visual membership card, not a tamperproof authentication credential. The live membership registry remains authoritative.

The practice form and membership preview on port 4302 use no hosted uploads or membership writes. They do not establish real approval, persistence or delivery. Free-tier storage capacity, physical devices and operational deletion remain separate verification work.
