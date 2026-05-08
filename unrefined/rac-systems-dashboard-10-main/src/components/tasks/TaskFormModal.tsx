import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ListTodo, Sparkles, Loader2 } from "lucide-react";

interface ProfileLite { id: string; full_name: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formData: any;
  setFormData: (d: any) => void;
  onSubmit: () => void;
  editingId: string | null;
  profiles: ProfileLite[];
  departments: string[];
  priorities: string[];
  statuses: string[];
  submitting?: boolean;
}

export const TaskFormModal = ({
  open, onOpenChange, formData, setFormData, onSubmit, editingId,
  profiles, departments, priorities, statuses, submitting = false,
}: Props) => {
  const titleLen = (formData.title || "").length;
  const titleInvalid = titleLen === 0 || titleLen > 200;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] w-[92vw] p-0 overflow-hidden border-0 shadow-lvl-3 rounded-[20px] [&>button]:hidden">
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Left dark hero */}
          <div className="md:w-[40%] premium-hero-gradient p-8 md:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-10 -right-10 w-44 h-44 rounded-full"
              style={{ background: "hsl(var(--primary) / 0.18)", filter: "blur(40px)" }}
            />
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-6">
                <ListTodo className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2 leading-tight">
                {editingId ? "Edit Task" : "Launch New Mission"}
              </h2>
              <p className="text-sm text-white/60 leading-relaxed">
                {editingId
                  ? "Refine scope, reassign, or update the priority."
                  : "Define the brief, route it to the right teammate, and set a clear deadline."}
              </p>
            </div>
            <p className="text-[11px] text-white/40 leading-relaxed flex items-start gap-2 relative">
              <Sparkles className="h-3.5 w-3.5 text-gold mt-0.5 flex-shrink-0" />
              <span><b className="text-white/70">RAC tip:</b> Tasks with a due date are 3.2× more likely to ship on time.</span>
            </p>
          </div>

          {/* Right form */}
          <div className="md:w-[60%] flex flex-col bg-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-base font-bold">{editingId ? "Update Details" : "Task Details"}</h3>
              <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Title *</Label>
                  <span className={`text-[10px] font-mono ${titleLen > 200 ? "text-destructive" : "text-muted-foreground/60"}`}>{titleLen}/200</span>
                </div>
                <Input placeholder="e.g. Q3 Finance Audit" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} maxLength={220} aria-invalid={titleInvalid} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Description</Label>
                <Textarea placeholder="What needs to be done?" value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} className="resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Assigned To</Label>
                  <Select value={formData.assigned_to_user_id || ""} onValueChange={(v) => setFormData({ ...formData, assigned_to_user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Department</Label>
                  <Select value={formData.department || ""} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Due Date</Label>
                  <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!editingId && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Initial Blocker / Note (optional)</Label>
                  <Textarea placeholder="Anything worth flagging upfront?" value={formData.blocker_note || ""} onChange={(e) => setFormData({ ...formData, blocker_note: e.target.value })} rows={2} className="resize-none" />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
              <Button
                onClick={onSubmit}
                disabled={submitting || titleInvalid}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lvl-2 min-w-[140px]"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  editingId ? "Update Task" : "Deploy Task"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};