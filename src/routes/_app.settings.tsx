import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [, forceRender] = useState(0);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = () => forceRender((n) => n + 1);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [i18n]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setFullName(data.full_name ?? ""); setPhone(data.phone ?? ""); }
    });
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(t("settings.profileUpdated"));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">{t("settings.kicker")}</p>
        <h1 className="mt-1 text-3xl">{t("settings.title")}</h1>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">{t("settings.profile")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1.5"><Label>{t("settings.fullName")}</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>{t("settings.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div><Button onClick={saveProfile} disabled={saving}>{t("common.save")}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("settings.language")}</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {[
            { code: "pt-BR", label: "Português" },
            { code: "es-CL", label: "Español (CL)" },
          ].map((l) => (
            <Button key={l.code} variant={i18n.language === l.code ? "default" : "outline"}
              onClick={() => i18n.changeLanguage(l.code)}>
              {l.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

