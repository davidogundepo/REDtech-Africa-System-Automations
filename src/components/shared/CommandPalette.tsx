import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, CheckSquare, CalendarDays, Users, DollarSign,
  FileText, Share2, BarChart3, Activity, User, UserCog, Search, Command, ArrowRight, Clock
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  group: string;
  keywords?: string[];
}

const ALL_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview & quick stats", icon: <LayoutDashboard className="h-4 w-4"/>, path: "/", group: "Pages", keywords: ["home", "overview"] },
  { id: "tasks", label: "Task Tracker", description: "Manage tasks & deadlines", icon: <CheckSquare className="h-4 w-4"/>, path: "/tasks", group: "Pages", keywords: ["todo", "work", "assign"] },
  { id: "leave", label: "Leave Management", description: "Submit & track leave requests", icon: <CalendarDays className="h-4 w-4"/>, path: "/leave", group: "Pages", keywords: ["holiday", "vacation", "annual", "sick"] },
  { id: "clients", label: "CRM / Clients", description: "Deal book & client directory", icon: <Users className="h-4 w-4"/>, path: "/clients", group: "Pages", keywords: ["crm", "deals", "pipeline", "leads"] },
  { id: "finance", label: "Finance Dashboard", description: "Ledger, budgets & payments", icon: <DollarSign className="h-4 w-4"/>, path: "/finance-dashboard", group: "Pages", keywords: ["money", "budget", "naira", "expense", "ledger"] },
  { id: "docs", label: "Document Repository", description: "Files, links & company docs", icon: <FileText className="h-4 w-4"/>, path: "/documents", group: "Pages", keywords: ["files", "upload", "onedrive", "storage"] },
  { id: "social", label: "Social Media Hub", description: "Schedule & plan content", icon: <Share2 className="h-4 w-4"/>, path: "/social", group: "Pages", keywords: ["instagram", "linkedin", "twitter", "posts", "content"] },
  { id: "staff", label: "Staff Utilisation", description: "Performance & workload", icon: <BarChart3 className="h-4 w-4"/>, path: "/utilisation", group: "Pages", keywords: ["performance", "team", "utilization"] },
  { id: "attendance", label: "Attendance", description: "Clock in/out & daily records", icon: <Activity className="h-4 w-4"/>, path: "/attendance", group: "Pages", keywords: ["clock", "time", "present"] },
  { id: "ops", label: "Ops Dashboard", description: "Delivery metrics & operations", icon: <Activity className="h-4 w-4"/>, path: "/ops-dashboard", group: "Pages", keywords: ["operations", "delivery", "logistics"] },
  { id: "profile", label: "My Profile", description: "Edit your name, photo & details", icon: <User className="h-4 w-4"/>, path: "/profile", group: "Account", keywords: ["avatar", "name", "edit"] },
  { id: "users", label: "User Management", description: "Manage team roles & access", icon: <UserCog className="h-4 w-4"/>, path: "/users", group: "Admin", keywords: ["roles", "admin", "team", "invite"] },
];

const RECENT_KEY = "rac_recent_pages";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function saveRecent(path: string) {
  const arr = [path, ...getRecent().filter(p => p !== path)].slice(0, 4);
  localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
}

interface Props { onClose: () => void; }

export const CommandPalette = ({ onClose }: Props) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recentPaths = getRecent();

  const commands = ALL_COMMANDS.filter(c => {
    if (c.group === "Admin" && !isAdmin && !isSuperAdmin) return false;
    return true;
  });

  const filtered = query.trim()
    ? commands.filter(c => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          (c.description || "").toLowerCase().includes(q) ||
          (c.keywords || []).some(k => k.includes(q))
        );
      })
    : commands.filter(c => recentPaths.includes(c.path));

  const hasRecent = !query.trim() && recentPaths.length > 0;
  const showAll = !query.trim() && recentPaths.length === 0;
  const displayItems = showAll ? commands : filtered;

  // Group items
  const groups = displayItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    const g = hasRecent ? "Recent" : item.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const flatItems = displayItems;

  useEffect(() => { setActiveIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const navigateTo = (item: CommandItem) => {
    saveRecent(item.path);
    navigate(item.path);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flatItems.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && flatItems[activeIdx]) navigateTo(flatItems[activeIdx]);
    if (e.key === "Escape") onClose();
  };

  // Scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-active="true"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl mx-4 rounded-2xl shadow-2xl overflow-hidden border border-border/80 bg-background"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.35)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search pages, actions, features..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 border border-border">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-1.5">
          {displayItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30"/>
              <p>No results for "<span className="font-medium text-foreground">{query}</span>"</p>
              <p className="text-xs mt-1 opacity-70">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1.5">
                  {group === "Recent" && <Clock className="h-3 w-3"/>}
                  {group}
                </p>
                {items.map(item => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-[#bc7e57]/12" : "hover:bg-muted/50"}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => navigateTo(item)}
                    >
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "bg-[#bc7e57] text-white" : "bg-muted text-muted-foreground"}`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium block text-foreground">{item.label}</span>
                        {item.description && <span className="text-xs text-muted-foreground truncate block">{item.description}</span>}
                      </span>
                      {isActive && <ArrowRight className="h-3.5 w-3.5 text-[#bc7e57] flex-shrink-0"/>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 py-2 flex items-center justify-between">
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="bg-muted border border-border rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted border border-border rounded px-1">↵</kbd> open</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="font-semibold" style={{ color: "#bc7e57" }}>RAC</span>
            <span>Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
