import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AddResumeForm } from "./add-resume-form";

export const metadata = { title: "Add resume — LoomShift" };

async function Guard() {
  await requireUser();
  return <AddResumeForm />;
}

export default function NewResumePage() {
  return (
    <Suspense fallback={null}>
      <Guard />
    </Suspense>
  );
}
