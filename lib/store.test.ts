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
import { matchReadout, tailorResume } from "./tailor";

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

describe("a user can paste a job posting and get a tailored resume", () => {
  const cv = [
    "Ann Lee",
    "EXPERIENCE\nBaker at Oven Co 2019-2021\nBuilt dashboards in Python and SQL",
    "SKILLS\nGardening\nPython\nSQL",
  ].join("\n\n");
  const posting = {
    title: "Data Analyst",
    company: "Acme Co",
    description: "We need Python and SQL dashboards.",
  };

  it("reorders existing content, counts matched keywords and shows the MATCH readout", () => {
    const { content, matched } = tailorResume(cv, posting);
    expect(matched).toBe(3);
    expect(matchReadout(matched, posting.company)).toBe("MATCH 3 KEYWORDS · ACME CO");
    expect(content.indexOf("SKILLS")).toBeGreaterThan(-1);
    expect(content.indexOf("Python\nSQL")).toBeLessThan(content.indexOf("Gardening"));
  });

  it("never invents lines, employers, titles or dates absent from the original", () => {
    const { content } = tailorResume(cv, posting);
    const original = cv.split("\n").filter(Boolean).sort();
    expect(content.split("\n").filter(Boolean).sort()).toEqual(original);
    expect(content).not.toContain("Acme");
    expect(content).not.toContain("Data Analyst");
  });

  it("stores the version with company and count, and not for another user's resume", async () => {
    const a = await signUp("a@example.com", "password-a");
    const b = await signUp("b@example.com", "password-b");
    const resume = await createResume(a.id, "CV", cv);
    const { content, matched } = tailorResume(cv, posting);
    await addTailoredVersion(a.id, resume.id, posting.title, content, {
      company: posting.company,
      matched,
    });
    expect((await getResume(a.id, resume.id))?.tailored[0]).toMatchObject({
      company: "Acme Co",
      matched: 3,
    });
    expect(await addTailoredVersion(b.id, resume.id, "x", "x")).toBeNull();
  });

  it("fails on a posting without keywords, leaving the resume unchanged and retryable", async () => {
    const a = await signUp("a@example.com", "password-a");
    const resume = await createResume(a.id, "CV", cv);
    expect(() =>
      tailorResume(cv, { title: "", company: "X", description: "the and" }),
    ).toThrow();
    expect(await getResume(a.id, resume.id)).toMatchObject({ content: cv, tailored: [] });
    expect(tailorResume(cv, posting).matched).toBe(3);
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

describe("a newly created account is kept in a durable store outside the deployment folder", () => {
  // Minimal fake of the Upstash Redis REST API: one shared key/value map that
  // outlives every call, like a hosted database outlives a deploy or restart.
  const remote = new Map<string, string>();
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const [cmd, key, value] = JSON.parse(String(init.body)) as string[];
    if (cmd === "SET") remote.set(key, value);
    return Response.json({ result: cmd === "GET" ? (remote.get(key) ?? null) : "OK" });
  });

  beforeEach(() => {
    remote.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://db.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    // The deployment folder is unwritable: any file write would throw.
    process.env.LOOMSHIFT_DATA_FILE = "/proc/nope/store.json";
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.unstubAllGlobals();
  });

  it("signs up and signs in without writing to the local file path", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    expect(await verifyCredentials("ann@example.com", "correct horse")).toEqual(user);
    const { existsSync } = await import("node:fs");
    expect(existsSync("/proc/nope")).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("still has the account, session and resumes when read back later", async () => {
    const user = await signUp("ann@example.com", "correct horse");
    const token = await createSession(user.id);
    await createResume(user.id, "My CV", "text");
    // Nothing is held in memory between calls: everything is read back from the store.
    expect(await getUserBySession(token)).toEqual(user);
    expect((await listResumes(user.id)).map((r) => r.title)).toEqual(["My CV"]);
  });

  it("does not keep the password in plain text in the remote store", async () => {
    await signUp("ann@example.com", "correct horse");
    expect([...remote.values()].join()).not.toContain("correct horse");
  });

  it("reports a failing remote store as an error instead of silently losing the account", async () => {
    fetchMock.mockResolvedValueOnce(new Response("down", { status: 500 }));
    await expect(signUp("ann@example.com", "correct horse")).rejects.toThrow(/500/);
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
