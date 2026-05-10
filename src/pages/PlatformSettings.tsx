import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { usePlatformSettings, PlatformSettingKey } from "@/lib/platform-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumToggle } from "@/components/ui/premium-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, ShieldCheck, Building2, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import { MotionPage } from "@/components/shared/MotionPage";

const TOGGLE_DEFS: { key: PlatformSettingKey; label: string; help: string }[] = [
  { key: "allow_user_emails", label: "Non-admins can send documents via email", help: "When off, only admins/super admins can hit 'Send to Client' on invoices, waybills, partnerships." },
  { key: "presence_visible_to_all", label: "Online presence visible to everyone", help: "Off = only admins see the live 'who's online' indicator." },
  { key: "storage_alerts_enabled", label: "Storage usage alerts", help: "Notify users when they cross 80% and 95% of their storage quota." },
];

const CURRENCIES = [
  { code: "NGN", label: "Nigerian Naira (₦)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "GHS", label: "Ghanaian Cedi (₵)" },
  { code: "KES", label: "Kenyan Shilling (KSh)" },
];

export default function PlatformSettingsPage() {
  const { isSuperAdmin, loading: authLoading, user, profile } = useAuth();
  const { settings, loading, get, set } = usePlatformSettings();
  const navigate = useNavigate();
  const [quotaMb, setQuotaMb] = useState<string>("500");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [mission, setMission] = useState("");
  const [vision, setVision] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [accent, setAccent] = useState("#C9A66B");

  useEffect(() => {
    setQuotaMb(String(get("default_storage_quota_mb", 500)));
    setName(String(get("company_name", "REDtech Africa")));
    setDesc(String(get("company_description", "")));
    setMission(String(get("company_mission", "")));
    setVision(String(get("company_vision", "")));
    setCurrency(String(get("company_currency", "NGN")));
    setAccent(String(get("company_accent", "#C9A66B")));
  }, [settings]);

  // Profile loads in background — wait for it before making role decisions.
  const profilePending = !!user && !profile;
  if (authLoading || profilePending) return null;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;


  const saveCompany = async () => {
    const cleanAccent = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#C9A66B";
    await Promise.all([
      set("company_name", name.trim() || "REDtech Africa"),
      set("company_description", desc.trim()),
      set("company_mission", mission.trim()),
      set("company_vision", vision.trim()),
      set("company_accent", cleanAccent),
    ]);
    toast.success("Company profile saved — visible across the platform.");
  };

  return (
    <MotionPage>
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        {/* Breadcrumb back to User Mgmt */}
        <nav className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground">
          <button onClick={() => navigate("/users")} className="hover:text-primary transition-colors">User Management</button>
          <span>/</span>
          <span className="text-foreground">Platform Settings</span>
        </nav>

        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center"><Settings2 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">God-mode controls for the entire workspace.</p>
          </div>
        </div>

        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Company Profile</CardTitle>
            <p className="text-xs text-muted-foreground">Sets the brand name, tagline, mission and vision used across dashboards, emails, and PDFs.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="REDtech Africa" />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Coins className="h-3.5 w-3.5" /> Default currency</Label>
                <Select value={currency} onValueChange={async (v) => { setCurrency(v); await set("company_currency", v); toast.success(`Currency set to ${v}`); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short description / tagline</Label>
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="One sentence the team will see on the dashboard." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mission statement</Label>
                <Textarea value={mission} onChange={(e) => setMission(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Vision statement</Label>
                <Textarea value={vision} onChange={(e) => setVision(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="grid md:grid-cols-[180px,1fr] gap-4 items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" /> Brand accent</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-border bg-background cursor-pointer"
                    aria-label="Pick brand accent colour"
                  />
                  <Input
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    placeholder="#C9A66B"
                    className="font-mono uppercase"
                    maxLength={7}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Drives buttons, links, badges and the primary highlight everywhere.</p>
              </div>
              <p className="text-xs text-muted-foreground hidden md:block">
                Tip: keep contrast strong against both light and dark surfaces. Changes apply instantly across the platform once saved.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveCompany}><Sparkles className="h-4 w-4 mr-2" /> Save company profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Feature Toggles</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {TOGGLE_DEFS.map((def) => {
              const value = !!get(def.key, true);
              return (
                <div key={def.key} className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border/40 hover:bg-muted/30 transition">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{def.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{def.help}</p>
                  </div>
                  <PremiumToggle checked={value} onChange={async () => { await set(def.key, !value); toast.success("Saved"); }} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default storage quota for new users (MB)</Label>
              <div className="flex gap-2 mt-2">
                <Input type="number" min={50} value={quotaMb} onChange={(e) => setQuotaMb(e.target.value)} className="max-w-[180px]" />
                <Button onClick={async () => { await set("default_storage_quota_mb", Number(quotaMb) || 500); toast.success("Default quota updated"); }}>Save</Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Existing users keep their current quota; this only affects newcomers.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MotionPage>
  );
}
