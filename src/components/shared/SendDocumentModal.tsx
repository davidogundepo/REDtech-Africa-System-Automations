import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Sparkles, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendDocumentByEmail } from "@/lib/send-document";

interface SendDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printNode?: HTMLElement | null;
  /** "invoice" | "waybill" | "partnership" — used for activity log + default copy */
  entityType: string;
  entityId: string;
  /** Pretty title shown in the hero ("Waybill", "Partnership Agreement", …) */
  documentLabel: string;
  /** Pre-filled recipient email if known */
  defaultTo?: string;
  /** Recipient name for body copy ("Hi {name}, …") */
  recipientName?: string;
  /** Sender / company name shown in signature */
  companyName?: string;
  /** Default subject + filename base (without extension) */
  defaultSubject: string;
  filenameBase: string;
  onSent?: () => void;
}

async function htmlToPdfBlob(node: HTMLElement, filename: string): Promise<Blob> {
  const html2pdf = ((await import("html2pdf.js" as any)) as any).default;
  const worker = html2pdf().set({
    margin: 0,
    filename,
    image: { type: "jpeg", quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(node);
  return await worker.outputPdf("blob");
}

/**
 * Reusable "Send to client" modal that snapshots the current preview node
 * to PDF and dispatches it via the send-document-email edge function.
 * Used by Waybill + Partnership generators (Invoice has its own bespoke modal).
 */
export const SendDocumentModal = ({
  open, onOpenChange, printNode, entityType, entityId,
  documentLabel, defaultTo, recipientName, companyName,
  defaultSubject, filenameBase, onSent,
}: SendDocumentModalProps) => {
  const [to, setTo] = useState(defaultTo || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(
    `Hi ${recipientName || "there"},\n\nPlease find attached your ${documentLabel.toLowerCase()}. Let us know if you have any questions — happy to help.\n\nWarmly,\n${companyName || "The Team"}`
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(defaultTo || "");
      setSubject(defaultSubject);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSend = async () => {
    if (!to.trim()) return toast.error("Please add a recipient email");
    if (!printNode) return toast.error("Preview not ready — try again in a moment.");
    setSending(true);
    try {
      const filename = `${filenameBase.replace(/\s+/g, "_")}.pdf`;
      const html = `<div style="font-family: Inter, Arial, sans-serif; color:#1C1917; max-width:600px; margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1C1917,#3D1F0A); padding:28px 32px; border-radius:14px 14px 0 0;">
          <h1 style="color:#fff; margin:0; font-size:22px;">${companyName || "RAC"}</h1>
          <p style="color:rgba(255,255,255,.7); margin:6px 0 0; font-size:13px;">${documentLabel} ${entityId}</p>
        </div>
        <div style="background:#fff; padding:32px; border:1px solid #EDECEA; border-top:none; border-radius:0 0 14px 14px;">
          <p style="white-space:pre-line; font-size:14px; line-height:1.6;">${message.replace(/</g, "&lt;")}</p>
        </div>
      </div>`;

      const pdfBlob = await htmlToPdfBlob(printNode, filename);
      const ccList = cc.split(",").map((s) => s.trim()).filter(Boolean);
      await sendDocumentByEmail({
        to: to.trim(),
        cc: ccList,
        subject,
        html,
        filename,
        pdfBlob,
        entityType,
        entityId,
      });
      toast.success(`${documentLabel} sent to ${to}`);
      onSent?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || `Failed to send ${documentLabel.toLowerCase()}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] w-[92vw] p-0 overflow-hidden border-0 shadow-lvl-3 rounded-[20px] [&>button]:hidden">
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          <div className="md:w-[40%] premium-hero-gradient p-8 md:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div aria-hidden className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: "hsl(var(--primary) / 0.18)", filter: "blur(40px)" }} />
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-6">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">Send {documentLabel}</h2>
              <p className="text-sm text-white/60">
                Dispatch <span className="text-primary font-semibold">{entityId}</span> with the PDF attached.
              </p>
            </div>
            <p className="relative text-[11px] text-white/40 flex items-start gap-2 mt-8">
              <Sparkles className="h-3.5 w-3.5 text-gold mt-0.5 shrink-0" />
              <span><b className="text-white/70">Tip:</b> The PDF is generated from your live preview and attached automatically.</span>
            </p>
          </div>

          <div className="md:w-[60%] flex flex-col bg-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-base font-bold">Compose Email</h3>
              <button onClick={() => onOpenChange(false)} className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">To</Label>
                <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@company.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">CC (optional)</Label>
                <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="finance@company.com" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Message</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="resize-none leading-relaxed" />
              </div>
            </div>
            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">PDF auto-attached · sent securely</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
                <Button onClick={handleSend} disabled={sending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lvl-2 min-w-[160px]">
                  {sending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>) : (<><Send className="h-4 w-4 mr-2" /> Send {documentLabel}</>)}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};