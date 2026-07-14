import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/currency";
import type { Currency } from "@/lib/domain-types";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

interface Row {
  id: string;
  currency: Currency;
  total_amount: number;
  paid_amount: number;
  reservation_date: string;
  seller_id: string;
  financial_status: string;
}

function ReportsPage() {
  const { t } = useTranslation();
  const first = new Date();
  first.setDate(1);
  const [from, setFrom] = useState(first.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data = [], isLoading } = useQuery({
    queryKey: ["reports", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id,currency,total_amount,paid_amount,reservation_date,seller_id,financial_status")
        .gte("reservation_date", from)
        .lte("reservation_date", to);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  const totals = data.reduce(
    (acc, r) => {
      acc.count += 1;
      acc[r.currency].total += Number(r.total_amount);
      acc[r.currency].paid += Number(r.paid_amount);
      return acc;
    },
    { count: 0, BRL: { total: 0, paid: 0 }, CLP: { total: 0, paid: 0 } } as any,
  );

  const bySeller = new Map<string, { count: number; brl: number; clp: number }>();
  for (const r of data) {
    const cur = bySeller.get(r.seller_id) ?? { count: 0, brl: 0, clp: 0 };
    cur.count += 1;
    if (r.currency === "BRL") cur.brl += Number(r.total_amount);
    else cur.clp += Number(r.total_amount);
    bySeller.set(r.seller_id, cur);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">{t("reports.kicker")}</p>
        <h1 className="mt-1 text-3xl">{t("reports.title")}</h1>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1.5"><Label>{t("reports.from")}</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("reports.to")}</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-4">
            <StatCard label={t("reports.reservations")} value={String(totals.count)} />
            <StatCard label={t("reports.totalBRL")} value={formatMoney(totals.BRL.total, "BRL")} />
            <StatCard label={t("reports.paidBRL")} value={formatMoney(totals.BRL.paid, "BRL")} />
            <StatCard label={t("reports.totalCLP")} value={formatMoney(totals.CLP.total, "CLP")} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("reports.bySeller")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("reports.colSeller")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("reports.reservations")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("reports.totalBRL")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("reports.totalCLP")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.from(bySeller.entries()).map(([id, v]) => (
                    <tr key={id}>
                      <td className="px-4 py-3">{nameOf(id)}</td>
                      <td className="px-4 py-3 text-right">{v.count}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(v.brl, "BRL")}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatMoney(v.clp, "CLP")}</td>
                    </tr>
                  ))}
                  {bySeller.size === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{t("reports.empty")}</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
