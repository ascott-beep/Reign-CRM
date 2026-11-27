import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canExport, mandateVisibilityWhere, type SessionUser } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";
import { OPPORTUNITY_STAGE_PROBABILITY } from "@/lib/labels";
import { normalizeExchangeRates, convertAmount } from "@/lib/currency";

function periodStart(period: string | null): Date | undefined {
  const now = new Date();
  if (period === "last-12-months") return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  if (period === "all-time") return undefined;
  return new Date(now.getFullYear(), 0, 1);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  if (!canExport(user.role)) return NextResponse.json({ error: "Read-only users cannot export data." }, { status: 403 });

  const wid = user.workspaceId;
  const period = request.nextUrl.searchParams.get("period");
  const deskUserId = request.nextUrl.searchParams.get("user") ?? undefined;
  const since = periodStart(period);
  const ownerFilter = deskUserId ? { ownerId: deskUserId } : {};
  const periodFilter = since ? { gte: since } : undefined;
  const mandateWhere = mandateVisibilityWhere(user);

  const [workspace, opportunities, mandates, processes, placements] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: wid } }),
    prisma.opportunity.findMany({ where: { workspaceId: wid, archivedAt: null, ...ownerFilter, ...(periodFilter ? { createdAt: periodFilter } : {}) } }),
    prisma.mandate.findMany({ where: { workspaceId: wid, archivedAt: null, ...mandateWhere, ...ownerFilter, ...(periodFilter ? { createdAt: periodFilter } : {}) } }),
    prisma.candidateProcess.findMany({ where: { workspaceId: wid, mandate: { ...mandateWhere }, ...(deskUserId ? { ownerId: deskUserId } : {}) } }),
    prisma.placement.findMany({ where: { mandate: { workspaceId: wid }, ...(deskUserId ? { candidateProcess: { ownerId: deskUserId } } : {}) } }),
  ]);

  const rates = normalizeExchangeRates(workspace.exchangeRatesToGbp);
  const currency = workspace.defaultCurrency;
  const convert = (amount: number, from: string | null | undefined) => convertAmount(amount, from ?? currency, currency, rates);

  const openOpportunities = opportunities.filter((o) => o.stage !== "WON" && o.stage !== "LOST");
  const weightedPipelineValue = openOpportunities.reduce((sum, o) => {
    if (!o.estimatedFeeAmount) return sum;
    const prob = o.isProbabilityOverridden ? (o.probabilityOverride ?? 0) : (OPPORTUNITY_STAGE_PROBABILITY[o.stage] ?? 0);
    return sum + (convert(Number(o.estimatedFeeAmount), o.estimatedFeeCurrency) * prob) / 100;
  }, 0);
  const totalPlacementFees = placements.reduce((sum, p) => (p.feeAmount ? sum + convert(Number(p.feeAmount), p.feeCurrency) : sum), 0);
  const activeMandates = mandates.filter((m) => m.status !== "FILLED" && m.status !== "CANCELLED").length;
  const totalEntered = processes.length;
  const totalPlaced = processes.filter((p) => p.stage === "PLACED").length;
  const offersOutstanding = processes.filter((p) => p.stage === "OFFER").length;

  const rows = [
    { metric: "Period", value: period === "last-12-months" ? "Last 12 months" : period === "all-time" ? "All time" : "This year" },
    { metric: "Placement fees", value: `${currency} ${totalPlacementFees.toFixed(2)}` },
    { metric: "Weighted pipeline", value: `${currency} ${weightedPipelineValue.toFixed(2)}` },
    { metric: "Active mandates", value: String(activeMandates) },
    { metric: "Candidate conversion", value: totalEntered > 0 ? `${Math.round((totalPlaced / totalEntered) * 100)}%` : "0%" },
    { metric: "Offers outstanding", value: String(offersOutstanding) },
    { metric: "Open opportunities", value: String(openOpportunities.length) },
    { metric: "Placements", value: String(placements.length) },
  ];

  const csv = toCsv(rows, ["metric", "value"]);

  await writeAuditLog({ workspaceId: wid, actorId: user.id, entityType: "Report", entityId: "reports-export", action: "EXPORT", changedFields: { period, deskUserId } });

  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="reign-reports.csv"' } });
}
