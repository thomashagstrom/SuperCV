import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSessionToken, SESSION_COOKIE } from "./session";
import { findUserById } from "./store";

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return readSessionToken(token);
}

// Resolves the signed-in user or sends the visitor to the sign-in page.
export async function requireUser() {
  const userId = await getSessionUserId();
  const user = userId ? findUserById(userId) : undefined;
  if (!user) redirect("/sign-in");
  return { id: user.id, email: user.email };
}
