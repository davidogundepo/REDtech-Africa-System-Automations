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

    // ── Ref lets the onAuthStateChange closure see the latest profile
    // without stale closure issues (can't read React state inside a listener).
    const profileLoadedRef = { current: false };

    // ── Helper: fetch profile and commit to state ───────────────────────
    const loadProfile = (userId: string) =>
      fetchProfile(userId).then(p => {
        if (!mounted) return;
        profileLoadedRef.current = !!p;
        setProfile(p);
      }).catch(() => {
        if (mounted) profileLoadedRef.current = false;
      });

    // ── Initial session via getSession() ────────────────────────────────
    // getSession() VALIDATES the stored token (and auto-refreshes if
    // expired) BEFORE returning.  This guarantees that the profile fetch
    // hits Supabase with a valid auth token, so RLS never rejects it.
    // (Relying only on onAuthStateChange → INITIAL_SESSION means the fetch
    // can run before the token has been refreshed, causing silent RLS
    // failures and a forever-missing profile on page refresh.)
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Await profile so the UI never renders without it on reload
        const p = await fetchProfile(s.user.id);
        if (mounted) {
          profileLoadedRef.current = !!p;
          setProfile(p);
        }
      }
      if (mounted) setLoading(false);
    });

    // ── Auth state change listener ───────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!mounted) return;

        // INITIAL_SESSION is already handled by getSession() above — skip it
        // here to prevent a duplicate profile fetch and race condition.
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT' || !s?.user) {
          setSession(null);
          setUser(null);
          setProfile(null);
          profileLoadedRef.current = false;
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // Update the session token.  If the initial profile fetch failed
          // because the old token was expired, now retry it with the new token.
          setSession(s);
          if (!profileLoadedRef.current) loadProfile(s.user.id);
          return;
        }

        // SIGNED_IN (fresh login): expose user+session immediately so the
        // Auth page can navigate without waiting for the profile DB call.
        setSession(s);
        setUser(s.user);
        setLoading(false);
        loadProfile(s.user.id);
      }
    );

    return () => {
      mounted = false;
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
    // Optimistic logout — clear local state IMMEDIATELY so the UI
    // transitions to /auth without waiting for a network round-trip.
    // Supabase server-side session invalidation runs non-blocking.
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
    supabase.auth.signOut().catch(err =>
      console.warn('Background sign-out error (non-fatal):', err)
    );
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
