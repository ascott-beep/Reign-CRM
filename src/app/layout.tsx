import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

// Self-hosted so the build never depends on reaching Google Fonts (Vercel's
// build once failed outright when it couldn't fetch this). Inter Tight ships
// from Google as a single variable file regardless of which static weight is
// requested, so one file covers the same 300 to 600 range as before.
const interTight = localFont({
  src: "./fonts/InterTight-Variable.woff2",
  weight: "300 600",
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Atlas", template: "%s · Atlas" },
  description: "Private equity executive recruitment CRM",
};

async function getWorkspaceBrand() {
  try {
    const workspace = await prisma.workspace.findFirst({ select: { brandAccent: true } });
    return workspace?.brandAccent ?? "#101e33";
  } catch {
    return "#101e33";
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brandAccent = await getWorkspaceBrand();
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;

  return (
    <html
      lang="en"
      data-theme={theme === "light" || theme === "dark" ? theme : undefined}
      className={interTight.variable}
      style={{ "--brand-accent": brandAccent } as React.CSSProperties}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
