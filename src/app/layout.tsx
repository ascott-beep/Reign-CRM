import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reign Partners CRM",
  description: "Private equity executive recruitment CRM",
};

async function getWorkspaceBrand() {
  try {
    const workspace = await prisma.workspace.findFirst({ select: { brandAccent: true } });
    return workspace?.brandAccent ?? "#1c2b4a";
  } catch {
    return "#1c2b4a";
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brandAccent = await getWorkspaceBrand();

  return (
    <html lang="en" style={{ "--brand-accent": brandAccent } as React.CSSProperties}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
