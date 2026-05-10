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
  /** True after the first explicit getSession() attempt finishes — prevents redirects to /auth while the stored session is still restoring. */
  authBootstrapped: boolean;
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
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

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
    const profileLoadedRef = { current: false };

    const loadProfile = (userId: string) => {
      fetchProfile(userId)
        .then((p) => {
          if (!mounted) return;
          profileLoadedRef.current = !!p;
          setProfile(p);
        })
        .catch(() => {
          if (mounted) profileLoadedRef.current = false;
        });
    };

    const commitSession = (s: Session | null, shouldLoadProfile = true) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (shouldLoadProfile && !profileLoadedRef.current) {
          window.setTimeout(() => loadProfile(s.user.id), 0);
        }
      } else {
        setProfile(null);
        profileLoadedRef.current = false;
      }
      setLoading(false);
    };

    // Auth callbacks must stay synchronous. Calling Supabase auth methods
    // inside this callback can deadlock signInWithPassword and leave the
    // login button spinning forever.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        commitSession(null);
        return;
      }

      if (s?.user) {
        commitSession(s, event !== "TOKEN_REFRESHED" || !profileLoadedRef.current);
        return;
      }

      // Let the explicit getSession() check below be authoritative on first
      // page load so a transient INITIAL_SESSION:null cannot kick users back
      // to /auth while the stored session is still being restored.
      if (event !== "INITIAL_SESSION") commitSession(null);
    });

    withTimeout(supabase.auth.getSession(), 15000)
      .then(({ data: { session: s } }) => commitSession(s))
      .catch(() => commitSession(null))
      .finally(() => {
        if (mounted) setAuthBootstrapped(true);
      });

    // If getSession never settles (extremely rare), unblock the UI so we do not spin forever.
    const failsafeTimer = setTimeout(() => {
      if (mounted) setAuthBootstrapped(true);
    }, 30000);

    return () => {
      mounted = false;
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      if (error) return { error: error.message };
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Login failed. Please try again." };
    }
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
    // scope:'local' clears only the browser session — instant, no server
    // round-trip, and critically NO background SIGNED_OUT event that could
    // race with and wipe a subsequent re-login's profile.
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
    void supabase.auth.signOut({ scope: 'local' }).catch((error) => {
      console.error("Local sign out cleanup failed:", error);
    });
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
        authBootstrapped,
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
