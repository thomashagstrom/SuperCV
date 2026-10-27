import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySession } from "./store";

export const SESSION_COOKIE = "loomshift_session";

export async function getCurrentUser() {
  const jar = await cookies();
  return await getUserBySession(jar.get(SESSION_COOKIE)?.value);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
