import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/lib/permissions";
import { buildPersonDataExport } from "@/lib/gdpr";
import { writeAuditLog } from "@/lib/audit";

/** Section 10.1 "Download data" — everything held on a person, for admins only. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only administrators can download a person's data." }, { status: 403 });

  const { id } = await params;
  const data = await buildPersonDataExport(id, user.workspaceId);

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Person", entityId: id, action: "EXPORT" });

  const filename = `${data.profile.firstName}-${data.profile.lastName}-data-export.json`.replace(/[^a-z0-9.-]+/gi, "-");
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${filename}"` },
  });
}
