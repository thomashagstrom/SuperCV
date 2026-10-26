"use client";

import Link from "next/link";
import { useState } from "react";
import { signOutAction } from "./actions";

export function Menu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background"
      >
        <span aria-hidden className="font-mono text-xl leading-none">
          {open ? "×" : "+"}
        </span>
      </button>
      {open && (
        <nav
          id="site-menu"
          className="absolute right-0 mt-3 flex w-48 flex-col gap-1 border border-foreground/20 bg-background p-3 font-mono text-xs uppercase tracking-widest"
        >
          <Link href="/resumes" onClick={() => setOpen(false)}>
            My resumes
          </Link>
          <Link href="/account" onClick={() => setOpen(false)}>
            Account
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="uppercase tracking-widest">
              Sign out
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
