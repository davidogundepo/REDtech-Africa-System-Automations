import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Clock, AlertTriangle, Building2, Home, Laptop, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import loginHero from "@/assets/login-hero.jpg";

const WORK_MODES = [
  { id: "office", label: "HQ Office", icon: Building2, hint: "On-site at HQ" },
  { id: "wfh", label: "Work From Home", icon: Home, hint: "Remote today" },
  { id: "hybrid", label: "Hybrid", icon: Laptop, hint: "Split day" },
  { id: "field", label: "Field Ops", icon: MapPin, hint: "Out on assignment" },
] as const;

const DISMISS_KEY_PREFIX = "clockin-dismiss-count-";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function GlobalAttendancePopup() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [workMode, setWorkMode] = useState<string>("office");
  const [dismissCount, setDismissCount] = useState(0);
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const dismissKey = `${DISMISS_KEY_PREFIX}${today}`;

  const { data: myRecord, isLoading } = useQuery({
    queryKey: ["my-attendance", today],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await (supabase as any)
        .from("attendance_records")
        .select("*")
        .eq("user_id", profile.id)
        .eq("date", today)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    },
    enabled: !!profile,
  });

  useEffect(() => {
    if (!isLoading && profile && myRecord === null) {
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      const stored = parseInt(localStorage.getItem(dismissKey) || "0", 10);
      setDismissCount(stored);

      if (stored < 2) {
        const timer = setTimeout(() => setIsOpen(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, profile, myRecord, dismissKey]);

  const handleDismiss = () => {
    const newCount = dismissCount + 1;

    if (newCount === 1) {
      setDismissCount(newCount);
      localStorage.setItem(dismissKey, newCount.toString());
      setIsOpen(false);
      toast.info("Reminder: You haven't clocked in yet today.", { duration: 4000 });
    } else {
      if (!showFinalWarning) {
        setShowFinalWarning(true);
        return;
      }
      setDismissCount(newCount);
      localStorage.setItem(dismissKey, newCount.toString());
      setIsOpen(false);
      setShowFinalWarning(false);
    }
  };

  const { data: shiftConfig } = useQuery({
    queryKey: ["shift-config"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("leave_balances").select("*").eq("leave_type", "system_config_shift").limit(1).maybeSingle();
      return data;
    },
  });

  const startHour = (shiftConfig as any)?.total_days ?? 9;
  const isLateNow = new Date().getHours() >= startHour;

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const now = new Date();
      const hour = now.getHours();
      const isLate = hour >= startHour;
      const status = isLate ? "late" : "present";
      const modeObj = WORK_MODES.find(m => m.id === workMode);
      const tag = modeObj ? `[📍 ${modeObj.label}] ` : '';
      const finalNotes = notes.trim() ? `${tag}- ${notes}` : tag.trim();

      const { error: attError } = await (supabase as any).from("attendance_records").insert([{
        user_id: profile.id,
        clock_in: now.toISOString(),
        date: today,
        status,
        notes: finalNotes || null,
      }]);
      if (attError) throw attError;

      if (isLate) {
        const { data: currentProfile } = await (supabase as any)
          .from("profiles")
          .select("performance_score")
          .eq("id", profile.id)
          .single();

        const currentScore = (currentProfile as any)?.performance_score ?? 100;
        await (supabase as any).from("profiles").update({
          performance_score: currentScore - 2
        }).eq("id", profile.id);
      }
      return { isLate };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setIsOpen(false);

      if (data.isLate) {
        toast.warning(`Clocked in late. 2 points deducted, ${(profile?.full_name || "").split(" ")[0]}.`);
      } else {
        toast.success(`Clocked in on time, ${(profile?.full_name || "").split(" ")[0]}! Have a great day!`);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  if (!profile || isLoading) return null;

  const firstName = (profile?.full_name || "").split(" ")[0] || "there";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
      <DialogContent
        className="p-0 overflow-hidden border-border/40 bg-card shadow-2xl rounded-3xl sm:max-w-[920px] w-[calc(100vw-2rem)] max-h-[92vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Check In</DialogTitle>
        <DialogDescription className="sr-only">
          Register your attendance for {format(new Date(), "EEEE, MMMM d, yyyy")}
        </DialogDescription>

        <div className="grid md:grid-cols-[0.85fr_1fr] max-h-[92vh]">
          {/* LEFT — Wallpaper pane (hidden on mobile) */}
          <div className="relative hidden md:block overflow-hidden">
            <img
              src={loginHero}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            {/* gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/10 to-background/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

            {/* ambient glow */}
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
            <div className="absolute bottom-10 -right-16 h-64 w-64 rounded-full bg-accent-gold/20 blur-3xl" />

            {/* content */}
            <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                RAC Daily Ritual
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1.5 text-xs font-medium ring-1 ring-white/20">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(), "EEEE, MMMM d")}
                </div>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                  {getGreeting()},<br />
                  <span className="text-white/90">{firstName}.</span>
                </h2>
                <p className="text-sm leading-relaxed text-white/75 max-w-[280px]">
                  A new day, a new rhythm. Register your attendance to keep the whole team in sync.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="rounded-xl bg-white/8 backdrop-blur-md ring-1 ring-white/15 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Shift starts</div>
                    <div className="text-lg font-semibold mt-0.5">{startHour.toString().padStart(2, "0")}:00</div>
                  </div>
                  <div className="rounded-xl bg-white/8 backdrop-blur-md ring-1 ring-white/15 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-white/60">Right now</div>
                    <div className="text-lg font-semibold mt-0.5">{format(new Date(), "HH:mm")}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Action pane */}
          <div className="relative flex flex-col overflow-y-auto">
            <div className="p-7 md:p-8 space-y-6">
              {/* Header (mobile only) */}
              <div className="md:hidden">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Check In
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{getGreeting()}, {firstName}.</h2>
                <p className="mt-1 text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
              </div>

              {/* Desktop header */}
              <div className="hidden md:block">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Register attendance</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Your performance score tracks punctuality automatically. Pick where you're working from today.
                </p>
              </div>

              {/* Final Warning Banner */}
              {showFinalWarning && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-warning-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed text-foreground">
                    This reminder <strong>will not appear again today</strong> if you close it now. Are you sure you don't want to clock in?
                  </p>
                </div>
              )}

              {/* Working Mode */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Working Mode</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {WORK_MODES.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = workMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setWorkMode(mode.id)}
                        className={`group relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-background border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`} />
                        <div>
                          <div className="text-sm font-medium leading-tight">{mode.label}</div>
                          <div className={`text-[11px] mt-0.5 leading-tight ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {mode.hint}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Notes <span className="text-muted-foreground/60 normal-case font-normal tracking-normal">— optional</span>
                </p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Running 10 mins late, on a client call this morning…"
                  className="resize-none bg-muted/30 border-border/60 focus-visible:ring-1 focus-visible:ring-ring rounded-xl text-sm"
                  rows={2}
                />
              </div>

              {/* Late warning */}
              {isLateNow && (
                <div className="flex items-center gap-2.5 text-destructive text-xs font-medium bg-destructive/10 py-2.5 px-3.5 rounded-xl border border-destructive/20">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Late arrival — past {startHour.toString().padStart(2, "0")}:00 cutoff (−2 pts)</span>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-1">
                <Button
                  onClick={() => clockInMutation.mutate()}
                  className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={clockInMutation.isPending}
                >
                  <LogIn className="h-4 w-4" />
                  {clockInMutation.isPending ? "Connecting…" : "Confirm Clock In"}
                </Button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 font-medium"
                >
                  {dismissCount === 0 ? "Remind me later" : "I'll clock in later — dismiss permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
