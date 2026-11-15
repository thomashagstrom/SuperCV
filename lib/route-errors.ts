/**
 * What a server route answers when something fails. Never swallow a caught error and never answer
 * a bare 500: `return routeError('notes/list', error)` logs the real code and message to the
 * server log and answers with a short code and a plain sentence, no stack and no raw message.
 */

interface Mapped {
  code: string;
  status: number;
  message: string;
}

const KNOWN: Record<string, Mapped> = {
  "auth/id-token-expired": { code: "unauthenticated", status: 401, message: "Please sign in and try again." },
  "auth/argument-error": { code: "unauthenticated", status: 401, message: "Please sign in and try again." },
  "auth/id-token-revoked": { code: "unauthenticated", status: 401, message: "Please sign in and try again." },
  "unauthenticated": { code: "unauthenticated", status: 401, message: "Please sign in and try again." },
  "permission-denied": { code: "permission-denied", status: 403, message: "The app isn't allowed to do that. Its owner can check the Firebase permissions and security rules." },
  "PERMISSION_DENIED": { code: "permission-denied", status: 403, message: "The app isn't allowed to do that. Its owner can check the Firebase permissions and security rules." },
  "7": { code: "permission-denied", status: 403, message: "The app isn't allowed to do that. Its owner can check the Firebase permissions and security rules." },
  "not-found": { code: "not-found", status: 404, message: "We couldn't find that." },
  "NOT_FOUND": { code: "not-found", status: 404, message: "We couldn't find that." },
  "5": { code: "not-found", status: 404, message: "We couldn't find that." },
  "failed-precondition": { code: "failed-precondition", status: 500, message: "The app is missing a setting in its database, such as an index. Its owner can check the server log for the details." },
  "FAILED_PRECONDITION": { code: "failed-precondition", status: 500, message: "The app is missing a setting in its database, such as an index. Its owner can check the server log for the details." },
  "9": { code: "failed-precondition", status: 500, message: "The app is missing a setting in its database, such as an index. Its owner can check the server log for the details." },
  "unavailable": { code: "unavailable", status: 503, message: "The service is not reachable right now. Please try again in a moment." },
  "UNAVAILABLE": { code: "unavailable", status: 503, message: "The service is not reachable right now. Please try again in a moment." },
  "deadline-exceeded": { code: "unavailable", status: 503, message: "The service is not reachable right now. Please try again in a moment." },
  "14": { code: "unavailable", status: 503, message: "The service is not reachable right now. Please try again in a moment." },
  "app/no-app": { code: "misconfigured", status: 500, message: "The app isn't fully set up yet. Its owner can check the server log, which names what is missing." },
  "app/invalid-credential": { code: "misconfigured", status: 500, message: "The app isn't fully set up yet. Its owner can check the server log, which names what is missing." },
  "auth/invalid-credential": { code: "misconfigured", status: 500, message: "The app isn't fully set up yet. Its owner can check the server log, which names what is missing." },
};

const FALLBACK: Mapped = {
  code: "internal",
  status: 500,
  message: "Something went wrong on our side. Please try again.",
};

/** The error's own `code` (Firebase Admin and gRPC errors carry one), as a string, or undefined. */
export function routeErrorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string') return code;
  return typeof code === 'number' ? String(code) : undefined;
}

/** Logs the real error with where it happened. Never log what the person sent. */
function logRouteError(where: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${where}]`, routeErrorCode(error) ?? 'no-code', message);
}

/**
 * The response for a failed route: the real error goes to the server log, the caller gets
 * `{ error: shortCode, message }` and a fitting status.
 */
export function routeError(where: string, error: unknown): Response {
  logRouteError(where, error);
  const raw = routeErrorCode(error);
  const mapped =
    raw !== undefined && Object.prototype.hasOwnProperty.call(KNOWN, raw) ? KNOWN[raw] : FALLBACK;
  return Response.json({ error: mapped.code, message: mapped.message }, { status: mapped.status });
}

/**
 * A sentence for the person from a failed route's JSON body, naming the short code so it can be
 * reported. Use it in the browser after `!response.ok`.
 */
export function describeRouteError(body: unknown): string {
  const { error, message } = (body ?? {}) as { error?: unknown; message?: unknown };
  const text = typeof message === 'string' ? message : "Something went wrong on our side. Please try again.";
  return typeof error === 'string' ? `${text} (${error})` : text;
}
