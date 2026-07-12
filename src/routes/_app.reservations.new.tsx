import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-context";
import { supabase } from "@/integrations/supabase/client";
import type { Currency } from "@/lib/domain-types";

export const Route = createFileRoute("/_app/reservations/new")({
  component: NewReservationPage,
});

function NewReservationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    nationality: "",
    cpf: "",
    paxCount: 1,
    currency: "BRL" as Currency,
    reservationDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Sessão expirada");
    if (!form.fullName.trim()) return toast.error("Informe o nome do passageiro");
    setSaving(true);
    try {
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({
          full_name: form.fullName,
          email: form.email || null,
          phone: form.phone || null,
          nationality: form.nationality || null,
          cpf: form.cpf || null,
          pax_count: form.paxCount,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const code = "R" + Date.now().toString(36).toUpperCase();
      const { data: reservation, error: rErr } = await supabase
        .from("reservations")
        .insert({
          created_by: user.id,
          code,
          customer_id: customer.id,
          seller_id: user.id,
          currency: form.currency,
          total_amount: 0,
          paid_amount: 0,
          reservation_date: form.reservationDate,
          notes: form.notes || null,
        })
        .select("id")
        .single();
      if (rErr) throw rErr;

      toast.success("Reserva criada — agora adicione os passeios");
      navigate({ to: "/reservations/$id", params: { id: reservation.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar reserva");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link to="/reservations">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
          Reservas
        </p>
        <h1 className="mt-1 text-3xl">Nova reserva</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Preencha só os dados do passageiro. Passeios, pagamentos e contrato são adicionados
          depois na tela da reserva.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passageiro principal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" required>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
            </Field>
            <Field label="CPF / Documento">
              <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Nacionalidade">
              <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </Field>
            <Field label="Quantidade de passageiros">
              <Input
                type="number"
                min={1}
                value={form.paxCount}
                onChange={(e) => set("paxCount", Number(e.target.value))}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da reserva</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Data da reserva">
              <Input
                type="date"
                value={form.reservationDate}
                onChange={(e) => set("reservationDate", e.target.value)}
              />
            </Field>
            <Field label="Moeda">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value as Currency)}
              >
                <option value="BRL">BRL — Real</option>
                <option value="CLP">CLP — Peso chileno</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Observações">
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/reservations" })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar e adicionar passeios
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
