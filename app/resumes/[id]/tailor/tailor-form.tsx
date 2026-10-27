"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  saveTailoredAction,
  tailorResumeAction,
  type TailorState,
} from "../../../actions";
import { TailoredEditor } from "./editor";

const INPUT =
  "border border-foreground/40 bg-transparent p-3 text-base normal-case tracking-normal";
const LABEL = "flex flex-col gap-1 font-mono text-xs uppercase tracking-widest";

export function TailorForm({
  id,
  title,
  original,
}: {
  id: string;
  title: string;
  original: string;
}) {
  const [state, formAction, pending] = useActionState<TailorState, FormData>(
    tailorResumeAction,
    {},
  );
  // Controlled so a failed run keeps the posting for a retry.
  const [posting, setPosting] = useState({
    title: "",
    company: "",
    description: "",
  });
  const field = (name: keyof typeof posting) => ({
    name,
    value: posting[name],
    onChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setPosting({ ...posting, [name]: e.target.value }),
  });

  return (
    <div className="flex w-full flex-col gap-8">
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        Tailor resume
      </h1>
      <p className="font-mono text-xs text-muted">{title}</p>
      <input type="hidden" name="id" value={id} />
      <label className={LABEL}>
        Job title
        <input required maxLength={100} className={INPUT} {...field("title")} />
      </label>
      <label className={LABEL}>
        Company
        <input
          required
          maxLength={100}
          className={INPUT}
          {...field("company")}
        />
      </label>
      <label className={LABEL}>
        Job description
        <textarea required className={`${INPUT} min-h-48`} {...field("description")} />
      </label>
      <p role="alert" aria-live="polite" className="min-h-5 font-mono text-xs">
        {pending ? "Tailoring…" : state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-foreground p-3 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-60"
      >
        {pending ? "Tailoring…" : state.error ? "Retry" : "Tailor resume"}
      </button>
      {!pending && state.readout && (
        <p className="font-mono text-xs uppercase tracking-widest">
          {state.readout}
        </p>
      )}
      <p className="font-mono text-xs text-muted">
        <Link href="/resumes">Back to resumes</Link>
      </p>
    </form>
    {!pending && state.content && (
      <TailoredEditor
        key={state.content}
        original={original}
        initial={state.content}
        action={saveTailoredAction}
        submitLabel="Save tailored version"
        fields={{ id, ...posting, matched: String(state.matched ?? "") }}
      />
    )}
    </div>
  );
}
