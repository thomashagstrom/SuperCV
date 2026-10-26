import { afterEach, describe, expect, it, vi } from "vitest";

const jar = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn(),
  SESSION_COOKIE: "loomshift_session",
}));
vi.mock("@/lib/extract", () => ({ extractResumeText: vi.fn() }));

import { signUpAction } from "./actions";

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  vi.restoreAllMocks();
});

describe("if sign-up fails the user sees a friendly error and the failure is recorded", () => {
  it("shows no raw system error and logs the failure", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    process.env.KV_REST_API_TOKEN = "t";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ENOENT: no such file or directory, mkdir '/var/task/.data'");
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const state = await signUpAction({}, form("ann@example.com", "correct horse"));

    expect(state.error).toBeTruthy();
    expect(state.error).not.toMatch(/ENOENT|var\/task|mkdir/);
    expect(log).toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });
});
