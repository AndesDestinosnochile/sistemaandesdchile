import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  full_name: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  nationality: string | null;
  pax_count: number;
  notes: string | null;
}

const empty: Omit<Customer, "id"> = {
  full_name: "",
  cpf: "",
  email: "",
  phone: "",
  whatsapp: "",
  nationality: "",
  pax_count: 1,
  notes: "",
};

function CustomersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Omit<Customer, "id">>(empty);
  const [saving, setSaving] = useState(false);


  const { data = [], isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      full_name: c.full_name,
      cpf: c.cpf ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      whatsapp: c.whatsapp ?? "",
      nationality: c.nationality ?? "",
      pax_count: c.pax_count,
      notes: c.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.full_name.trim()) return toast.error(t("customers.nameRequired"));
    setSaving(true);
    try {
      const payload = {
        ...form,
        cpf: form.cpf || null,
        email: form.email || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        nationality: form.nationality || null,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success(t("customers.updated"));
      } else {
        const { error } = await supabase
          .from("customers")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
        toast.success(t("customers.created"));
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (e: any) {
      toast.error(e.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Customer) {
    if (!confirm(t("customers.deleteConfirm", { name: c.full_name }))) return;
    const { data: deleted, error } = await supabase
      .from("customers")
      .delete()
      .eq("id", c.id)
      .select("id");
    if (error) return toast.error(error.message);
    if (!deleted || deleted.length === 0) {
      return toast.error("Sem permissão para excluir este cliente.");
    }
    toast.success(t("customers.deleted"));
    qc.invalidateQueries({ queryKey: ["customers"] });
  }


  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {t("customers.kicker")}
          </p>
          <h1 className="mt-1 text-3xl">{t("customers.title")}</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> {t("customers.new")}
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("customers.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("customers.colName")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.colDocument")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.colContact")}</th>
                <th className="px-4 py-3 font-medium">{t("customers.colNationality")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("customers.colPax")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {t("customers.empty")}
                  </td>
                </tr>
              )}
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.full_name}</td>
                  <td className="px-4 py-3">{c.cpf ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div>{c.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{c.phone ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{c.nationality ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{c.pax_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t("customers.edit") : t("customers.new")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("customers.fullNameReq")}>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </Field>
            <Field label={t("customers.cpf")}>
              <Input value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </Field>
            <Field label={t("customers.email")}>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t("customers.phone")}>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t("customers.whatsapp")}>
              <Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
            </Field>
            <Field label={t("customers.nationality")}>
              <Input value={form.nationality ?? ""} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
            </Field>
            <Field label={t("customers.paxCount")}>
              <Input
                type="number"
                min={1}
                value={form.pax_count}
                onChange={(e) => setForm({ ...form, pax_count: Number(e.target.value) })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("customers.notes")}>
                <Textarea
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={saving}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
