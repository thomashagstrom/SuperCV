"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type FormState } from "./actions";

const COPY = {
  "sign-in": {
    heading: "Sign in",
    submit: "Sign in",
    action: signInAction,
    switchText: "New here?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
    autoComplete: "current-password",
  },
  "sign-up": {
    heading: "Create your account",
    submit: "Create account",
    action: signUpAction,
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
    autoComplete: "new-password",
  },
} as const;

export function AuthForm({ mode }: { mode: keyof typeof COPY }) {
  const c = COPY[mode];
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    c.action,
    {},
  );
  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-5">
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        {c.heading}
      </h1>
      <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-widest">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="border border-foreground/40 bg-transparent p-3 text-base normal-case tracking-normal"
        />
      </label>
      <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-widest">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={mode === "sign-up" ? 8 : undefined}
          autoComplete={c.autoComplete}
          className="border border-foreground/40 bg-transparent p-3 text-base normal-case tracking-normal"
        />
      </label>
      {mode === "sign-up" && (
        <p className="font-mono text-xs text-muted">
          At least 8 characters. Your resumes are stored privately.
        </p>
      )}
      <p role="alert" className="min-h-5 font-mono text-xs">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground p-3 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-60"
      >
        {c.submit}
      </button>
      <p className="font-mono text-xs text-muted">
        {c.switchText} <Link href={c.switchHref}>{c.switchLabel}</Link>
      </p>
    </form>
  );
}
