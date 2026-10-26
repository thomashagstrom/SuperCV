import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addTailoredVersion,
  createResume,
  createSession,
  deleteResume,
  deleteSession,
  renameResume,
  getResume,
  getUserBySession,
  listResumes,
  signUp,
  verifyCredentials,
} from "./store";
import { extractResumeText, MAX_FILE_BYTES } from "./extract";
import { addedLabel } from "./format";

beforeEach(() => {
  process.env.LOOMSHIFT_DATA_FILE = join(
    mkdtempSync(join(tmpdir(), "loomshift-")),
    "store.json",
  );
});

describe("a visitor can sign up with email and password, sign in and sign out", () => {
  it("signs up, then signs in with the same credentials", () => {
    const user = signUp("Ann@Example.com", "correct horse");
    expect(verifyCredentials("ann@example.com", "correct horse")).toEqual(user);
  });

  it("does not sign in with a wrong password or unknown email", () => {
    signUp("ann@example.com", "correct horse");
    expect(verifyCredentials("ann@example.com", "wrong")).toBeNull();
    expect(verifyCredentials("nobody@example.com", "correct horse")).toBeNull();
  });

  it("does not allow a second account with the same email", () => {
    signUp("ann@example.com", "correct horse");
    expect(() => signUp("ANN@example.com", "other pass")).toThrow();
  });

  it("does not store the password in plain text", async () => {
    signUp("ann@example.com", "correct horse");
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(process.env.LOOMSHIFT_DATA_FILE!, "utf8")).not.toContain(
      "correct horse",
    );
  });

  it("a session identifies the user until sign out, after which it identifies no one", () => {
    const user = signUp("ann@example.com", "correct horse");
    const token = createSession(user.id);
    expect(getUserBySession(token)).toEqual(user);
    deleteSession(token);
    expect(getUserBySession(token)).toBeNull();
    expect(getUserBySession(undefined)).toBeNull();
    expect(getUserBySession("forged")).toBeNull();
  });
});

describe("after signing in a user lands on an empty 'My resumes' workspace", () => {
  it("a new user has no resumes", () => {
    const user = signUp("ann@example.com", "correct horse");
    expect(listResumes(user.id)).toEqual([]);
  });
});

describe("a signed-in user only ever sees their own resumes and tailored versions", () => {
  it("never lists, fetches or tailors another user's resume", () => {
    const a = signUp("a@example.com", "password-a");
    const b = signUp("b@example.com", "password-b");
    const resume = createResume(a.id, "A's CV", "secret");
    addTailoredVersion(a.id, resume.id, "Engineer", "tailored");

    expect(listResumes(a.id)).toHaveLength(1);
    expect(getResume(a.id, resume.id)?.tailored).toHaveLength(1);

    expect(listResumes(b.id)).toEqual([]);
    expect(getResume(b.id, resume.id)).toBeNull();
    expect(addTailoredVersion(b.id, resume.id, "Spy", "x")).toBeNull();
    expect(getResume(a.id, resume.id)?.tailored).toHaveLength(1);
  });
});

describe("saved resumes appear in 'My resumes' with a name and a date added", () => {
  it("a created resume is listed with its title and createdAt, shown as an ADDED label", () => {
    const user = signUp("ann@example.com", "correct horse");
    const resume = createResume(user.id, "My CV", "text");
    const [listed] = listResumes(user.id);
    expect(listed.title).toBe("My CV");
    expect(listed.createdAt).toBe(resume.createdAt);
    expect(addedLabel("2026-05-12T10:00:00.000Z")).toBe("ADDED 12.05.2026");
  });
});

describe("a user can rename or delete a saved resume", () => {
  it("renames and deletes the owner's resume, and the list reflects it", () => {
    const user = signUp("ann@example.com", "correct horse");
    const resume = createResume(user.id, "Old", "text");
    expect(renameResume(user.id, resume.id, "New")?.title).toBe("New");
    expect(listResumes(user.id)[0].title).toBe("New");
    expect(deleteResume(user.id, resume.id)).toBe(true);
    expect(listResumes(user.id)).toEqual([]);
  });

  it("does not rename or delete another user's resume", () => {
    const a = signUp("a@example.com", "password-a");
    const b = signUp("b@example.com", "password-b");
    const resume = createResume(a.id, "A's CV", "text");
    expect(renameResume(b.id, resume.id, "Hacked")).toBeNull();
    expect(deleteResume(b.id, resume.id)).toBe(false);
    expect(getResume(a.id, resume.id)?.title).toBe("A's CV");
  });
});

describe("if a file cannot be read, the user sees a clear error and can paste instead", () => {
  it("returns an error mentioning pasting for a corrupt PDF or DOCX", async () => {
    const junk = new TextEncoder().encode("not a real document");
    for (const name of ["cv.pdf", "cv.docx"]) {
      const result = await extractResumeText(name, junk);
      expect(result).toHaveProperty("error");
      expect(result).not.toHaveProperty("text");
      expect((result as { error: string }).error).toMatch(/paste/i);
    }
  });

  it("rejects unsupported file types and oversized files", async () => {
    expect(await extractResumeText("cv.exe", new Uint8Array(1))).toHaveProperty("error");
    expect(
      await extractResumeText("cv.pdf", new Uint8Array(MAX_FILE_BYTES + 1)),
    ).toHaveProperty("error");
  });
});
