import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  online_at: string;
}

/**
 * useTeamPresence
 * ---------------
 * Joins a global Supabase Realtime presence channel ("team-presence") and
 * tracks every authenticated user currently connected. Returns a deduped
 * array of online team members. Automatically untracks on unmount or
 * sign-out. Safe to call from multiple components — Supabase reuses a
 * single underlying connection per channel name.
 */
export function useTeamPresence(): PresenceUser[] {
  const { profile } = useAuth();
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase.channel("team-presence", {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        // Dedupe by user_id (a user may have multiple tabs)
        const map = new Map<string, PresenceUser>();
        Object.values(state).forEach((metas) => {
          (metas as unknown as PresenceUser[]).forEach((m) => {
            if (m?.user_id) map.set(m.user_id, m);
          });
        });
        setOnline(Array.from(map.values()));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.full_name, profile?.avatar_url]);

  return online;
}
