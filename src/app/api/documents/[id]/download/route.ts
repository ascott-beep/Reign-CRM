import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFileFromStorage } from "@/lib/storage";
import type { SessionUser } from "@/lib/permissions";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  const document = await prisma.document.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (document.restricted && user.role === "READ_ONLY") {
    return NextResponse.json({ error: "This document is restricted." }, { status: 403 });
  }

  const data = await readFileFromStorage(document.storageKey).catch(() => null);
  if (!data) {
    return NextResponse.json({ error: "File not available in this environment (demo/seed document metadata only)." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.originalFilename}"`,
      "Content-Length": String(document.size),
    },
  });
}
