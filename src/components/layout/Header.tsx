import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Info, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
    refetchInterval: 15000, // Poll every 15 seconds
  });

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      const { error } = await supabase
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
      const { error } = await supabase
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
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'alert': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
        <span className="font-semibold text-sm" style={{ color: '#bc7e57' }}>RAC System Automations</span>
      </div>
      <div className="hidden md:flex flex-1" />
      
      <div className="flex items-center gap-4">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted/50 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground transition-all hover:text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-background"></span>
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[380px] p-0 mr-4 shadow-xl border-border/50" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllReadMutation.mutate();
                  }}
                  className="text-xs h-8 text-muted-foreground hover:text-primary gap-1"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>
            
            <div className="max-h-[70vh] overflow-y-auto">
              {notifications?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Bell className="h-8 w-8 opacity-20" />
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications?.map((n) => (
                    <div 
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={"flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer " + (!n.is_read ? "bg-primary/5" : "")}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex items-center justify-between gap-2">
                          <p className={"text-sm font-medium leading-none truncate " + (!n.is_read ? "text-foreground" : "text-muted-foreground")}>
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
                          <div className="flex items-center text-xs font-medium text-primary mt-2 gap-1">
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

        {/* Profile Avatar / Mini Info can go here later if needed */}
      </div>
    </header>
  );
}
