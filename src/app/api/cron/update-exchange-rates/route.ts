import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeExchangeRates } from "@/lib/currency";
import { CURRENCIES } from "@/lib/iso";

/**
 * Section 9.6 — "Update exchange rates every morning" toggle. Fetches ECB
 * reference rates (ECB doesn't quote every workspace currency — e.g. AED —
 * so any currency missing from the response just keeps its last manually-set
 * rate rather than being zeroed out or failing the whole run).
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const others = CURRENCIES.map((c) => c.code).filter((c) => c !== "GBP");
  const res = await fetch(`https://api.frankfurter.app/latest?from=GBP&to=${others.join(",")}`);
  if (!res.ok) return NextResponse.json({ error: `Frankfurter request failed: ${res.status}` }, { status: 502 });
  const data: { rates: Record<string, number> } = await res.json();

  // data.rates is "units of X per 1 GBP" — invert to "GBP value of 1 unit of X".
  const fetchedRatesToGbp: Record<string, number> = { GBP: 1 };
  for (const [code, perGbp] of Object.entries(data.rates)) {
    if (perGbp > 0) fetchedRatesToGbp[code] = 1 / perGbp;
  }
  const missing = others.filter((c) => !(c in fetchedRatesToGbp));

  const workspaces = await prisma.workspace.findMany({
    where: { updateRatesAutomatically: true },
    select: { id: true, exchangeRatesToGbp: true },
  });

  for (const workspace of workspaces) {
    const current = normalizeExchangeRates(workspace.exchangeRatesToGbp);
    const merged = { ...current, ...fetchedRatesToGbp };
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { exchangeRatesToGbp: merged, exchangeRatesUpdatedAt: new Date() },
    });
  }

  return NextResponse.json({ updatedWorkspaces: workspaces.length, fetchedRatesToGbp, missing });
}
