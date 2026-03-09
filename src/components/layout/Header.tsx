import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Info, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, BellRing, Sparkles } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) { console.error("Notifications error:", error); return []; }
      return data || [];
    },
    enabled: !!profile,
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", profile.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] });
    }
  });

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
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
      default: return <Info className="h-5 w-5" style={{ color: '#bc7e57' }} />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
        <span className="font-semibold text-sm" style={{ color: '#bc7e57' }}>RAC Automations</span>
      </div>
      <div className="hidden md:flex flex-1" />
      
      <div className="flex items-center gap-4">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`relative h-10 w-10 rounded-full transition-all duration-200 ${isOpen ? 'bg-[#bc7e57]/10 ring-2 ring-[#bc7e57]/20' : 'hover:bg-muted/50'}`}
            >
              <Bell className={`h-5 w-5 transition-colors ${isOpen ? 'text-[#bc7e57]' : 'text-muted-foreground hover:text-foreground'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#bc7e57]/40"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#bc7e57] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 mr-4 shadow-xl border-border/50 rounded-xl" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4" style={{ color: '#bc7e57' }} />
                <h4 className="font-semibold text-sm">Notifications</h4>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#bc7e57]">{unreadCount} new</Badge>
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
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-[#bc7e57] gap-1"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto">
              {(!notifications || notifications.length === 0) ? (
                <div className="py-12 px-6 text-center flex flex-col items-center gap-3">
                  <div className="h-16 w-16 rounded-2xl bg-[#bc7e57]/5 flex items-center justify-center">
                    <Sparkles className="h-8 w-8" style={{ color: '#bc7e57', opacity: 0.4 }} />
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
                      className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.is_read ? 'bg-[#bc7e57]/[0.03]' : ''}`}
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
                          <div className="flex items-center text-xs font-medium mt-1.5 gap-1" style={{ color: '#bc7e57' }}>
                            View details <ArrowRight className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      {!n.is_read && (
                        <div className="flex-shrink-0 mt-1.5">
                          <span className="block h-2 w-2 rounded-full bg-[#bc7e57]"></span>
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
  );
}
