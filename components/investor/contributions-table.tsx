"use client";

import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Contribution = {
  id: string;
  fund_id: string | null;
  date: string;
  amount: number;
  dividends: number;
  notes: string | null;
  funds: { name: string; type: string } | null;
};

export function ContributionsTable({ contributions }: { contributions: Contribution[] }) {
  const t = useTranslations("common");

  if (!contributions.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Aún no registramos aportes a tu nombre.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">{t("fund")}</th>
            <th className="text-left py-2 pr-4 font-medium">{t("date")}</th>
            <th className="text-right py-2 pr-4 font-medium">{t("amount")}</th>
            <th className="text-right py-2 font-medium">Dividendos</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
              <td className="py-2 pr-4 max-w-[16rem] truncate" title={c.funds?.name ?? undefined}>
                {c.fund_id && c.funds?.name ? (
                  <Link
                    href={`/funds/${c.fund_id}`}
                    className="hover:text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:text-primary transition-colors"
                  >
                    {c.funds.name}
                  </Link>
                ) : (
                  c.funds?.name ?? "—"
                )}
              </td>
              <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(c.date)}</td>
              <td className="py-2 pr-4 text-right font-medium tabular-nums">{formatCurrency(Number(c.amount))}</td>
              <td className="py-2 text-right text-muted-foreground tabular-nums">{formatCurrency(Number(c.dividends))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
