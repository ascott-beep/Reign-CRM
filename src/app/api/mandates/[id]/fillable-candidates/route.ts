import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewMandate, type SessionUser } from "@/lib/permissions";
import { candidatePlainStatus, isCandidateInPlay } from "@/lib/rules";
import { formatMoney } from "@/lib/utils";

/** Data for d03 "Mark this search as filled" — who's eligible, plus read-only guarantee/fee terms. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as SessionUser;
  const { id } = await params;

  if (!(await canViewMandate(user, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const mandate = await prisma.mandate.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      hiringOrganization: { select: { name: true } },
      candidateProcesses: { include: { candidatePerson: true } },
    },
  });
  if (!mandate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidates = mandate.candidateProcesses
    .filter((p) => p.stage === "PLACED" || isCandidateInPlay(p.stage))
    .map((p) => ({
      id: p.id,
      name: `${p.candidatePerson.firstName} ${p.candidatePerson.lastName}`,
      statusLabel: p.stage === "PLACED" ? `Placed · ${mandate.title}` : candidatePlainStatus(p.stage).label,
      isPlaced: p.stage === "PLACED",
    }));

  const guaranteeSummary = mandate.guaranteeValue
    ? `${mandate.guaranteeValue} ${mandate.guaranteeUnit?.toLowerCase().includes("week") ? "weeks" : "months"} from start date`
    : "No guarantee period set in terms";

  const feeSummary =
    mandate.feeType === "FIXED_FEE" && mandate.fixedFeeAmount
      ? `${formatMoney(mandate.fixedFeeAmount, mandate.baseCurrency)}, ready to invoice`
      : mandate.feePercentage
        ? `${mandate.feePercentage}% of final base, ready to invoice`
        : "Fee terms not set on this mandate";

  return NextResponse.json({
    mandateTitle: mandate.title,
    orgName: mandate.hiringOrganization.name,
    candidates,
    guaranteeSummary,
    feeSummary,
  });
}
