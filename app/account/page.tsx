import { Suspense } from "react";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Account — LoomShift" };

async function Account() {
  const user = await requireUser();
  return (
    <>
      <h1 className="font-heading text-5xl font-black uppercase leading-none">
        Account
      </h1>
      <p className="font-mono text-xs uppercase tracking-widest">
        {user.email}
      </p>
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <Account />
    </Suspense>
  );
}
