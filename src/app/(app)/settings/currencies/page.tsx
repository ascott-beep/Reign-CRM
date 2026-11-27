import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { PermissionDeniedState } from "@/components/shell/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CURRENCIES } from "@/lib/iso";
import { normalizeExchangeRates } from "@/lib/currency";
import { updateCurrencySettingsAction, updateExchangeRatesAction } from "../actions";
import { format } from "date-fns";

export default async function SettingsCurrenciesPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <PermissionDeniedState description="This page is administrator-only." />;
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } });
  const exchangeRates = normalizeExchangeRates(workspace.exchangeRatesToGbp);

  return (
    <div className="flex flex-col gap-4">
      <Card className="max-w-xl">
        <CardContent className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-sm font-semibold">Show totals in</h3>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              Report and dashboard totals convert into this currency and are marked &ldquo;≈&rdquo; whenever a conversion happened.
            </p>
          </div>
          <form action={updateCurrencySettingsAction} className="flex flex-col gap-4">
            <select
              name="defaultCurrency"
              defaultValue={workspace.defaultCurrency}
              className="h-9 w-48 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2.5">
              <Switch name="updateRatesAutomatically" defaultChecked={workspace.updateRatesAutomatically} />
              <span className="text-sm">Update exchange rates every morning</span>
            </label>
            {workspace.exchangeRatesUpdatedAt ? (
              <p className="text-xs text-[var(--color-ink-subtle)]">Last updated {format(workspace.exchangeRatesUpdatedAt, "d MMM yyyy HH:mm")}</p>
            ) : null}
            <div>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardContent className="pt-4">
          <h3 className="mb-1 text-sm font-semibold">Exchange rates</h3>
          <p className="mb-3 text-xs text-[var(--color-ink-subtle)]">
            GBP value of 1 unit of each currency. Used to convert totals into your selected display currency. Ignored while
            automatic updates are on.
          </p>
          <form action={updateExchangeRatesAction} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CURRENCIES.map((c) => (
                <div key={c.code} className="flex flex-col gap-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{c.code}</label>
                  <input
                    name={`rate_${c.code}`}
                    type="number"
                    step="0.0001"
                    min={0}
                    defaultValue={exchangeRates[c.code] ?? 1}
                    className="h-9 rounded-md border border-[var(--color-border-strong)] px-3 text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <Button type="submit">Save exchange rates</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
