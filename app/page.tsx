import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">LoomShift</h1>
      <p className="text-[var(--muted)]">Keep your resumes private to you.</p>
      <nav className="flex gap-4">
        <Link href="/sign-in">Sign in</Link>
        <Link href="/sign-up">Sign up</Link>
        <Link href="/dashboard">My resumes</Link>
      </nav>
    </main>
  );
}
