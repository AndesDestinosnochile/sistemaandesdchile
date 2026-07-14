import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/hotels")({
  component: HotelsPage,
});

interface Hotel {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  notes: string | null;
}

const empty: Omit<Hotel, "id"> = {
  name: "",
  address: "",
  city: "",
  country: "Chile",
  notes: "",
};

function HotelsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [form, setForm] = useState<Omit<Hotel, "id">>(empty);
  const [saving, setSaving] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["hotels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotels")
        .select("id,name,address,city,country,notes")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Hotel[];
    },
  });

  function openNew() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }
  function openEdit(h: Hotel) {
    setEditing(h);
    setForm({
      name: h.name,
      address: h.address ?? "",
      city: h.city ?? "",
      country: h.country,
      notes: h.notes ?? "",
    });
    setOpen(true);
  }
  async function save() {
    if (!form.name.trim()) return toast.error(t("customers.nameRequired"));
    setSaving(true);
    try {
      const payload = {
        ...form,
        address: form.address || null,
        city: form.city || null,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await supabase.from("hotels").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success(t("hotels.updated"));
      } else {
        const { error } = await supabase.from("hotels").insert(payload);
        if (error) throw error;
        toast.success(t("hotels.created"));
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["hotels"] });
    } catch (e: any) {
      toast.error(e.message ?? t("common.genericError"));
    } finally {
      setSaving(false);
    }
  }
  async function remove(h: Hotel) {
    if (!confirm(t("hotels.deleteConfirm", { name: h.name }))) return;
    const { error } = await supabase.from("hotels").delete().eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success(t("hotels.deleted"));
    qc.invalidateQueries({ queryKey: ["hotels"] });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
            {t("hotels.kicker")}
          </p>
          <h1 className="mt-1 text-3xl">{t("hotels.title")}</h1>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> {t("hotels.new")}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("hotels.colName")}</th>
                <th className="px-4 py-3 font-medium">{t("hotels.colAddress")}</th>
                <th className="px-4 py-3 font-medium">{t("hotels.colCity")}</th>
                <th className="px-4 py-3 font-medium">{t("hotels.colCountry")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("common.loading")}</td></tr>
              )}
              {!isLoading && data.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">{t("hotels.empty")}</td></tr>
              )}
              {data.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">{h.address ?? "—"}</td>
                  <td className="px-4 py-3">{h.city ?? "—"}</td>
                  <td className="px-4 py-3">{h.country}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(h)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(h)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("hotels.edit") : t("hotels.new")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5"><Label>{t("hotels.nameReq")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label>{t("hotels.address")}</Label>
              <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>{t("hotels.city")}</Label>
                <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5"><Label>{t("hotels.country")}</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5"><Label>{t("hotels.notes")}</Label>
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
