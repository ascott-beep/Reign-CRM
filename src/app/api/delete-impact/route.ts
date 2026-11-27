import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/permissions";
import { getDeleteImpact, type DeletableType } from "@/lib/delete";

const VALID: DeletableType[] = ["ORGANIZATION", "PERSON", "MANDATE", "OPPORTUNITY"];

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const type = request.nextUrl.searchParams.get("type") as DeletableType | null;
  const id = request.nextUrl.searchParams.get("id");
  if (!type || !VALID.includes(type) || !id) return NextResponse.json({ error: "Missing or invalid type/id" }, { status: 400 });

  const impact = await getDeleteImpact(type, id, user.workspaceId);
  return NextResponse.json(impact);
}
