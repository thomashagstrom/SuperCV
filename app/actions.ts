"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signInUser, signUpUser, type AuthResult } from "@/lib/accounts";
import { requireUser } from "@/lib/auth";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";
import { insertResume } from "@/lib/store";

export type FormState = { error?: string };

async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

async function finish(result: AuthResult): Promise<FormState> {
  if (!result.ok) return { error: result.error };
  await startSession(result.user.id);
  redirect("/dashboard");
}

export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return finish(
    signUpUser(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
}

export async function signIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  return finish(
    signInUser(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    ),
  );
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/sign-in");
}

export async function createResume(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (title) insertResume(user.id, title);
  redirect("/dashboard");
}
