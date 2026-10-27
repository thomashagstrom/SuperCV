import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deleteTailoredAction, updateTailoredAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { addedLabel } from "@/lib/format";
import { getResume } from "@/lib/store";
import { TailoredEditor } from "../../tailor/editor";

export const metadata = { title: "Tailored version — LoomShift" };

async function Version({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  const user = await requireUser();
  const { id, versionId } = await params;
  const resume = await getResume(user.id, id);
  const version = resume?.tailored.find((v) => v.id === versionId);
  if (!resume || !version) notFound();
  return (
    <>
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        {version.target}
      </h1>
      <p className="font-mono text-xs text-muted">
        {version.company ? `${version.company} · ` : ""}
        {resume.title} · {addedLabel(version.createdAt)}
      </p>
      <TailoredEditor
        original={resume.content}
        initial={version.content}
        action={updateTailoredAction}
        submitLabel="Save changes"
        fields={{ id: resume.id, versionId: version.id }}
      />
      <form action={deleteTailoredAction}>
        <input type="hidden" name="id" value={resume.id} />
        <input type="hidden" name="versionId" value={version.id} />
        <button
          type="submit"
          className="rounded-full border border-foreground/40 px-3 py-1 font-mono text-xs uppercase tracking-widest"
        >
          Delete version
        </button>
      </form>
      <p className="font-mono text-xs text-muted">
        <Link href="/resumes">Back to resumes</Link>
      </p>
    </>
  );
}

export default function VersionPage({
  params,
}: {
  params: Promise<{ id: string; versionId: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Version params={params} />
    </Suspense>
  );
}
