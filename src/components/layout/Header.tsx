import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Info, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, BellRing, Sparkles, Search, Command } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { PresenceIndicator } from "@/components/shared/PresenceIndicator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bug, Send as SendIcon, MessageSquareDashed } from "lucide-react";
import { toast } from "sonner";

interface HeaderProps {
  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;
}

export function Header({ aiOpen, setAiOpen }: HeaderProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  
  // Bug Report State
  const [bugOpen, setBugOpen] = useState(false);
  const [bugType, setBugType] = useState('ui-bug');
  const [bugText, setBugText] = useState('');
  const [submittingBug, setSubmittingBug] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .neq("title", "[SYSTEM_TOUR_RESET]")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) { console.error("Notifications error:", error); return []; }
      return data || [];
    },
    enabled: !!profile,
    refetchInterval: 60000,
  });

  // ── Realtime: live notifications + cross-table invalidation ──────────────
  useEffect(() => {
    if (!profile?.id) return;
    const channel = (supabase as any)
      .channel(`realtime-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.id}` },
        (payload: any) => {
          const n = payload.new;
          if (n?.title === "[SYSTEM_TOUR_RESET]") return; // marker, not user-visible
          queryClient.setQueryData(["notifications", profile.id], (old: any) => [n, ...(old || [])].slice(0, 20));
          // Branded toast for new notification
          const toastFn = n.type === "error" ? toast.error : n.type === "warning" ? toast.warning : n.type === "success" ? toast.success : toast.info;
          toastFn(n.title, {
            description: n.message,
            action: n.link ? { label: "View", onClick: () => navigate(n.link) } : undefined,
          });
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["leave_requests"] });
        queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => {
        queryClient.invalidateQueries({ queryKey: ["attendance-all"] });
        queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
        queryClient.invalidateQueries({ queryKey: ["weekly-attendance"] });
        queryClient.invalidateQueries({ queryKey: ["my-attendance-history"] });
      })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [profile?.id, queryClient, navigate]);

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      queryClient.setQueryData(["notifications", profile.id], (old: any) => 
        old?.map((n: any) => ({ ...n, is_read: true })) || []
      );
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
      toast.success("All notifications marked as read", { style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } });
      setIsOpen(false);
    }
  });

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      queryClient.setQueryData(["notifications", profile?.id], (old: any) => 
        old?.map((n: any) => n.id === id ? { ...n, is_read: true } : n) || []
      );
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    }
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />;
    }
  };

  const submitBug = async () => {
    if (!bugText.trim()) return toast.error("Please describe what needs improvement.");
    setSubmittingBug(true);
    try {
      const { error } = await supabase.functions.invoke("feedback-to-sheets", {
        body: {
          email: profile?.email || "",
          full_name: profile?.full_name || "",
          role: profile?.role || "",
          department: profile?.department || "",
          page: location.pathname,
          type: bugType,
          message: bugText.trim(),
        },
      });
      if (error) throw error;
      toast.success("Feedback submitted successfully. Thank you!", { style: { background: 'hsl(var(--primary))', color: 'white', border: 'none' } });
      setBugOpen(false);
      setBugText("");
      setBugType("ui-bug");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit feedback.");
    } finally {
      setSubmittingBug(false);
    }
  };

  return (
    <>
    {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
        <span className="font-semibold text-sm" style={{ color: 'hsl(var(--primary))' }}>RAC Automations</span>
      </div>

      {/* Command palette trigger — desktop only */}
      <div className="hidden md:flex flex-1 max-w-md">
        <button
          data-tour="header-search"
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 w-full max-w-xs px-3 py-2 rounded-lg border border-border/50 bg-muted/40 hover:bg-muted/70 transition-colors text-sm text-muted-foreground group"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left text-xs">Search pages, features...</span>
          <span className="flex items-center gap-0.5 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 group-hover:border-primary/40 transition-colors">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </button>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Toggle Copilot Button */}
        <Button 
          data-tour="header-ai"
          variant="outline" 
          size="sm" 
          className={`hidden md:flex gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/60 text-primary transition-all rounded-full px-3 h-8 shadow-sm ${aiOpen ? 'ring-2 ring-primary/30 bg-primary/15' : ''}`}
          onClick={() => setAiOpen(!aiOpen)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>AI Assistance</span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className={`md:hidden h-9 w-9 text-primary hover:bg-primary/10 rounded-full ${aiOpen ? 'bg-primary/10' : ''}`}
          onClick={() => setAiOpen(!aiOpen)}
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        {/* System Feedback / Bug Report Button */}
        <Dialog open={bugOpen} onOpenChange={setBugOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden md:flex gap-1.5 border-border hover:bg-muted/50 transition-all rounded-full h-8 px-3 shadow-none text-muted-foreground hover:text-foreground"
            >
              <MessageSquareDashed className="h-3.5 w-3.5" />
              <span>Feedback</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary"><Bug className="h-5 w-5" /> Help us improve!</DialogTitle>
              <DialogDescription>
                Spotted a discrepancy, UI issue, or have a suggestion? Let the dev team know directly.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Select value={bugType} onValueChange={setBugType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ui-bug">UI/Visual Bug</SelectItem>
                    <SelectItem value="data-discrepancy">Data Discrepancy (Wrong values)</SelectItem>
                    <SelectItem value="feature-suggestion">New Feature Suggestion</SelectItem>
                    <SelectItem value="performance-issue">Performance/Speed Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Textarea 
                  placeholder="Please describe the issue or suggestion in detail..."
                  className="min-h-[120px] resize-none"
                  value={bugText}
                  onChange={(e) => setBugText(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBugOpen(false)}>Cancel</Button>
              <Button onClick={submitBug} disabled={submittingBug || !bugText.trim()} className="bg-primary hover:bg-[#a66c4a] text-white">
                {submittingBug ? "Submitting..." : <><SendIcon className="h-4 w-4 mr-2" /> Submit Feedback</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PresenceIndicator />

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              data-tour="header-notifications"
              variant="ghost" 
              size="icon" 
              className={`relative h-10 w-10 rounded-full transition-all duration-200 ${isOpen ? 'bg-primary/10 ring-2 ring-primary/20' : 'hover:bg-muted/50'}`}
            >
              <Bell className={`h-5 w-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 mr-4 shadow-xl border-border/50 rounded-xl" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary">{unreadCount} new</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllReadMutation.mutate();
                  }}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-primary gap-1"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto">
              {(!notifications || notifications.length === 0) ? (
                <div className="py-12 px-6 text-center flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                    <BellRing className="h-8 w-8" style={{ color: 'hsl(var(--primary))', opacity: 0.55 }} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">All clear, {(profile?.full_name || "").split(' ')[0] || 'champ'}! 🎉</p>
                    <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                      Your notifications from tasks, leave approvals, and team updates will show up here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n: any) => (
                    <div 
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/[0.03]' : ''}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium leading-none truncate ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                        {n.link && (
                          <div className="flex items-center text-xs font-medium mt-1.5 gap-1" style={{ color: 'hsl(var(--primary))' }}>
                            View details <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      {!n.is_read && (
                        <div className="flex-shrink-0 mt-1.5">
                          <span className="block h-2 w-2 rounded-full bg-primary"></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
    </>
  );
}
