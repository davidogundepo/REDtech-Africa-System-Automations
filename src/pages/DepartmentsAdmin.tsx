import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MotionPage } from "@/components/shared/MotionPage";

export default function DepartmentsAdmin() {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null);

  const { data: depts = [] } = useQuery({
    queryKey: ["departments-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("departments").select("*").order("sort_order").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: peopleByDept = {} } = useQuery({
    queryKey: ["people-by-dept"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("department");
      const map: Record<string, number> = {};
      for (const p of data || []) {
        const d = (p.department || "").trim();
        if (!d) continue;
        map[d] = (map[d] || 0) + 1;
      }
      return map;
    },
  });

  const addMut = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any).from("departments").insert({ name: name.trim(), sort_order: depts.length + 1 });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments-admin"] }); setNewName(""); toast.success("Department added"); },
    onError: (e: any) => toast.error(e.message || "Could not add"),
  });

  const toggleHidden = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await (supabase as any).from("departments").update({ is_hidden: hidden }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments-admin"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments-admin"] }); setConfirmDelete(null); toast.success("Department deleted"); },
    onError: (e: any) => toast.error(e.message || "Could not delete"),
  });

  if (loading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <MotionPage>
      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Departments</h1>
            <p className="text-sm text-muted-foreground">Add, hide, or remove departments. Hidden departments stop appearing in dropdowns but keep historical data intact.</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Add a department</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="e.g. Customer Success" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) addMut.mutate(newName); }} />
              <Button disabled={!newName.trim() || addMut.isPending} onClick={() => addMut.mutate(newName)}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All departments ({depts.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {depts.map((d: any) => {
                const count = peopleByDept[d.name] || 0;
                return (
                  <div key={d.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${d.is_hidden ? "bg-muted/30 opacity-70" : "bg-card hover:bg-muted/20"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><Building2 className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{d.name} {d.is_hidden && <Badge variant="outline" className="ml-2 text-[10px]">Hidden</Badge>}</p>
                        <p className="text-xs text-muted-foreground">{count} {count === 1 ? "person" : "people"} assigned</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleHidden.mutate({ id: d.id, hidden: !d.is_hidden })}>
                        {d.is_hidden ? <><Eye className="h-4 w-4 mr-1" /> Show</> : <><EyeOff className="h-4 w-4 mr-1" /> Hide</>}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmDelete({ id: d.id, name: d.name, count })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {depts.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No departments yet — add one above.</p>}
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Delete “{confirmDelete?.name}”?</DialogTitle>
              <DialogDescription>
                {confirmDelete && confirmDelete.count > 0 ? (
                  <span><strong>{confirmDelete.count}</strong> {confirmDelete.count === 1 ? "person is" : "people are"} currently assigned to this department. Reassign them first or they'll be left without a department home.</span>
                ) : (
                  <span>This department has no people assigned. Safe to delete.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}>
                {confirmDelete && confirmDelete.count > 0 ? "Delete anyway" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MotionPage>
  );
}