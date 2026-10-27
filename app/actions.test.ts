import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { signUpAction } from "./actions";

function form(email: string, password: string) {
  const f = new FormData();
  f.set("email", email);
  f.set("password", password);
  return f;
}

let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  jar.set.mockClear();
  logged = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logged.mockRestore();
});

describe("signing up on a host with a read-only deployment folder", () => {
  it("shows a friendly message, hides the raw system error and logs the failure", async () => {
    // A regular file as the parent directory makes every write fail.
    const blocker = join(mkdtempSync(join(tmpdir(), "loomshift-")), "file");
    writeFileSync(blocker, "");
    process.env.LOOMSHIFT_DATA_FILE = join(blocker, "store.json");
    const state = await signUpAction({}, form("ann@example.com", "correct horse"));
    expect(state.error).toMatch(/couldn't create your account/i);
    expect(state.error).not.toMatch(/ENOENT|ENOTDIR|mkdir|loomshift-|\.data/);
    expect(jar.set).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith("Sign-up failed", expect.any(Error));
  });

  it("creates the account and signs the user in when storage works", async () => {
    process.env.LOOMSHIFT_DATA_FILE = join(
      mkdtempSync(join(tmpdir(), "loomshift-")),
      "store.json",
    );
    await expect(
      signUpAction({}, form("ann@example.com", "correct horse")),
    ).rejects.toThrow("REDIRECT:/resumes");
    expect(jar.set).toHaveBeenCalledOnce();
    expect(logged).not.toHaveBeenCalled();
  });

  it("tells the user a duplicate email is taken without logging a failure", async () => {
    process.env.LOOMSHIFT_DATA_FILE = join(
      mkdtempSync(join(tmpdir(), "loomshift-")),
      "store.json",
    );
    await expect(
      signUpAction({}, form("ann@example.com", "correct horse")),
    ).rejects.toThrow("REDIRECT");
    const state = await signUpAction({}, form("ann@example.com", "correct horse"));
    expect(state.error).toMatch(/already exists/i);
    expect(logged).not.toHaveBeenCalled();
  });
});
