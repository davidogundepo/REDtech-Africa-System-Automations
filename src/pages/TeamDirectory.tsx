import { useState, useMemo } from "react";
import { MotionPage } from "@/components/shared/MotionPage";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, MapPin, Mail, Phone, Linkedin, Users, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};

// Department palette — warm, refined
const deptPalette: Record<string, { ring: string; bg: string; text: string; dot: string }> = {
  default:    { ring: "ring-primary/30",     bg: "bg-primary/8",    text: "text-primary",       dot: "bg-primary" },
  engineering:{ ring: "ring-info/35",        bg: "bg-info/8",       text: "text-info",          dot: "bg-info" },
  design:     { ring: "ring-accent-gold/40", bg: "bg-amber-500/8",  text: "text-amber-700",     dot: "bg-amber-500" },
  marketing:  { ring: "ring-rose-400/40",    bg: "bg-rose-500/8",   text: "text-rose-700",      dot: "bg-rose-500" },
  operations: { ring: "ring-success/35",     bg: "bg-success/8",    text: "text-success",       dot: "bg-success" },
  finance:    { ring: "ring-emerald-500/40", bg: "bg-emerald-500/8",text: "text-emerald-700",   dot: "bg-emerald-500" },
  sales:      { ring: "ring-violet-500/40",  bg: "bg-violet-500/8", text: "text-violet-700",    dot: "bg-violet-500" },
  hr:         { ring: "ring-pink-500/40",    bg: "bg-pink-500/8",   text: "text-pink-700",      dot: "bg-pink-500" },
};

const getDept = (d?: string | null) => {
  if (!d) return deptPalette.default;
  const k = d.toLowerCase();
  return deptPalette[k] || deptPalette.default;
};

const roleBadge = (role: string) => {
  if (role === "super_admin") return "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/40";
  if (role === "admin") return "bg-info/10 text-info border-info/20";
  return "bg-muted text-muted-foreground border-border";
};

const TeamDirectory = () => {
  const { profile: _profile } = useAuth();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: profiles } = useQuery({
    queryKey: ["team-directory"],
    queryFn: async () => {
      // @ts-ignore — Supabase deep generic chain exceeds TS recursion limit
      const { data, error } = await supabase.from("profiles").select("*").eq("is_active", true).order("full_name");
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const departments = useMemo(() => {
    if (!profiles) return [];
    const depts = [...new Set(profiles.map(p => p.department).filter(Boolean))] as string[];
    return depts.sort();
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!profiles) return [];
    return profiles.filter(p => {
      const matchesSearch = !search ||
        p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.department?.toLowerCase().includes(search.toLowerCase()) ||
        (p.job_title as string | null)?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === "all" || p.department === deptFilter;
      const matchesRole = roleFilter === "all" || p.role === roleFilter;
      return matchesSearch && matchesDept && matchesRole;
    });
  }, [profiles, search, deptFilter, roleFilter]);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-6 md:p-10 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Hero Header — premium cream gradient with subtle brand wash */}
        <div className="relative rounded-[20px] overflow-hidden mb-8 surface-bevel p-7 md:p-8">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-accent-gold/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-primary/12 ring-1 ring-primary/20 flex items-center justify-center shadow-lvl-1">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-[28px] font-bold tracking-tight text-foreground leading-tight">
                  Team Directory
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  <span className="font-semibold text-foreground tabular-nums">{profiles?.length || 0}</span> members across{" "}
                  <span className="font-semibold text-foreground tabular-nums">{departments.length}</span> departments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-5 py-3 rounded-xl bg-card border border-border shadow-lvl-1 min-w-[110px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Members</p>
                <p className="text-2xl font-extrabold text-primary tabular-nums mt-0.5">{profiles?.length || 0}</p>
              </div>
              <div className="text-center px-5 py-3 rounded-xl bg-card border border-border shadow-lvl-1 min-w-[110px]">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Departments</p>
                <p className="text-2xl font-extrabold text-foreground tabular-nums mt-0.5">{departments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, title, or department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-card"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px] h-11 rounded-xl bg-card">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[170px] h-11 rounded-xl bg-card">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="team_member">Team Member</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex bg-card border border-border rounded-xl overflow-hidden shadow-lvl-1">
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none h-11 px-4 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-none h-11 px-4 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {filtered.map((member, i) => {
              const dept = getDept(member.department);
              return (
                <div
                  key={member.id}
                  className="group surface-bevel rounded-2xl overflow-hidden animate-card-enter"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {/* Top accent strip — department-coloured */}
                  <div className={`h-1 w-full ${dept.dot}`} />
                  <div className="p-6 flex flex-col items-center text-center">
                    {/* Avatar with department ring */}
                    <div
                      className={`h-[88px] w-[88px] rounded-full ${dept.bg} ${dept.text} ring-4 ring-offset-2 ring-offset-card ${dept.ring} flex items-center justify-center text-[22px] font-bold overflow-hidden mb-4 shadow-lvl-1 group-hover:scale-[1.04] group-hover:shadow-lvl-2 transition-all duration-300`}
                    >
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover rounded-full" />
                      ) : (
                        getInitials(member.full_name || "U")
                      )}
                    </div>
                    {/* Name */}
                    <h3 className="font-bold text-foreground text-[15px] leading-tight tracking-tight">
                      {member.full_name}
                    </h3>
                    {/* Job title */}
                    <p className="text-[13px] text-muted-foreground mt-1 line-clamp-1 px-2">
                      {(member as any).job_title || roleLabels[member.role] || "Team Member"}
                    </p>
                    {/* Department + role badges */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                      {member.department && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${dept.bg} ${dept.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dept.dot}`} />
                          {member.department}
                        </span>
                      )}
                      <Badge variant="outline" className={`text-[10px] font-semibold border ${roleBadge(member.role)}`}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </div>
                    {/* Contact row */}
                    <div className="flex items-center gap-1.5 mt-5 pt-4 border-t border-border/60 w-full justify-center">
                      {member.email && (
                        <a
                          href={`mailto:${member.email}`}
                          className="h-9 w-9 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-all hover:scale-110"
                          title={member.email}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                      {(member as any).phone && (
                        <a
                          href={`tel:${(member as any).phone}`}
                          className="h-9 w-9 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-all hover:scale-110"
                          title={(member as any).phone}
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {(member as any).linkedin_url && (
                        <a
                          href={(member as any).linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-xl bg-muted hover:bg-info/10 hover:text-info text-muted-foreground flex items-center justify-center transition-all hover:scale-110"
                          title="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      )}
                      {(member as any).location && (
                        <span className="h-9 inline-flex items-center gap-1 px-2.5 rounded-xl bg-muted text-muted-foreground text-[11px] font-medium" title={(member as any).location}>
                          <MapPin className="h-3 w-3" /> {(member as any).location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <Card className="overflow-hidden border-border shadow-lvl-1">
            <CardContent className="p-0">
              <div className="grid grid-cols-12 px-5 py-3 bg-muted/40 border-b border-border text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                <div className="col-span-4">Member</div>
                <div className="col-span-3">Department</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Contact</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              {filtered.map((member, i) => {
                const dept = getDept(member.department);
                return (
                  <div
                    key={member.id}
                    className={`grid grid-cols-12 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors ${i % 2 ? "bg-background" : "bg-card"} ${i !== filtered.length - 1 ? "border-b border-border/60" : ""}`}
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className={`h-11 w-11 rounded-xl ${dept.bg} ${dept.text} ring-2 ${dept.ring} flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden shadow-sm`}>
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          getInitials(member.full_name || "U")
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-tight truncate">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {(member as any).job_title || roleLabels[member.role] || "Team Member"}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-3 text-sm">
                      {member.department ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${dept.bg} ${dept.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${dept.dot}`} />
                          {member.department}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold border ${roleBadge(member.role)}`}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground truncate">
                      {member.email || "—"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-1.5">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="h-8 w-8 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-colors">
                          <Mail className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {(member as any).linkedin_url && (
                        <a href={(member as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-muted hover:bg-info/10 hover:text-info text-muted-foreground flex items-center justify-center transition-colors">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-5 shadow-lvl-1">
              <Users className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="font-bold text-foreground text-base">No team members found</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              Try adjusting your search query or filter selection to see more members.
            </p>
          </div>
        )}
      </div>
    </MotionPage>
  );
};

export default TeamDirectory;
