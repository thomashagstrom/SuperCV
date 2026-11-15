/**
 * Plain sentences for the errors people hit, and one place that reports a failure with its real
 * code. A caught error is never swallowed: call `reportError` with where it happened, then show
 * the sentence `describeError` gives.
 */

const MESSAGES: Record<string, string | null> = {
  "auth/invalid-credential": "That email and password don't match.",
  "auth/wrong-password": "That email and password don't match.",
  "auth/user-not-found": "That email and password don't match.",
  "auth/email-already-in-use": "An account with that email already exists. Try signing in instead.",
  "auth/weak-password": "Choose a password with at least 6 characters.",
  "auth/invalid-email": "That email address does not look right.",
  "auth/account-exists-with-different-credential": "An account with this email already exists, created another way. Sign in the way you did before.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/network-request-failed": "We couldn't reach the sign-in service. Check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/operation-not-allowed": "This sign-in method isn't switched on for this app yet. The app's owner can switch it on in Firebase Authentication, under Sign-in method.",
  "auth/unauthorized-domain": "Sign-in isn't set up for this web address yet. The app's owner can add it in Firebase Authentication, under Settings, Authorized domains.",
  "auth/invalid-continue-uri": "Sign-in isn't set up for this web address yet. The app's owner can add it in Firebase Authentication, under Settings, Authorized domains.",
  "auth/popup-closed-by-user": null,
  "auth/cancelled-popup-request": null,
  "auth/user-cancelled": null,
};

const FALLBACK = "Something went wrong. Please try again.";

/** The error's `code` (a Firebase error carries one), or undefined. */
export function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * A sentence for the person, or null when it is not an error (they closed the window). A code with
 * no sentence still says the code in brackets, so it can be reported.
 */
export function describeError(error: unknown): string | null {
  const code = errorCode(error);
  if (code !== undefined && Object.prototype.hasOwnProperty.call(MESSAGES, code)) {
    return MESSAGES[code] ?? null;
  }
  return code === undefined ? FALLBACK : `${FALLBACK} (${code})`;
}

/** Logs the real error with its code and where it happened. Never log what the person typed. */
export function reportError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${where}]`, errorCode(error) ?? 'no-code', message);
}
