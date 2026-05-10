import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "super_admin" | "admin" | "team_member" | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  hire_date?: string | null;
}

// Email domain allow-list. Empty array means any email is accepted (useful
// for invited collaborators outside the redtechafrica.com workspace).
const ALLOWED_EMAIL_DOMAINS: string[] = [];

const isAllowedEmail = (email: string) => {
  if (ALLOWED_EMAIL_DOMAINS.length === 0) return true;
  const normalized = email.trim().toLowerCase();
  const [, domain = ""] = normalized.split("@");
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isRole: (...roles: UserRole[]) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from profiles table (never blocks auth flow)
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error("Profile fetch exception:", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // ─── Safety net ───────────────────────────────────────────────────────────
    // Guarantees the loading gate is released within 6 s no matter what,
    // so a slow/failed profile fetch can never cause a permanent blank screen.
    const safetyTimer = setTimeout(() => setLoading(false), 6000);

    // ─── Single source of truth ───────────────────────────────────────────────
    // Supabase v2 fires INITIAL_SESSION automatically on listener setup, so
    // we don't need a separate getSession() call. Using both caused a race.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!mounted) return;

        // ── Signed out ─────────────────────────────────────────────────────
        if (event === 'SIGNED_OUT' || !s?.user) {
          clearTimeout(safetyTimer);
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // ── Token refresh ──────────────────────────────────────────────────
        // Only update the token — skip the profile re-fetch to stay fast.
        if (event === 'TOKEN_REFRESHED') {
          setSession(s);
          return;
        }

        // ── Initial load / sign-in ─────────────────────────────────────────
        // Set user + session IMMEDIATELY so the Auth page can navigate
        // without waiting for the profile.  Profile arrives shortly after
        // in the background — the UI shows a skeleton in the meantime.
        setSession(s);
        setUser(s.user);
        clearTimeout(safetyTimer);
        setLoading(false);

        // Background profile fetch (fire-and-forget, never blocks the UI)
        fetchProfile(s.user.id)
          .then(p => { if (mounted) setProfile(p); })
          .catch(() => { /* profile stays null — handled gracefully in UI */ });
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!isAllowedEmail(email)) {
      return { error: "Use your verified work email to create an account." };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  const isRole = (...roles: UserRole[]) => {
    if (!profile) return false;
    return roles.includes(profile.role);
  };

  const isSuperAdmin = profile?.role === "super_admin";
  const isAdmin = profile?.role === "admin" || isSuperAdmin;
  const isViewer = profile?.role === "viewer";
  const canEdit = isAdmin || profile?.role === "team_member";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        resetPassword,
        signOut,
        isRole,
        isSuperAdmin,
        isAdmin,
        canEdit,
        isViewer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
