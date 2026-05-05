import { Shield, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

/** Small inline banner for viewers on data pages (Tasks, Clients, etc.) */
export function ViewerBanner() {
  const { profile, isViewer } = useAuth();
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!isViewer) return null;

  const handleSendUpgradeRequest = async () => {
    if (!message.trim()) { toast.error("Please write a message."); return; }
    setSending(true);
    try {
      const { data: ayoProfile } = await (supabase as any)
        .from("profiles").select("id").eq("email", "ayomide@redtechafrica.com").maybeSingle();
      if (ayoProfile) {
        await (supabase as any).from("notifications").insert({
          user_id: ayoProfile.id,
          title: `Role Upgrade Request from ${profile?.full_name || "a Viewer"}`,
          message, type: "warning", link: "/users",
        });
      }
      try {
        await sendNotificationEmail({
          to: "ayomide@redtechafrica.com",
          subject: `Role Upgrade Request — ${profile?.full_name || "Viewer"}`,
          html: brandedEmailTemplate({
            heading: "Role Upgrade Request",
            body: `
              <p><strong>${profile?.full_name}</strong> (${profile?.email}) is requesting a role upgrade.</p>
              <div style="background: #f8f4f0; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #C4622D;">
                <p style="margin: 0;">"${message}"</p>
              </div>
            `,
          }),
        });
      } catch (_) {}
      toast.success("Upgrade request sent to Ayomide! 🚀");
      setUpgradeDialog(false); setMessage("");
    } catch { toast.error("Failed. Email ayomide@redtechafrica.com directly."); }
    setSending(false);
  };

  return (
    <>
      <div className="flex items-center gap-3 py-2.5 px-4 rounded-lg bg-primary/5 border border-primary/15 mb-4">
        <Shield className="h-4 w-4 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
        <p className="text-sm text-muted-foreground flex-1">
          <span className="font-medium text-foreground">View-only mode</span> — You're browsing as a Viewer. 
          Actions like creating or editing are restricted.
        </p>
        <Button variant="outline" size="sm" onClick={() => setUpgradeDialog(true)} className="gap-1 text-xs border-primary/30 hover:bg-primary/5" style={{ color: 'hsl(var(--primary))' }}>
          <Sparkles className="h-3 w-3" /> Upgrade
        </Button>
      </div>

      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} /> Request a Role Upgrade</DialogTitle>
            <DialogDescription>Tell Ayomide why you'd like an upgrade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi Ayomide! I'd like to be upgraded so I can..." rows={4} />
            <Button onClick={handleSendUpgradeRequest} className="w-full gap-2" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={sending}>
              {sending ? "Sending..." : "Send Upgrade Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
