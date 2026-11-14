import type { session, user } from "@/db/schema";

export interface TestSession {
  readonly user: typeof user.$inferSelect;
  readonly session: typeof session.$inferSelect;
}

let current: TestSession | null = null;

/**
 * Makes every following request in the test come from this User and session. It replaces
 * what Better Auth would read from the cookie; everything after that (membership, role,
 * Organization filtering) is the real code. Reset to signed-out before each test.
 */
export function signInAs(testSession: TestSession) {
  current = testSession;
}

export function signOut() {
  current = null;
}

export function currentSession() {
  return current;
}
