"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "./actions";

type Props = {
  mode: "sign-in" | "sign-up";
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [show, setShow] = useState(false);
  const isSignUp = mode === "sign-up";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">
        {isSignUp ? "Create your account" : "Sign in"}
      </h1>
      <form action={formAction} className="flex flex-col gap-4">
        {state.error && (
          <p role="alert" className="rounded border border-red-600 p-2 text-sm">
            {state.error}
          </p>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-current/30 p-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={isSignUp ? 8 : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="rounded border border-current/30 p-2"
          />
          {isSignUp && (
            <span className="text-[var(--muted)]">At least 8 characters.</span>
          )}
        </label>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          className="self-start text-sm underline"
        >
          {show ? "Hide password" : "Show password"}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-[var(--accent)] p-2 text-[var(--accent-foreground)]"
        >
          {isSignUp ? "Create account" : "Sign in"}
        </button>
      </form>
      {isSignUp && (
        <p className="text-sm text-[var(--muted)]">
          Your resumes are private to you.
        </p>
      )}
      <p className="text-sm">
        {isSignUp ? (
          <Link href="/sign-in">Already have an account? Sign in</Link>
        ) : (
          <Link href="/sign-up">New here? Create an account</Link>
        )}
      </p>
    </main>
  );
}
