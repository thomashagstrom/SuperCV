import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { signInUser, signUpUser } from "@/lib/accounts";
import { proxy } from "../proxy";
import {
  createSessionToken,
  readSessionToken,
  SESSION_COOKIE,
} from "@/lib/session";
import { findUserById, insertResume, listResumes } from "@/lib/store";

beforeEach(() => {
  process.env.DATA_FILE = join(mkdtempSync(join(tmpdir(), "loomshift-")), "db.json");
});

function signUp(email: string) {
  const result = signUpUser(email, "correct horse");
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

describe("a new user can sign up with email and password and lands on their own dashboard", () => {
  it("creates an account whose session token resolves to that user", () => {
    const user = signUp("a@example.com");
    const userId = readSessionToken(createSessionToken(user.id));
    expect(findUserById(userId!)?.email).toBe("a@example.com");
  });

  it("stores a hash, never the password", () => {
    const user = signUp("a@example.com");
    expect(user.passwordHash).not.toContain("correct horse");
  });

  it("signs in with the right password and refuses the wrong one", () => {
    signUp("a@example.com");
    expect(signInUser("A@example.com", "correct horse").ok).toBe(true);
    expect(signInUser("a@example.com", "wrong password").ok).toBe(false);
  });

  it("does not create an account with a short password or a duplicate email", () => {
    expect(signUpUser("a@example.com", "short").ok).toBe(false);
    signUp("a@example.com");
    expect(signUpUser("a@example.com", "correct horse").ok).toBe(false);
  });
});

describe("a signed-out user who opens the dashboard is sent to the sign-in page", () => {
  const open = (cookie?: string) =>
    proxy(
      new NextRequest("http://localhost/dashboard", {
        headers: cookie ? { cookie } : {},
      }),
    );

  it("redirects without a session", () => {
    const res = open();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/sign-in");
  });

  it("redirects with a forged or expired session", () => {
    expect(open(`${SESSION_COOKIE}=forged.token`).status).toBe(307);
    const old = createSessionToken("u1", 0);
    expect(readSessionToken(old)).toBeNull();
    expect(open(`${SESSION_COOKIE}=${old}`).status).toBe(307);
  });

  it("lets a signed-in user through", () => {
    const res = open(`${SESSION_COOKIE}=${createSessionToken("u1")}`);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("a user only ever sees their own resumes", () => {
  it("does not list user A's resumes to user B", () => {
    const a = signUp("a@example.com");
    const b = signUp("b@example.com");
    insertResume(a.id, "A's resume");
    expect(listResumes(a.id).map((r) => r.title)).toEqual(["A's resume"]);
    expect(listResumes(b.id)).toEqual([]);
  });
});
