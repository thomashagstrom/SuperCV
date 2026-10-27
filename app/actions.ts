"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { extractResumeText } from "@/lib/extract";
import { matchReadout, tailorResume } from "@/lib/tailor";
import {
  addTailoredVersion,
  getResume,
  createResume,
  createSession,
  deleteResume,
  deleteSession,
  deleteTailoredVersion,
  renameResume,
  updateTailoredVersion,
  signUp,
  verifyCredentials,
} from "@/lib/store";

export type FormState = { error?: string };

const MIN_PASSWORD_LENGTH = 8;
const DUPLICATE_EMAIL = "An account with this email already exists.";

async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSession(userId), {
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
  try {
    const user = await signUp(email, password);
    await startSession(user.id);
  } catch (e) {
    if ((e as Error).message === DUPLICATE_EMAIL) return { error: DUPLICATE_EMAIL };
    console.error("Sign-up failed", e);
    return { error: "We couldn't create your account right now. Please try again." };
  }
  redirect("/resumes");
}

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await verifyCredentials(
      String(formData.get("email") ?? ""),
      String(formData.get("password") ?? ""),
    );
    if (!user) return { error: "Incorrect email or password." };
    await startSession(user.id);
  } catch (e) {
    console.error("Sign-in failed", e);
    return { error: "We couldn't sign you in right now. Please try again." };
  }
  redirect("/resumes");
}

const MAX_TITLE_LENGTH = 100;

export type ExtractState = { text?: string; error?: string };

export async function extractFileAction(
  formData: FormData,
): Promise<ExtractState> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF or DOCX file." };
  }
  return extractResumeText(file.name, new Uint8Array(await file.arrayBuffer()));
}

export async function addResumeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title) return { error: "Give your resume a title." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be at most ${MAX_TITLE_LENGTH} characters.` };
  }
  if (!content) return { error: "Paste your resume text or upload a file." };
  await createResume(user.id, title, content);
  revalidatePath("/resumes");
  redirect("/resumes");
}

export type TailorState = {
  error?: string;
  readout?: string;
  content?: string;
  matched?: number;
};

export async function tailorResumeAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  const user = await requireUser();
  const posting = {
    title: String(formData.get("title") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
  if (!posting.title || !posting.company || !posting.description) {
    return { error: "Enter the job title, company and description." };
  }
  const resume = await getResume(user.id, String(formData.get("id") ?? ""));
  if (!resume) return { error: "Resume not found." };
  try {
    const { content, matched } = tailorResume(resume.content, posting);
    return {
      content,
      matched,
      readout: matchReadout(matched, posting.company),
    };
  } catch (e) {
    return { error: `Tailoring failed: ${(e as Error).message} Try again.` };
  }
}

// The tailored text is only stored when the user saves it after reviewing.
export async function saveTailoredAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "The tailored resume can't be empty." };
  const matched = Number(formData.get("matched"));
  const version = await addTailoredVersion(
    user.id,
    String(formData.get("id") ?? ""),
    String(formData.get("title") ?? "").trim(),
    content,
    {
      company: String(formData.get("company") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      matched: Number.isFinite(matched) ? matched : undefined,
    },
  );
  if (!version) return { error: "Resume not found." };
  revalidatePath("/resumes");
  redirect(`/resumes/${String(formData.get("id"))}/versions/${version.id}`);
}

export async function updateTailoredAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "The tailored resume can't be empty." };
  const version = await updateTailoredVersion(
    user.id,
    String(formData.get("id") ?? ""),
    String(formData.get("versionId") ?? ""),
    content,
  );
  if (!version) return { error: "Tailored version not found." };
  revalidatePath("/resumes");
  return { content, readout: "Saved." };
}

export async function deleteTailoredAction(formData: FormData) {
  const user = await requireUser();
  await deleteTailoredVersion(
    user.id,
    String(formData.get("id") ?? ""),
    String(formData.get("versionId") ?? ""),
  );
  revalidatePath("/resumes");
  redirect("/resumes");
}

export async function renameResumeAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title || title.length > MAX_TITLE_LENGTH) return;
  await renameResume(user.id, String(formData.get("id") ?? ""), title);
  revalidatePath("/resumes");
}

export async function deleteResumeAction(formData: FormData) {
  const user = await requireUser();
  await deleteResume(user.id, String(formData.get("id") ?? ""));
  revalidatePath("/resumes");
}

export async function signOutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
