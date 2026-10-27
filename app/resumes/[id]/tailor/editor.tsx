"use client";

import { useActionState, useState } from "react";
import type { TailorState } from "../../../actions";
import { changedLines } from "@/lib/diff";

// The original sits beside an editable copy; lines that differ are highlighted.
export function TailoredEditor({
  original,
  initial,
  action,
  fields,
  submitLabel,
}: {
  original: string;
  initial: string;
  action: (prev: TailorState, formData: FormData) => Promise<TailorState>;
  fields: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<TailorState, FormData>(
    action,
    {},
  );
  const [content, setContent] = useState(initial);
  const changed = changedLines(original, content);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-label="Original resume" className="flex flex-col gap-1">
          <h2 className="font-mono text-xs uppercase tracking-widest">Original</h2>
          <pre className="whitespace-pre-wrap border border-foreground/20 p-4 text-sm">
            {original}
          </pre>
        </section>
        <section aria-label="Tailored resume" className="flex flex-col gap-1">
          <h2 className="font-mono text-xs uppercase tracking-widest">
            Tailored (editable)
          </h2>
          <pre
            aria-label="Changed lines"
            className="whitespace-pre-wrap border border-foreground/20 p-4 text-sm"
          >
            {content.split("\n").map((line, i) => (
              <mark
                key={i}
                className={changed.has(i) ? "bg-foreground/20" : "bg-transparent"}
              >
                {line}
                {"\n"}
              </mark>
            ))}
          </pre>
          <textarea
            name="content"
            aria-label="Tailored resume text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-64 border border-foreground/40 bg-transparent p-3 text-sm"
          />
        </section>
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 font-mono text-xs">
        {pending ? "Saving…" : (state.error ?? state.readout)}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-full bg-foreground px-5 py-3 font-mono text-xs uppercase tracking-widest text-background disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
