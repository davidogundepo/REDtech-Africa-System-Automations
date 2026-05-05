import { useEffect, useRef, useCallback } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

const TOUR_STORAGE_PREFIX = "rta-feature-tour-v2:";
const TOUR_RESET_TITLE = "[SYSTEM_TOUR_RESET]";

type Role = "super_admin" | "admin" | "team_member" | "viewer";

function buildSteps(firstName: string, role: Role | undefined) {
  const isAdmin = role === "super_admin" || role === "admin";

  const welcome = {
    popover: {
      title: `👋 Welcome to RAC Automations, ${firstName}!`,
      description:
        `Let's take a quick 60-second tour of your workspace. You can skip with <kbd>Esc</kbd>, replay anytime from your profile, and an admin can reset this for you whenever you want a refresher.`,
    },
  };

  const dashboard = {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: "🏠 Dashboard",
      description: "Your daily command centre — KPIs, your tasks, attendance status, and a feed of what's happening across the team.",
      side: "right" as const,
      align: "start" as const,
    },
  };

  const modules = [
    { el: 'nav-invoice', icon: '💰', title: 'Invoice Generator', desc: 'Create branded invoices with live preview, auto-numbering, and one-click PDF export or email send.' },
    { el: 'nav-partnerships', icon: '🤝', title: 'Partnership Generator', desc: 'Draft partnership proposals and contracts in your house style, ready to send.' },
    { el: 'nav-waybill', icon: '🚚', title: 'Waybill Generator', desc: 'Issue dispatch waybills with item lists, recipient details and printable PDFs.' },
    { el: 'nav-clients', icon: '👥', title: 'Client Directory', desc: 'Your CRM. Profiles, contacts, contracts and history — all searchable.' },
    { el: 'nav-tasks', icon: '✅', title: 'Task Tracker', desc: 'Kanban boards for assigning, prioritising and tracking work across teams and projects.' },
    { el: 'nav-leave', icon: '🌴', title: 'Leave Management', desc: 'Request, approve and track leave with built-in awareness of Nigerian public holidays.' },
    { el: 'nav-attendance', icon: '⏱️', title: 'Attendance & Timesheets', desc: 'Clock in / out, view heatmaps, and export timesheets for payroll.' },
  ].map(m => ({
    element: `[data-tour="${m.el}"]`,
    popover: {
      title: `${m.icon} ${m.title}`,
      description: m.desc,
      side: "right" as const,
      align: "start" as const,
    },
  }));

  const search = {
    element: '[data-tour="header-search"]',
    popover: {
      title: "⌘ Universal Search",
      description: `Press <kbd>${typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "⌘K" : "Ctrl+K"}</kbd> anywhere to jump between pages, find features, or trigger actions in seconds.`,
      side: "bottom" as const,
    },
  };

  const ai = {
    element: '[data-tour="header-ai"]',
    popover: {
      title: "✨ AI Assistance",
      description: "Your built-in copilot. Ask it to summarise tasks, draft emails, explain numbers on your dashboard, or guide you through any workflow.",
      side: "bottom" as const,
    },
  };

  const notifications = {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: "🔔 Live Notifications",
      description: "Real-time updates for task assignments, leave approvals, mentions and important system events. The dot pulses when something new arrives.",
      side: "bottom" as const,
      align: "end" as const,
    },
  };

  const profileFooter = {
    element: '[data-tour="footer-profile"]',
    popover: {
      title: "👤 Your Profile",
      description: "Click your avatar anytime to view your profile, performance score, and settings. Your role and department are shown right below your name.",
      side: "right" as const,
      align: "end" as const,
    },
  };

  const adminNav = {
    element: '[data-tour="nav-users"]',
    popover: {
      title: "🛡️ User Management",
      description: "Invite teammates, assign roles, manage departments, broadcast notifications, and reset onboarding tours for any user.",
      side: "right" as const,
      align: "start" as const,
    },
  };

  const closing = {
    popover: {
      title: "🎉 You're all set!",
      description: `That's the tour, ${firstName}. Explore freely — and remember, <kbd>${typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0 ? "⌘K" : "Ctrl+K"}</kbd> is your fastest friend. Welcome aboard.`,
    },
  };

  return [
    welcome,
    dashboard,
    ...modules,
    search,
    ai,
    notifications,
    profileFooter,
    ...(isAdmin ? [adminNav] : []),
    closing,
  ];
}

function makeDriver(steps: ReturnType<typeof buildSteps>, onDone?: () => void) {
  return driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.65,
    stagePadding: 6,
    stageRadius: 12,
    popoverClass: "rta-tour-popover",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it!",
    progressText: "Step {{current}} of {{total}}",
    steps,
    onDestroyed: () => {
      onDone?.();
    },
  });
}

export function FeatureTour() {
  const { user, profile, loading } = useAuth();
  const driverRef = useRef<Driver | null>(null);
  const ranRef = useRef(false);

  const runTour = useCallback((firstName: string, role: Role | undefined, storageKey: string) => {
    const steps = buildSteps(firstName, role);
    const d = makeDriver(steps, () => {
      localStorage.setItem(storageKey, new Date().toISOString());
    });
    driverRef.current = d;
    d.drive();
  }, []);

  useEffect(() => {
    if (loading || !user || !profile || ranRef.current) return;
    ranRef.current = true;

    const storageKey = `${TOUR_STORAGE_PREFIX}${user.id}`;
    const firstName = (profile.full_name || "there").split(" ")[0];

    (async () => {
      // Check for an admin-issued tour reset (unread special notification)
      let resetNotifId: string | null = null;
      try {
        const { data } = await (supabase as any)
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", TOUR_RESET_TITLE)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          resetNotifId = data.id;
          localStorage.removeItem(storageKey);
        }
      } catch {
        // silent — never block the app on this check
      }

      // If user has already completed the tour and there's no reset, do nothing
      if (localStorage.getItem(storageKey) && !resetNotifId) return;

      // Wait for sidebar / header to mount
      const timer = setTimeout(() => {
        const firstTarget = document.querySelector('[data-tour="nav-dashboard"]');
        if (!firstTarget) return;
        runTour(firstName, profile.role as Role, storageKey);

        // Mark the reset notification as read so it doesn't re-trigger
        if (resetNotifId) {
          (supabase as any)
            .from("notifications")
            .update({ is_read: true })
            .eq("id", resetNotifId)
            .then(() => {});
        }
      }, 900);

      return () => clearTimeout(timer);
    })();

    return () => {
      driverRef.current?.destroy();
    };
  }, [user, profile, loading, runTour]);

  return null;
}

/** Manual replay — call from anywhere (e.g. profile menu button). */
export function startFeatureTour(firstName = "there", role?: Role) {
  const steps = buildSteps(firstName, role);
  const d = makeDriver(steps);
  d.drive();
}

/** Admin helper — reset a teammate's tour by inserting a notification. */
export async function resetUserTour(targetUserId: string, targetName: string, byName: string) {
  const { error } = await (supabase as any).from("notifications").insert({
    user_id: targetUserId,
    title: TOUR_RESET_TITLE,
    message: `${byName} reset your onboarding tour. It will replay next time you open the app.`,
    type: "info",
    is_read: false,
  });
  if (error) throw error;
  return { ok: true, targetName };
}
