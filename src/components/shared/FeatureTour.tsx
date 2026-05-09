import { useEffect, useRef, useCallback } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

// ───────────────────────────────────────────────────
// TOUR KILL SWITCH — flip to true to re-enable the onboarding tour
const TOUR_ENABLED = false;
// ───────────────────────────────────────────────────

const TOUR_STORAGE_PREFIX = "rta-feature-tour-v2:";
const TOUR_RESET_TITLE = "[SYSTEM_TOUR_RESET]";

type Role = "super_admin" | "admin" | "team_member" | "viewer";

function buildSteps(firstName: string, role: Role | undefined) {
  const isAdmin = role === "super_admin" || role === "admin";
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmd = isMac ? "⌘K" : "Ctrl+K";

  const welcome = {
    // Intentionally unanchored — intro card, driver.js centres it
    popover: {
      title: `Welcome aboard, ${firstName} 👋`,
      description:
        `<p style="margin:0 0 10px">You're looking at <strong>RAC Automations</strong> — your team's command centre for invoicing, partnerships, tasks, attendance and more.</p>` +
        `<p style="margin:0;color:hsl(var(--muted-foreground))">This 60-second tour shows you where everything lives. Press <kbd>Esc</kbd> to skip — you can replay it from the sidebar anytime.</p>`,
    },
  };

  // Dashboard anchors to the real sidebar nav item
  const dashboard = {
    element: '[data-tour="nav-dashboard"]',
    popover: {
      title: "Your Dashboard 🏠",
      description:
        `<p style="margin:0 0 8px">This is your daily home base — live KPIs, your tasks, attendance status, and a real-time feed of what's happening across the team.</p>` +
        `<p style="margin:0;color:hsl(var(--muted-foreground))">You'll land here every time you log in.</p>`,
      side: "right" as const,
      align: "start" as const,
    },
  };

  const modules = [
    { el: 'nav-invoice',      icon: '💰', title: 'Invoice Generator',        desc: 'Create branded invoices with live preview, auto-numbering, VAT, and one-click PDF export or email send.' },
    { el: 'nav-partnerships', icon: '🤝', title: 'Partnership Generator',    desc: 'Draft partnership proposals and contracts in your house style, ready to send to prospects.' },
    { el: 'nav-waybill',      icon: '🚚', title: 'Waybill Generator',        desc: 'Issue dispatch waybills with itemised lists, recipient details and printable PDFs.' },
    { el: 'nav-clients',      icon: '👥', title: 'Client Directory',         desc: 'Your CRM. Profiles, contacts, contracts and full history — all searchable and filterable.' },
    { el: 'nav-tasks',        icon: '✅',  title: 'Task Tracker',             desc: 'Kanban boards for assigning, prioritising and tracking work across teams, projects and departments.' },
    { el: 'nav-leave',        icon: '🌴', title: 'Leave Management',         desc: 'Request, approve and track leave with built-in awareness of Nigerian public holidays.' },
    { el: 'nav-attendance',   icon: '⏱️',  title: 'Attendance & Timesheets', desc: 'Clock in / out, view heatmaps, and export timesheets straight to payroll.' },
  ].map(m => ({
    element: `[data-tour="${m.el}"]`,
    popover: {
      title: `${m.icon}  ${m.title}`,
      description: `<p style="margin:0">${m.desc}</p>`,
      side: "right" as const,
      align: "start" as const,
    },
  }));

  const search = {
    element: '[data-tour="header-search"]',
    popover: {
      title: "⌘  Universal Search",
      description: `<p style="margin:0 0 8px">Press <kbd>${cmd}</kbd> anywhere to jump between pages, find clients, or trigger actions in seconds.</p><p style="margin:0;color:hsl(var(--muted-foreground))">Once you learn it, you'll never click the sidebar again.</p>`,
      side: "bottom" as const,
    },
  };

  const ai = {
    element: '[data-tour="header-ai"]',
    popover: {
      title: "✨  AI Copilot",
      description: `<p style="margin:0">Your built-in assistant. Ask it to summarise tasks, draft emails, explain numbers on your dashboard, or guide you through any workflow — in plain English.</p>`,
      side: "bottom" as const,
    },
  };

  const notifications = {
    element: '[data-tour="header-notifications"]',
    popover: {
      title: "🔔  Live Notifications",
      description: `<p style="margin:0">Real-time updates for task assignments, leave approvals, mentions and important system events. The dot pulses when something new arrives.</p>`,
      side: "bottom" as const,
      align: "end" as const,
    },
  };

  const profileFooter = {
    element: '[data-tour="footer-profile"]',
    popover: {
      title: "👤  Your Profile",
      description: `<p style="margin:0">Click your avatar to view your profile, performance score and personal settings. Your role and department live right under your name.</p>`,
      side: "right" as const,
      align: "end" as const,
    },
  };

  const adminNav = {
    element: '[data-tour="nav-users"]',
    popover: {
      title: "🛡️  User Management",
      description: `<p style="margin:0">Invite teammates, assign roles, manage departments, broadcast notifications and reset onboarding tours for any user — all from one place.</p>`,
      side: "right" as const,
      align: "start" as const,
    },
  };

  const closing = {
    // Intentionally unanchored — outro card
    popover: {
      title: `You're all set, ${firstName} 🎉`,
      description:
        `<p style="margin:0 0 10px">That's the whirlwind tour. Explore freely — every page has live data and the AI Copilot is one click away.</p>` +
        `<p style="margin:0;color:hsl(var(--muted-foreground))">Pro tip: <kbd>${cmd}</kbd> is your fastest friend on this platform. Welcome to the team. 🚀</p>`,
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

/**
 * Keep steps that either:
 *  - have no element (welcome / closing floating cards only), OR
 *  - have an element that exists in the current DOM.
 * Steps with an element selector that matches nothing are dropped entirely
 * (prevents floating bottom popovers for anchored steps).
 */
function filterAvailableSteps(steps: ReturnType<typeof buildSteps>) {
  if (typeof document === "undefined") return steps;
  return steps.filter((s: any) => {
    if (!s.element) return true; // welcome / closing — intentionally floating
    return !!document.querySelector(s.element); // drop if element not in DOM
  });
}

function makeDriver(steps: ReturnType<typeof buildSteps>, onDone?: () => void) {
  return driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.5,
    stagePadding: 8,
    stageRadius: 14,
    popoverOffset: 14,
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
    const allSteps = buildSteps(firstName, role);
    const steps = filterAvailableSteps(allSteps);
    const d = makeDriver(steps, () => {
      localStorage.setItem(storageKey, new Date().toISOString());
    });
    driverRef.current = d;
    d.drive();
  }, []);

  useEffect(() => {
    // Tour is disabled — flip TOUR_ENABLED to true to re-enable
    if (!TOUR_ENABLED) return;
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

/** Manual replay — disabled while TOUR_ENABLED = false. */
export function startFeatureTour(firstName = "there", role?: Role) {
  if (!TOUR_ENABLED) return;
  // If the sidebar nav isn't in the DOM (e.g. called from /auth), bail
  const hasSidebar = !!document.querySelector('[data-tour="nav-dashboard"]');
  if (!hasSidebar) {
    console.warn("FeatureTour: sidebar not mounted, cannot replay tour.");
    return;
  }
  const steps = filterAvailableSteps(buildSteps(firstName, role));
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
