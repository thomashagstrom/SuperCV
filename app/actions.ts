"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";
import {
  createSession,
  deleteSession,
  signUp,
  verifyCredentials,
} from "@/lib/store";

export type FormState = { error?: string };

const MIN_PASSWORD_LENGTH = 8;

async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  let userId: string;
  try {
    userId = signUp(email, password).id;
  } catch (e) {
    return { error: (e as Error).message };
  }
  await startSession(userId);
  redirect("/resumes");
}

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = verifyCredentials(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!user) return { error: "Incorrect email or password." };
  await startSession(user.id);
  redirect("/resumes");
}

export async function signOutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
