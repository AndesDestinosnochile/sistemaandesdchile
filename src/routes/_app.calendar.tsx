import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, CalendarPlus, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});


interface ResRow {
  id: string;
  code: string;
  check_in: string | null;
  check_out: string | null;
  customers: { full_name: string; phone: string | null } | null;
}
interface TourRow {
  id: string;
  name: string;
  tour_date: string;
  pax: number;
  status: string;
  reservation_id: string;
  reservations: { code: string; customers: { full_name: string } | null } | null;
}

type DayEvent =
  | { kind: "in"; label: string; reservationId: string; code: string; customer: string }
  | { kind: "out"; label: string; reservationId: string; code: string; customer: string }
  | { kind: "tour"; label: string; reservationId: string; code: string; customer: string; tourName: string; pax: number; status: string };

function CalendarPage() {
  const { i18n } = useTranslation();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in" | "out" | "tour">("all");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstOfMonth.getDay());
  const days: Date[] = Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * 86400000));

  const from = days[0].toISOString().slice(0, 10);
  const to = days[41].toISOString().slice(0, 10);

  const { data: reservations = [] } = useQuery({
    queryKey: ["calendar-res", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id,code,check_in,check_out,customers(full_name,phone)")
        .or(`check_in.gte.${from},check_out.lte.${to}`);
      if (error) throw error;
      return (data ?? []) as unknown as ResRow[];
    },
  });
  const { data: tours = [] } = useQuery({
    queryKey: ["calendar-tours", from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_tours")
        .select("id,name,tour_date,pax,status,reservation_id,reservations(code,customers(full_name))")
        .gte("tour_date", from)
        .lte("tour_date", to);
      if (error) throw error;
      return (data ?? []) as unknown as TourRow[];
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const push = (day: string, ev: DayEvent) => {
      const arr = map.get(day) ?? [];
      arr.push(ev);
      map.set(day, arr);
    };
    for (const r of reservations) {
      const name = r.customers?.full_name ?? r.code;
      if (r.check_in) push(r.check_in, { kind: "in", label: `IN · ${name}`, reservationId: r.id, code: r.code, customer: name });
      if (r.check_out) push(r.check_out, { kind: "out", label: `OUT · ${name}`, reservationId: r.id, code: r.code, customer: name });
    }
    for (const t of tours) {
      const name = t.reservations?.customers?.full_name ?? t.reservations?.code ?? "";
      push(t.tour_date, {
        kind: "tour",
        label: `${t.name} · ${name} (${t.pax})`,
        reservationId: t.reservation_id,
        code: t.reservations?.code ?? "",
        customer: name,
        tourName: t.name,
        pax: t.pax,
        status: t.status,
      });
    }
    return map;
  }, [reservations, tours]);

  const monthName = cursor.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
  const totals = useMemo(() => {
    let ins = 0, outs = 0, tourCount = 0, pax = 0;
    for (const r of reservations) {
      if (r.check_in && r.check_in.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`) ins++;
      if (r.check_out && r.check_out.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`) outs++;
    }
    for (const t of tours) {
      if (t.tour_date.slice(0, 7) === `${year}-${String(month + 1).padStart(2, "0")}`) {
        tourCount++;
        pax += t.pax;
      }
    }
    return { ins, outs, tourCount, pax };
  }, [reservations, tours, year, month]);

  const weekLabels = i18n.language.startsWith("es")
    ? ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];
  const filteredSelectedEvents = filter === "all" ? selectedEvents : selectedEvents.filter((e) => e.kind === filter);

  function dayKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">Operação</p>
          <h1 className="mt-1 text-3xl capitalize">{monthName}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><LogIn className="h-3.5 w-3.5 text-emerald-600" /> {totals.ins} check-ins</span>
            <span className="inline-flex items-center gap-1"><LogOutIcon className="h-3.5 w-3.5 text-amber-600" /> {totals.outs} check-outs</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-600" /> {totals.tourCount} passeios · {totals.pax} pax</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {(["all", "in", "out", "tour"] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "ghost"} onClick={() => setFilter(f)} className="h-7 px-2 text-xs">
                {f === "all" ? "Todos" : f === "in" ? "Check-in" : f === "out" ? "Check-out" : "Passeios"}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {weekLabels.map((d) => (
              <div key={d} className="px-2 py-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const inMonth = d.getMonth() === month;
              const key = dayKey(d);
              const all = eventsByDay.get(key) ?? [];
              const evts = filter === "all" ? all : all.filter((e) => e.kind === filter);
              const isToday = key === dayKey(new Date());
              const hasEvents = evts.length > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => hasEvents && setSelectedDay(key)}
                  className={`min-h-24 border-b border-r p-1.5 text-left text-xs transition-colors ${
                    inMonth ? "" : "bg-muted/20 text-muted-foreground"
                  } ${hasEvents ? "cursor-pointer hover:bg-accent/10" : "cursor-default"} ${
                    isToday ? "ring-2 ring-inset ring-accent" : ""
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`font-medium ${isToday ? "text-accent" : ""}`}>{d.getDate()}</span>
                    {hasEvents && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">{evts.length}</span>}
                  </div>
                  <div className="space-y-0.5">
                    {evts.slice(0, 3).map((e, i) => (
                      <div
                        key={i}
                        className={`truncate rounded px-1 py-0.5 ${
                          e.kind === "in"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : e.kind === "out"
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-blue-500/15 text-blue-700"
                        }`}
                      >
                        {e.label}
                      </div>
                    ))}
                    {evts.length > 3 && <div className="text-[10px] text-muted-foreground">+{evts.length - 3} mais</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && new Date(selectedDay + "T12:00:00").toLocaleDateString(i18n.language, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {filteredSelectedEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem eventos neste dia.</p>
            )}
            {filteredSelectedEvents.map((e, i) => (
              <Link
                key={i}
                to="/reservations/$id"
                params={{ id: e.reservationId }}
                onClick={() => setSelectedDay(null)}
                className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-accent/10"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {e.kind === "in" && <Badge className="bg-emerald-600 hover:bg-emerald-600">Check-in</Badge>}
                    {e.kind === "out" && <Badge className="bg-amber-600 hover:bg-amber-600">Check-out</Badge>}
                    {e.kind === "tour" && <Badge className="bg-blue-600 hover:bg-blue-600">Passeio</Badge>}
                    <span className="font-mono text-xs text-muted-foreground">{e.code}</span>
                    {e.kind === "tour" && (
                      <Badge variant={e.status === "confirmed" ? "default" : e.status === "pending" ? "secondary" : "destructive"}>
                        {e.status}
                      </Badge>
                    )}
                  </div>
                  {e.kind === "tour" ? (
                    <>
                      <div className="font-medium">{e.tourName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {e.customer} · {e.pax} pax</div>
                    </>
                  ) : (
                    <div className="font-medium flex items-center gap-1"><User className="h-3.5 w-3.5" /> {e.customer}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
