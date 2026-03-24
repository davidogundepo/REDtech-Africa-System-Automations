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

const roleColors: Record<string, string> = {
  super_admin: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  team_member: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
};

const TeamDirectory = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: profiles } = useQuery({
    queryKey: ["team-directory"],
    queryFn: async () => {
      // @ts-ignore — Supabase deep generic chain exceeds TS recursion limit
      const { data, error } = await supabase.from("profiles").select("*").eq("status", "active").order("full_name");
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
      return matchesSearch && matchesDept;
    });
  }, [profiles, search, deptFilter]);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-6 md:p-10 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Hero Header */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-[#bc7e57]/10 via-[#bc7e57]/5 to-transparent border border-[#bc7e57]/15 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#bc7e57]/20 flex items-center justify-center">
                <Users className="h-7 w-7" style={{ color: "#bc7e57" }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Team Directory</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {profiles?.length || 0} team members across {departments.length} departments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center bg-card px-5 py-3 rounded-xl border border-border/50 shadow-sm">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Members</p>
                <p className="text-2xl font-black" style={{ color: "#bc7e57" }}>{profiles?.length || 0}</p>
              </div>
              <div className="text-center bg-card px-5 py-3 rounded-xl border border-border/50 shadow-sm">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Departments</p>
                <p className="text-2xl font-black text-foreground">{departments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, title, or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl border-border/50"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px] h-11 rounded-xl border-border/50">
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
          <div className="flex border border-border/50 rounded-xl overflow-hidden">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none h-11 px-4 ${viewMode === "grid" ? "bg-[#bc7e57] text-white hover:bg-[#a56d49]" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none h-11 px-4 ${viewMode === "list" ? "bg-[#bc7e57] text-white hover:bg-[#a56d49]" : ""}`}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {filtered.map(member => (
              <Card key={member.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-[#bc7e57]/30 overflow-hidden">
                {/* Accent strip */}
                <div className="h-1.5 w-full bg-gradient-to-r from-[#bc7e57] to-[#d4a574]" />
                <CardContent className="p-6 flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="h-24 w-24 rounded-2xl bg-[#bc7e57]/10 flex items-center justify-center text-2xl font-bold overflow-hidden mb-4 shadow-lg group-hover:shadow-xl transition-shadow ring-2 ring-[#bc7e57]/20" style={{ color: "#bc7e57" }}>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(member.full_name || "U")
                    )}
                  </div>
                  {/* Name */}
                  <h3 className="font-bold text-foreground text-lg leading-tight">{member.full_name}</h3>
                  {/* Job title */}
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {(member as any).job_title || roleLabels[member.role] || "Team Member"}
                  </p>
                  {/* Department */}
                  {member.department && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">{member.department}</span>
                    </div>
                  )}
                  {/* Role badge */}
                  <Badge variant="outline" className={`mt-3 text-[10px] font-semibold ${roleColors[member.role] || roleColors.team_member}`}>
                    {roleLabels[member.role] || member.role}
                  </Badge>
                  {/* Contact icons */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/40 w-full justify-center">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="h-8 w-8 rounded-lg bg-muted/50 hover:bg-[#bc7e57]/10 flex items-center justify-center transition-colors" title={member.email}>
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {(member as any).phone && (
                      <a href={`tel:${(member as any).phone}`} className="h-8 w-8 rounded-lg bg-muted/50 hover:bg-[#bc7e57]/10 flex items-center justify-center transition-colors" title={(member as any).phone}>
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {(member as any).linkedin_url && (
                      <a href={(member as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-muted/50 hover:bg-[#bc7e57]/10 flex items-center justify-center transition-colors" title="LinkedIn">
                        <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                      </a>
                    )}
                    {(member as any).location && (
                      <span className="h-8 rounded-lg bg-muted/50 flex items-center gap-1 px-2 text-[10px] text-muted-foreground font-medium" title={(member as any).location}>
                        <MapPin className="h-3 w-3" /> {(member as any).location}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filtered.map(member => (
              <Card key={member.id} className="hover:shadow-md transition-all duration-200 border-border/50 hover:border-[#bc7e57]/30">
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-14 w-14 rounded-xl bg-[#bc7e57]/10 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden ring-1 ring-[#bc7e57]/20" style={{ color: "#bc7e57" }}>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(member.full_name || "U")
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground">{member.full_name}</h3>
                      <Badge variant="outline" className={`text-[9px] font-semibold ${roleColors[member.role] || roleColors.team_member}`}>
                        {roleLabels[member.role] || member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {(member as any).job_title || roleLabels[member.role] || "Team Member"}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {member.department && (
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {member.department}</span>
                      )}
                      {member.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {member.email}</span>
                      )}
                      {(member as any).location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(member as any).location}</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="h-9 w-9 rounded-lg border border-border/50 hover:border-[#bc7e57]/30 hover:bg-[#bc7e57]/5 flex items-center justify-center transition-colors">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                    {(member as any).linkedin_url && (
                      <a href={(member as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-lg border border-border/50 hover:border-[#bc7e57]/30 hover:bg-[#bc7e57]/5 flex items-center justify-center transition-colors">
                        <Linkedin className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="font-semibold text-foreground">No team members found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </MotionPage>
  );
};

export default TeamDirectory;
