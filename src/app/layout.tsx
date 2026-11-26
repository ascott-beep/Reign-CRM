import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reign Partners CRM",
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
