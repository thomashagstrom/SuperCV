import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import { Menu } from "./menu";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-ui",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LoomShift",
  description: "Keep your resumes and tailor them for each job.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Link
            href="/"
            className="font-heading text-lg font-black uppercase tracking-tight"
          >
            LoomShift
          </Link>
          <Menu />
        </header>
        <main className="flex flex-1 flex-col gap-6 px-6 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
