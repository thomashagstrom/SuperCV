import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listResumes } from "@/lib/store";

export const metadata = { title: "My resumes — LoomShift" };

async function Resumes() {
  const user = await requireUser();
  const resumes = listResumes(user.id);
  return (
    <>
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        My resumes
      </h1>
      {resumes.length === 0 ? (
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          No resumes yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {resumes.map((r) => (
            <li key={r.id} className="border border-foreground/20 p-4">
              <span className="font-heading text-xl font-bold">{r.title}</span>
              <span className="ml-3 font-mono text-xs text-muted">
                {r.tailored.length} tailored
              </span>
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
