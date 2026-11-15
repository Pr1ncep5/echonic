# End-to-end test architecture

How journeys are written here. It follows [Playwright's best practices](https://playwright.dev/docs/best-practices); where this project is stricter or different, the reason is given. How to run them is in [README.md](README.md).

## What gets a journey

One journey per thing a user would notice breaking: generating speech, cloning a voice, signing in. Not one per rule. A rule ("a Member cannot delete a Custom voice") is tested in Vitest, where it is fast and exact; the journey only checks that the interface and the real services are wired together.

- Name a journey after what the user gets, not after the steps: "turns text into audio that plays, is kept in the history and is billed once".
- Assert what the user sees first. Assert on what was left behind (a row, an R2 object, a Usage event) only where that is the point of the journey, such as billing.
- Group the checks of a long journey with `test.step`, titled as a fact: "the Organization is billed for it, once". The steps show up in the report and the trace.
- Test what we own. Polar and Chatterbox are faked; never drive a third-party page.

## Isolation

Every journey must pass alone, in any order, and next to any other journey.

- The `organization` fixture gives each journey a new Organization with a signed-in owner; `page` is already signed in as them. A journey may change or delete its Organization freely.
- Need more people or data? Create them in the journey with `support/seed.ts` (`addMember`, `addCustomVoice`, `givePassword`) and open another browser with the `openAs` fixture.
- The `polar` fixture is scoped to the journey's Organization. Every Organization starts subscribed; call `polar.unsubscribe()` to change that.
- The only shared row is the seeded System voice. Never change it.
- No `beforeAll` state, no journey that depends on another, no fixed ids or names that must be unique across journeys (the seed helpers generate them).
- Put `[fail]` in the text to make the fake Chatterbox reject that one request. Nothing global is switched, so it is safe in parallel.

Sign-in goes through the form in exactly one journey (`sign-in.spec.ts`). Every other journey starts with a session inserted by the fixture, because signing in through the interface every time is slow and makes every journey fail when sign-in breaks.

## Selector priority

1. **Role and accessible name:** `getByRole("button", { name: "Generate speech" })`. What a user and a screen reader find. If it cannot be found this way, first consider that the interface is missing a label.
2. **Label:** `getByLabel("Voice name")` for form fields.
3. **Text:** `getByText("Voice created successfully!")` for messages and other non-interactive content.
4. **Test id:** `getByTestId(...)`, only for something with no role, label or stable text. Add the `data-testid` and a comment saying why.

Never CSS classes, DOM structure or XPath. The one accepted exception is a hidden `input[type="file"]`, which has no role to find it by.

This puts test ids last, as Playwright recommends. A project with translated text would put them first, because text and names change per language; Echonic has one language, and role-based locators also catch missing accessible names. Revisit this if translations are added.

When a locator matches several elements, narrow it (`exact`, `level`, or scope it to a dialog or panel) instead of using `.first()` or `.nth()`.

## Page objects

One class per route in `pages/`, named after it (`VoicesPage` for `/voices`). A dialog or panel belongs to the page it opens on.

- A spec file contains no selectors. Locators are `readonly` fields of the page object; things a user does are methods (`cloneVoice`, `deleteOrganization`).
- `goto()` navigates and then waits for something only that page has, so a redirect to another page fails there with a clear message. A page reached by redirect has `expectLoaded()` instead.
- Assertions stay in the spec: the page object exposes the locator, the journey says what must be true of it (`await expect(voicesPage.created).toBeVisible()`). A page object only asserts to confirm it is on its page or that an action finished.
- Page objects for the signed-in `page` come as fixtures (`voicesPage`, `textToSpeechPage`, ...). For a second browser from `openAs`, construct one: `new VoicesPage(memberPage)`.
- Adding a page object: create the class, then add its fixture in `support/test.ts`.

## Waiting and timeouts

Never `waitForTimeout`, and never a manual check like `expect(await locator.isVisible()).toBe(true)`: it does not wait. Use web-first assertions (`await expect(locator).toBeVisible()`), which retry until they pass, and `expect.poll` for something outside the page, such as a Usage event arriving at the fake Polar.

| What            | Timeout | Set in                  |
| --------------- | ------- | ----------------------- |
| An action       | 10 s    | `use.actionTimeout`     |
| An assertion    | 10 s    | `expect.timeout`        |
| A navigation    | 15 s    | `use.navigationTimeout` |
| A whole journey | 60 s    | `timeout`               |

These are set once in `playwright.config.ts`. Do not pass a longer timeout to a single call to make a journey pass; find out what is slow.

## Parallel runs

4 workers locally, 2 in CI. One app and one Postgres serve all of them, so more workers make journeys slower and flakier, not faster. If a journey only fails with other journeys running, it shares state: fix the journey, do not lower the worker count.

## Retries and flaky journeys

- CI retries a failed journey twice; locally there are no retries, so failures show up at once.
- A journey that passes on retry is reported as flaky. Find the cause (usually a missing wait or shared state) and fix it. Do not raise the retry count, and do not mark it `fixme` without an entry in `TODO.md`.
- `test.only` fails the CI run.

## Screenshots and traces

Playwright records a screenshot and a trace for every failed journey; nothing is captured for passing ones. There are no manual screenshot calls in page objects. The trace is the first thing to open: it shows the page, network and console at each step.

## The fake server

`fakes/server.ts` answers as Polar and Chatterbox. Add a route there when the app starts calling a new endpoint (the fake answers 501 and names the missing route). Steering and reading it goes through `support/fake.ts`, always scoped to one Organization; do not add a control route that changes state for every Organization.
