import { Suspense } from "react";
import { createResume, signOut } from "../actions";
import { requireUser } from "@/lib/auth";
import { listResumes } from "@/lib/store";

export const metadata = { title: "My resumes" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading your resumes…</p>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const resumes = listResumes(user.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My resumes</h1>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <span>{user.email}</span>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </header>
      <form action={createResume} className="flex gap-2">
        <input
          name="title"
          required
          aria-label="Resume title"
          placeholder="Resume title"
          className="flex-1 rounded border border-current/30 p-2"
        />
        <button
          type="submit"
          className="rounded bg-[var(--accent)] px-4 text-[var(--accent-foreground)]"
        >
          New resume
        </button>
      </form>
      {resumes.length === 0 ? (
        <p>No resumes yet</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {resumes.map((r) => (
            <li key={r.id} className="rounded border border-current/30 p-3">
              {r.title}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
