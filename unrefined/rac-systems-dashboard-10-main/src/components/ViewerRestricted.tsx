import { Shield, Mail, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendNotificationEmail } from "@/lib/email";
import { brandedEmailTemplate } from "@/lib/email-template";

interface ViewerRestrictedProps {
  action?: string; // e.g. "create invoices", "manage tasks"
}

export function ViewerRestricted({ action = "perform this action" }: ViewerRestrictedProps) {
  const { profile } = useAuth();
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendUpgradeRequest = async () => {
    if (!message.trim()) {
      toast.error("Please write a message explaining why you'd like an upgrade.");
      return;
    }
    setSending(true);
    try {
      // Create notification for Ayomide (find her by email)
      const { data: ayoProfile } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("email", "ayomide@redtechafrica.com")
        .maybeSingle();

      if (ayoProfile) {
        await (supabase as any).from("notifications").insert({
          user_id: ayoProfile.id,
          title: `Role Upgrade Request from ${profile?.full_name || "a Viewer"}`,
          message: message,
          type: "warning",
          link: "/users",
        });
      }

      // Also send email
      try {
        await sendNotificationEmail({
          to: "ayomide@redtechafrica.com",
          subject: `Role Upgrade Request — ${profile?.full_name || "Viewer"}`,
          html: brandedEmailTemplate({
            recipientName: "Ayomide",
            heading: "Role Upgrade Request",
            body: `
              <p><strong>${profile?.full_name || "A viewer"}</strong> (${profile?.email || ""}) is requesting a role upgrade on the RAC Automations Dashboard.</p>
              <div style="background: #f8f4f0; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #C4622D;">
                <p style="margin: 0; font-style: italic;">"${message}"</p>
              </div>
              <p>You can manage roles in User Management.</p>
            `,
            ctaText: "Manage Roles",
            ctaUrl: "https://ractools.vercel.app/users",
          }),
        });
      } catch (emailErr) {
        console.error("Email sending failed:", emailErr);
      }

      toast.success("Your upgrade request has been sent to Ayomide! 🚀");
      setUpgradeDialog(false);
      setMessage("");
    } catch (err) {
      toast.error("Failed to send request. Please email ayomide@redtechafrica.com directly.");
    }
    setSending(false);
  };

  return (
    <>
      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="py-12 px-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8" style={{ color: 'hsl(var(--primary))', opacity: 0.5 }} />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg font-semibold">Viewer Access Only</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As a Viewer, you can browse and explore this module but you cannot {action}. 
              If you need full access, request an upgrade — it's easy!
            </p>
          </div>
          <Button 
            onClick={() => setUpgradeDialog(true)}
            className="gap-2 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" />
            Request Access Upgrade
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Or email <a href="mailto:ayomide@redtechafrica.com" className="underline" style={{ color: 'hsl(var(--primary))' }}>ayomide@redtechafrica.com</a> directly
          </p>
        </CardContent>
      </Card>

      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
              Request a Role Upgrade
            </DialogTitle>
            <DialogDescription>
              Tell Ayomide why you'd like an upgrade. She'll review your request and get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi Ayomide! I'd like to be upgraded to a Team Member so I can create invoices and manage tasks for my department..."
              rows={4}
            />
            <Button
              onClick={handleSendUpgradeRequest}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={sending}
            >
              <Mail className="h-4 w-4" />
              {sending ? "Sending..." : "Send Upgrade Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
