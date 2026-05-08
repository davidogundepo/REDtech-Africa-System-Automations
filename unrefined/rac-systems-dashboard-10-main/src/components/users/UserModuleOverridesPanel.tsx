import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldAlert, Loader2, Save, RotateCcw, UserCog } from "lucide-react";
import { ALL_MODULES, type ModuleKey } from "@/lib/module-toggles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserModuleOverridesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; full_name?: string; email?: string; role?: string } | null;
}

export function UserModuleOverridesPanel({ open, onOpenChange, user }: UserModuleOverridesPanelProps) {
  const [search, setSearch] = React.useState("");
  const [blocked, setBlocked] = React.useState<Set<ModuleKey>>(new Set());
  const [originalBlocked, setOriginalBlocked] = React.useState<Set<ModuleKey>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !user?.id) return;
    setLoading(true);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("user_module_overrides")
        .select("module_key, is_blocked")
        .eq("user_id", user.id);
      if (error) {
        console.warn(error);
      }
      const set = new Set<ModuleKey>(
        (data || []).filter((r: any) => r.is_blocked).map((r: any) => r.module_key as ModuleKey),
      );
      setBlocked(set);
      setOriginalBlocked(new Set(set));
      setLoading(false);
    })();
  }, [open, user?.id]);

  const toggle = (key: ModuleKey) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reset = () => setBlocked(new Set(originalBlocked));

  const dirty = React.useMemo(() => {
    if (blocked.size !== originalBlocked.size) return true;
    for (const k of blocked) if (!originalBlocked.has(k)) return true;
    return false;
  }, [blocked, originalBlocked]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // Wipe & reinsert blocked rows for this user
      const { error: delErr } = await (supabase as any)
        .from("user_module_overrides")
        .delete()
        .eq("user_id", user.id);
      if (delErr) throw delErr;
      if (blocked.size > 0) {
        const rows = Array.from(blocked).map((module_key) => ({
          user_id: user.id,
          module_key,
          is_blocked: true,
        }));
        const { error: insErr } = await (supabase as any)
          .from("user_module_overrides")
          .insert(rows);
        if (insErr) throw insErr;
      }
      setOriginalBlocked(new Set(blocked));
      toast.success("Module access updated");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const filtered = ALL_MODULES.filter((m: any) =>
    !search.trim() ||
    m.label?.toLowerCase().includes(search.toLowerCase()) ||
    m.key?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent -mx-6 -mt-6 px-6 pt-6 pb-5 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
              <UserCog className="h-6 w-6 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">Module Access — {user?.full_name || "User"}</SheetTitle>
              <SheetDescription className="text-xs">
                Block specific modules just for this user. Org-wide disables still apply.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Filter modules…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Badge variant={blocked.size > 0 ? "destructive" : "outline"} className="gap-1">
              <ShieldAlert className="h-3 w-3" /> {blocked.size} blocked
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading overrides…
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-2">
              {filtered.map((m: any) => {
                const isBlocked = blocked.has(m.key);
                return (
                  <div
                    key={m.key}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition ${
                      isBlocked ? "bg-destructive/5 border-destructive/30" : "bg-card hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{m.label || m.key}</p>
                      {m.description && <p className="text-[11px] text-muted-foreground truncate">{m.description}</p>}
                    </div>
                    <Switch checked={!isBlocked} onCheckedChange={() => toggle(m.key as ModuleKey)} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-6 px-6 py-3 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={reset} disabled={!dirty || saving}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : <><Save className="h-4 w-4 mr-2" /> Save</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
