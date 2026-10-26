import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getResume } from "@/lib/store";
import { TailorForm } from "./tailor-form";

export const metadata = { title: "Tailor resume — LoomShift" };

async function Guard({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const resume = getResume(user.id, (await params).id);
  if (!resume) notFound();
  return <TailorForm id={resume.id} title={resume.title} />;
}

export default function TailorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <Guard params={params} />
    </Suspense>
  );
}
