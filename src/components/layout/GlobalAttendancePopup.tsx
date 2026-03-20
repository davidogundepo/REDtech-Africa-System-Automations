import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, Clock, AlertTriangle, Building2, Home, Laptop, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const WORK_MODES = [
  { id: "office", label: "HQ Office", icon: Building2 },
  { id: "wfh", label: "Work From Home", icon: Home },
  { id: "hybrid", label: "Hybrid", icon: Laptop },
  { id: "field", label: "Field Ops", icon: MapPin },
] as const;

export function GlobalAttendancePopup() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [workMode, setWorkMode] = useState<string>("office");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: myRecord, isLoading } = useQuery({
    queryKey: ["my-attendance", today],
    queryFn: async () => {
      if (!profile) return null;
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("user_id", profile.id)
        .eq("date", today)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is 0 rows returned
      return data || null;
    },
    enabled: !!profile,
  });

  useEffect(() => {
    // Only show if we've loaded the record, it doesn't exist, and the user is logged in
    if (!isLoading && profile && myRecord === null && !isOpen) {
      // Small timeout to allow the rest of the UI to render first
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, profile, myRecord, isOpen]);

  const { data: shiftConfig } = useQuery({
    queryKey: ["shift-config"],
    queryFn: async () => {
      const { data } = await supabase.from("leave_balances").select("*").eq("leave_type", "system_config_shift").limit(1).maybeSingle();
      return data;
    },
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Not logged in");
      const now = new Date();
      const hour = now.getHours();
      const startHour = shiftConfig?.total_days ?? 9;
      const isLate = hour >= startHour;
      const status = isLate ? "late" : "present";
      const modeObj = WORK_MODES.find(m => m.id === workMode);
      const tag = modeObj ? `[📍 ${modeObj.label}] ` : '';
      const finalNotes = notes.trim() ? `${tag}- ${notes}` : tag.trim();

      // 1. Insert Attendance Record
      const { error: attError } = await supabase.from("attendance_records").insert([{
        user_id: profile.id,
        clock_in: now.toISOString(),
        date: today,
        status,
        notes: finalNotes || null,
      }]);
      if (attError) throw attError;

      // 2. If Late, deduct 2 points from profile to reflect gamification
      if (isLate) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("performance_score")
          .eq("id", profile.id)
          .single();
          
        const currentScore = currentProfile?.performance_score ?? 100;
        await supabase.from("profiles").update({ 
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

  // If no profile or still loading, don't render anything
  if (!profile || isLoading) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Clock className="h-5 w-5 text-muted-foreground" /> Check In
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-left">
            <h4 className="font-medium text-foreground tracking-tight mb-1 text-md">Register Attendance</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">Please clock in to register your attendance for today. Your performance score tracks your punctuality automatically.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-3 tracking-tight">Working Mode</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {WORK_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = workMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setWorkMode(mode.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all focus:outline-none shadow-sm ${
                      isSelected 
                        ? 'bg-zinc-900 border-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900 font-medium' 
                        : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                    {mode.label}
                  </button>
                )
              })}
            </div>

            <p className="text-sm text-foreground mb-2 font-medium tracking-tight">Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span></p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Running 10 mins late..."
              className="resize-none bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-ring rounded-xl text-sm"
              rows={2}
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={() => clockInMutation.mutate()}
              className="w-full py-6 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              disabled={clockInMutation.isPending}
            >
              <LogIn className="h-5 w-5" />
              {clockInMutation.isPending ? "Connecting..." : "Confirm Clock In"}
            </Button>

            {new Date().getHours() >= (shiftConfig?.total_days ?? 9) && (
              <div className="flex items-center justify-center gap-2 text-rose-500 text-xs font-medium mt-4 bg-rose-500/10 py-2.5 px-3 rounded-lg border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Late Arrival: {(shiftConfig?.total_days ?? 9).toString().padStart(2, '0')}:00 Time Limit Exceeded (-2 pts)</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
