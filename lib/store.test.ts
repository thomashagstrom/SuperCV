import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  it("signs up, then signs in with the same credentials", async () => {
    const user = await signUp("Ann@Example.com", "correct horse");
    expect(await verifyCredentials("ann@example.com", "correct horse")).toEqual(user);
  });

  it("does not sign in with a wrong password or unknown email", async () => {
    await signUp("ann@example.com", "correct horse");
    expect(await verifyCredentials("ann@example.com", "wrong")).toBeNull();
    expect(await verifyCredentials("nobody@example.com", "correct horse")).toBeNull();
  });

  it("does not allow a second account with the same email", async () => {
    await signUp("ann@example.com", "correct horse");
    await expect(signUp("ANN@example.com", "other pass")).rejects.toThrow();
  });

  it("does not store the password in plain text", async () => {
    await signUp("ann@example.com", "correct horse");
    const { readFileSync } = await import("node:fs");
    expect(readFileSync(process.env.LOOMSHIFT_DATA_FILE!, "utf8")).not.toContain(
      "correct horse",
    );
  });

  it("a session identifies the user until sign out, after which it identifies no one", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    const token = await createSession(user.id);
    expect(await getUserBySession(token)).toEqual(user);
    await deleteSession(token);
    expect(await getUserBySession(token)).toBeNull();
    expect(await getUserBySession(undefined)).toBeNull();
    expect(await getUserBySession("forged")).toBeNull();
  });
});

describe("accounts and resumes are kept in durable storage, not the deployment folder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  function stubKv() {
    const db = new Map<string, string>();
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const [, op, key] = new URL(url).pathname.split("/");
      if (op === "set") db.set(key, String(init.body));
      return new Response(JSON.stringify({ result: db.get(key) ?? null }));
    });
    process.env.KV_REST_API_URL = "https://kv.example.com";
    process.env.KV_REST_API_TOKEN = "token";
    vi.stubGlobal("fetch", fetchMock);
    return db;
  }

  it("signs up without touching the local file system even when it is unwritable", async () => {
    stubKv();
    // A path below a regular file can never be created: mkdir would throw ENOENT/ENOTDIR.
    process.env.LOOMSHIFT_DATA_FILE = join(process.execPath, "nope", "store.json");
    const user = await signUp("ann@example.com", "correct horse");
    expect(user.email).toBe("ann@example.com");
  });

  it("a new account and its resumes are still there after a restart", async () => {
    const db = stubKv();
    const user = await signUp("ann@example.com", "correct horse");
    await createResume(user.id, "My CV", "text");

    // A restart loses all in-process state; only the external store remains.
    vi.resetModules();
    const fresh = await import("./store");
    expect(await fresh.verifyCredentials("ann@example.com", "correct horse")).toEqual(user);
    expect((await fresh.listResumes(user.id)).map((r) => r.title)).toEqual(["My CV"]);
    expect(db.get("loomshift-store")).not.toContain("correct horse");
  });
});

describe("after signing in a user lands on an empty 'My resumes' workspace", () => {
  it("a new user has no resumes", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    expect(await listResumes(user.id)).toEqual([]);
  });
});

describe("a signed-in user only ever sees their own resumes and tailored versions", () => {
  it("never lists, fetches or tailors another user's resume", async () => {
    const a = await signUp("a@example.com", "password-a");
    const b = await signUp("b@example.com", "password-b");
    const resume = await createResume(a.id, "A's CV", "secret");
    await addTailoredVersion(a.id, resume.id, "Engineer", "tailored");

    expect(await listResumes(a.id)).toHaveLength(1);
    expect((await getResume(a.id, resume.id))?.tailored).toHaveLength(1);

    expect(await listResumes(b.id)).toEqual([]);
    expect(await getResume(b.id, resume.id)).toBeNull();
    expect(await addTailoredVersion(b.id, resume.id, "Spy", "x")).toBeNull();
    expect((await getResume(a.id, resume.id))?.tailored).toHaveLength(1);
  });
});

describe("saved resumes appear in 'My resumes' with a name and a date added", () => {
  it("a created resume is listed with its title and createdAt, shown as an ADDED label", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    const resume = await createResume(user.id, "My CV", "text");
    const [listed] = await listResumes(user.id);
    expect(listed.title).toBe("My CV");
    expect(listed.createdAt).toBe(resume.createdAt);
    expect(addedLabel("2026-05-12T10:00:00.000Z")).toBe("ADDED 12.05.2026");
  });
});

describe("a user can rename or delete a saved resume", () => {
  it("renames and deletes the owner's resume, and the list reflects it", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    const resume = await createResume(user.id, "Old", "text");
    expect((await renameResume(user.id, resume.id, "New"))?.title).toBe("New");
    expect((await listResumes(user.id))[0].title).toBe("New");
    expect(await deleteResume(user.id, resume.id)).toBe(true);
    expect(await listResumes(user.id)).toEqual([]);
  });

  it("does not rename or delete another user's resume", async () => {
    const a = await signUp("a@example.com", "password-a");
    const b = await signUp("b@example.com", "password-b");
    const resume = await createResume(a.id, "A's CV", "text");
    expect(await renameResume(b.id, resume.id, "Hacked")).toBeNull();
    expect(await deleteResume(b.id, resume.id)).toBe(false);
    expect((await getResume(a.id, resume.id))?.title).toBe("A's CV");
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
