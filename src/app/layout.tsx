import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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

  return (
    <html lang="en" className={inter.variable} style={{ "--brand-accent": brandAccent } as React.CSSProperties}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
