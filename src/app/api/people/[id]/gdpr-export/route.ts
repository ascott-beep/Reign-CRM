import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionUser } from "@/lib/permissions";
import { buildPersonDataExport } from "@/lib/gdpr";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/datetime";
import { label } from "@/lib/labels";
import { writeAuditLog } from "@/lib/audit";

export const CATEGORIES = ["profile", "consent", "searches", "activity", "emails", "documents"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Screen 24 (DlgR4Gdpr) — per-category counts shown next to each tick box. */
function summarise(data: Awaited<ReturnType<typeof buildPersonDataExport>>) {
  const emails = data.activityAndNotes.filter((a) => a.type === "EMAIL");
  const nonEmailActivity = data.activityAndNotes.filter((a) => a.type !== "EMAIL");
  return {
    consent: data.consentAndLegalBasis
      ? `${data.consentAndLegalBasis.legalBasis ? label(data.consentAndLegalBasis.legalBasis) : "No legal basis recorded"}${
          data.consentAndLegalBasis.consentGrantedDate ? ` · recorded ${formatDate(data.consentAndLegalBasis.consentGrantedDate)}` : ""
        }`
      : "No candidate record",
    searches: `${data.searchesTheyWereOn.length} search${data.searchesTheyWereOn.length === 1 ? "" : "es"}`,
    activity: `${nonEmailActivity.length} item${nonEmailActivity.length === 1 ? "" : "s"}`,
    emails: `${emails.length} email${emails.length === 1 ? "" : "s"}${data.hasPrivateEmails ? ", including private ones" : ""}`,
    documents: `${data.documents.length} document${data.documents.length === 1 ? "" : "s"}`,
  };
}

function filterByCategories(data: Awaited<ReturnType<typeof buildPersonDataExport>>, categories: Category[]) {
  const result: Record<string, unknown> = { exportedAt: data.exportedAt };
  if (categories.includes("profile")) result.profile = data.profile;
  if (categories.includes("consent")) result.consentAndLegalBasis = data.consentAndLegalBasis;
  if (categories.includes("searches")) {
    result.searchesTheyWereOn = data.searchesTheyWereOn;
    result.placements = data.placements;
    result.employmentHistory = data.employmentHistory;
  }
  if (categories.includes("activity")) result.activityAndNotes = data.activityAndNotes.filter((a) => a.type !== "EMAIL");
  if (categories.includes("emails")) result.emails = data.activityAndNotes.filter((a) => a.type === "EMAIL");
  if (categories.includes("documents")) result.documents = data.documents;
  return result;
}

function toSpreadsheet(filtered: Record<string, unknown>): string {
  const sections: string[] = [];
  for (const [key, value] of Object.entries(filtered)) {
    if (key === "exportedAt" || value == null) continue;
    sections.push(`## ${key}`);
    const rows = Array.isArray(value) ? value : [value];
    if (rows.length === 0) {
      sections.push("(none)");
    } else {
      const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r as Record<string, unknown>))));
      sections.push(toCsv(rows as Record<string, unknown>[], columns).trimEnd());
    }
    sections.push("");
  }
  return sections.join("\n");
}

/** Section 10.1 / Round 4 screen 24 "Download data" — everything held on a person, for admins only. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Only administrators can download a person's data." }, { status: 403 });

  const { id } = await params;
  const data = await buildPersonDataExport(id, user.workspaceId);

  const { searchParams } = request.nextUrl;

  if (searchParams.get("summary") === "true") {
    return NextResponse.json(summarise(data));
  }

  const categoriesParam = searchParams.get("categories");
  const categories: Category[] = categoriesParam ? (categoriesParam.split(",").filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c)) as Category[]) : [...CATEGORIES];
  const format = searchParams.get("format") === "csv" ? "csv" : "json";
  const filtered = filterByCategories(data, categories);

  await writeAuditLog({ workspaceId: user.workspaceId, actorId: user.id, entityType: "Person", entityId: id, action: "EXPORT", changedFields: { categories, format } });

  const safeName = `${data.profile.firstName}-${data.profile.lastName}`.replace(/[^a-z0-9.-]+/gi, "-");

  if (format === "csv") {
    return new NextResponse(toSpreadsheet(filtered), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${safeName}-data-export.csv"` },
    });
  }

  return new NextResponse(JSON.stringify(filtered, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${safeName}-data-export.json"` },
  });
}
