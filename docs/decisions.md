# Decision log

Smaller decisions and the reasons for them, newest first. Hard-to-reverse decisions get an ADR in `docs/adr/` and are only linked here.

## 2026-11-14: tests

- **Vitest for unit and integration tests, Playwright for end-to-end.** The aim is a test for every domain rule in `AGENTS.md`, not a coverage figure. Components are not tested on their own; the end-to-end journeys cover the interface that matters.
- **Integration tests use a real Postgres, never a mocked database.** The rules worth testing are enforced by queries, constraints and transactions (Organization filters, the idempotency index, a Generation committing together with its Usage event), which a mock would not exercise. The database runs in Docker on port 5433, keeps its data in memory, and is rebuilt from the schema at the start of every run.
- **Only external services are replaced:** the Better Auth session, R2, Polar and Next's `after`. Tests call the real tRPC procedures and Route Handlers, so the guards and filters run as they do in the app.
- **Test files run one at a time.** They share one database that is emptied before each test. Revisit with a database per worker if the suite gets slow.
- **End-to-end tests will use a real R2 test bucket, and a local fake server for Chatterbox and Polar.** R2 is reliable enough and needs no code change; Chatterbox costs GPU time and Polar holds the Subscription state, so both are faked. The cost is that the end-to-end job needs secrets and cannot run for pull requests from forks.
- **A retried submit with the same idempotency key returns the first Generation even if the text differs.** The client only reuses a key for an identical resubmit, so this is not rejected.

## 2026-11-14: project review

### Reliability and billing

- **External side effects go through an outbox.** See [ADR 0002](adr/0002-outbox-for-external-side-effects.md). It replaces the Effect `acquireRelease` rollback for uploads and the "log and move on" handling of failed R2 deletes and Usage events.
- **Deleting an Organization ends its Subscription first.** Afterwards nobody can reach the billing portal, so a surviving Subscription would charge forever. If Polar cannot be reached, the deletion is refused instead. The Subscription is revoked immediately, not at period end.
- **A deleted Organization's audio is removed by key prefix.** Its rows are gone by the time the hook runs, and Organization ids are never reused, so `voices/orgs/<id>/` and `generations/orgs/<id>/` are safe to delete later.
- **Generations are idempotent per submit.** The client sends a UUID that is kept across failed attempts and replaced after a success. Reason: a retry after a dropped connection must not generate and bill twice, while generating the same text again on purpose must still give a new take.
- **Generation rate limit: 20 per minute per Organization, counted from stored Generations.** No extra infrastructure. Requests still in flight are not counted, which is acceptable for a cost guard; revisit if abuse shows up.
- **Upstream TTS errors are no longer shown to users.** The message used to include the microservice's raw response.

### Access

- **Owners and admins only: billing, and deleting a Custom voice.** A Member could previously cancel the Subscription or delete a voice everyone depends on. Enforced by `orgAdminProcedure`; the interface hides the same actions.
- **Any Member can delete a Generation.** Generations record no author, so "your own" cannot be enforced, and history is cheap to recreate compared with a voice.
- **Email must be verified to sign in with a password.** Invitations are matched by email, and Better Auth only lists them for a verified address, so unverified invitees could not see theirs. Existing unverified accounts get a link when they next sign in. This makes `RESEND_API_KEY` required for password sign-up to work.
- **Voice cloning requires recorded consent.** The uploader confirms they are the speaker or have permission; the Custom voice stores who confirmed and when. Reason: personality rights and GDPR apply to the sample, and a record is the minimum evidence. A read-aloud verification, as ElevenLabs uses for professional clones, is not built.

### Privacy and operations

- **tRPC inputs are not sent to Sentry, and tracing samples 10%.** Inputs contain the text users generate speech from.
- **The Sentry tunnel (`/monitoring`) is public.** Otherwise browser errors on the sign-in pages were redirected and lost.
- **Audio routes forward `Range` to R2.** Browsers need range requests to seek; Safari needs them to play reliably. We kept proxying through our origin rather than redirecting to a signed URL, to keep the sanitising response headers and avoid configuring R2 CORS.
- **Security headers are set globally; a full Content-Security-Policy is not.** A CSP needs nonces wired through the app and can break Sentry and the auth UI, so it is tracked in `TODO.md`.
- **Magic-link requests are limited to 3 per minute.** Password-reset and verification emails already had that limit from Better Auth's defaults.

### Code

- **Typed error codes over message matching.** The server attaches `appCode` (`SUBSCRIPTION_REQUIRED`, `RATE_LIMITED`, `ROLE_REQUIRED`) to tRPC errors; the client switches on it. Before, the client compared the message with a string.
- **`runEffect` runs workflows in tRPC procedures.** One place for Sentry reporting, error mapping and defects. Caller mistakes (no Subscription, not found, rate limited) are no longer reported as exceptions.
- **The history list is paginated (30 per page) and sends a 160-character preview**, not every Generation's full text.
- **Schema changes are applied with `drizzle-kit push`.** The files in `drizzle/` are behind the schema (they predate passkeys and two-factor), so no migration file was added.

### Interface

- **One accent colour.** The primary orange is the only brand colour; `--accent` is now the neutral hover surface it is meant to be (it used to equal `--primary`, turning every menu hover orange). The teal waveform, teal category labels, pink-to-cyan input border and six card gradients are gone.
- **Dark mode is on, following the system by default,** with a switch in the user menu. Hard-coded whites were replaced with tokens. The QR code keeps its white ground so it scans.
- **Dashboard cards are icon tiles, not placeholder art,** and the whole card is the link.
- **The animated wave behind the dashboard stays,** in its original teal-to-indigo colours, as the one deliberate exception to the single accent colour. It now takes its background from the theme so it works in dark mode.
- **Generating shows a progress state with elapsed time** in the result area, and the text stays readable.
- **Sliders show their value, a short explanation and a reset.**
- **Prices are in euros everywhere,** from one formatter.
- **One help entry point:** "Help and support" in the sidebar. The two mailto buttons in every page header and the one in the empty preview were removed.
- **Only one Voice preview plays at a time.**
- **Interface wording follows `GLOSSARY.md`:** "Custom voices", "System voices", "Voices", "Voice name", "Subscribe".
