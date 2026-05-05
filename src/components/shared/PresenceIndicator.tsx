import { useTeamPresence } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

/**
 * PresenceIndicator
 * -----------------
 * Compact header widget showing how many teammates are online via a live
 * Supabase presence channel. Click reveals their avatars and names.
 */
export function PresenceIndicator() {
  const { profile } = useAuth();
  const online = useTeamPresence();
  const others = online.filter((u) => u.user_id !== profile?.id);
  const count = others.length;

  const initials = (name?: string) =>
    (name || "?")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hidden md:flex h-9 gap-2 rounded-full px-3 hover:bg-muted/50"
          title={`${count} teammate${count === 1 ? "" : "s"} online`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{count} online</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 mr-4 shadow-xl border-border/50 rounded-xl" align="end">
        <div className="px-4 py-3 border-b bg-muted/20">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Online now
            <Badge className="ml-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-[10px]">
              {count}
            </Badge>
          </h4>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {others.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">
              No teammates online right now.
            </p>
          ) : (
            others.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/40">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.avatar_url || undefined} alt={u.full_name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {initials(u.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">Active now</p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
