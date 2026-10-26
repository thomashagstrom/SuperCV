"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { addResumeAction, extractFileAction, type FormState } from "../../actions";

const INPUT =
  "border border-foreground/40 bg-transparent p-3 text-base normal-case tracking-normal";
const LABEL = "flex flex-col gap-1 font-mono text-xs uppercase tracking-widest";

export function AddResumeForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addResumeAction,
    {},
  );
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState<string>();
  const [reading, setReading] = useState(false);

  async function onFile(file: File | undefined) {
    setFileError(undefined);
    if (!file) return;
    setReading(true);
    const body = new FormData();
    body.set("file", file);
    const result = await extractFileAction(body);
    setReading(false);
    if (result.text) setContent(result.text);
    else setFileError(result.error);
  }

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-5">
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        Add resume
      </h1>
      <label className={LABEL}>
        Title
        <input name="title" required maxLength={100} className={INPUT} />
      </label>
      <label className={LABEL}>
        Resume text
        <textarea
          name="content"
          required
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`${INPUT} min-h-64`}
        />
        <span className="normal-case tracking-normal text-muted">
          Paste your resume as plain text
        </span>
      </label>
      <label className={LABEL}>
        Or upload a file
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="text-base normal-case tracking-normal"
        />
        <span className="normal-case tracking-normal text-muted">
          PDF or DOCX, up to 5 MB. The text appears above for you to check.
        </span>
      </label>
      <p role="alert" aria-live="polite" className="min-h-5 font-mono text-xs">
        {reading ? "Reading file…" : (fileError ?? state.error)}
      </p>
      <button
        type="submit"
        disabled={pending || reading}
        className="rounded-full bg-foreground p-3 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save resume"}
      </button>
      <p className="font-mono text-xs text-muted">
        <Link href="/resumes">Cancel</Link>
      </p>
    </form>
  );
}
