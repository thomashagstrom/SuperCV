import Link from "next/link";
import { Suspense } from "react";
import { deleteResumeAction, renameResumeAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { addedLabel } from "@/lib/format";
import { listResumes } from "@/lib/store";

export const metadata = { title: "My resumes — LoomShift" };

const BUTTON =
  "rounded-full border border-foreground/40 px-3 py-1 font-mono text-xs uppercase tracking-widest";

async function Resumes() {
  const user = await requireUser();
  const resumes = await listResumes(user.id);
  return (
    <>
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        My resumes
      </h1>
      <Link
        href="/resumes/new"
        className="w-fit rounded-full bg-foreground px-5 py-3 font-mono text-xs uppercase tracking-widest text-background"
      >
        Add resume
      </Link>
      {resumes.length === 0 ? (
        <>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            No resumes yet.
          </p>
          <p className="font-mono text-xs text-muted">
            Add your existing resume to start tailoring it for jobs.
          </p>
        </>
      ) : (
        <ul className="flex flex-col gap-3">
          {resumes.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 border border-foreground/20 p-4"
            >
              <div>
                <span className="font-heading text-xl font-bold">{r.title}</span>
                <span className="ml-3 font-mono text-xs text-muted">
                  {r.tailored.length} tailored
                </span>
                <span className="ml-3 font-mono text-xs uppercase text-muted">
                  {addedLabel(r.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/resumes/${r.id}/tailor`} className={BUTTON}>
                  Tailor
                </Link>
                <form action={renameResumeAction} className="flex gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    name="title"
                    defaultValue={r.title}
                    required
                    maxLength={100}
                    aria-label={`Rename ${r.title}`}
                    className="border border-foreground/40 bg-transparent px-2 py-1 text-sm"
                  />
                  <button type="submit" className={BUTTON}>
                    Rename
                  </button>
                </form>
                <form action={deleteResumeAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className={BUTTON}>
                    Delete
                  </button>
                </form>
              </div>
              {r.tailored.length > 0 && (
                <ul aria-label={`Tailored versions of ${r.title}`} className="flex flex-col gap-1">
                  {r.tailored.map((v) => (
                    <li key={v.id} className="font-mono text-xs">
                      <Link href={`/resumes/${r.id}/versions/${v.id}`}>
                        {v.company ? `${v.company} · ` : ""}
                        {v.target} · {addedLabel(v.createdAt)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ResumesPage() {
  return (
    <Suspense fallback={null}>
      <Resumes />
    </Suspense>
  );
}
