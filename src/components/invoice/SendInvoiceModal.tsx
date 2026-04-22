import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Sparkles, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendNotificationEmail } from "@/lib/email";
import { InvoiceData } from "@/types/invoice";

interface SendInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData;
  onSent?: () => void;
}

const formatCurrency = (amount: number, currency: string) =>
  `${currency}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const SendInvoiceModal = ({ open, onOpenChange, invoiceData, onSent }: SendInvoiceModalProps) => {
  const subtotal = invoiceData.lineItems.reduce((s, i) => s + i.amount * i.quantity, 0);
  const vat = invoiceData.vatEnabled ? subtotal * (invoiceData.vatRate / 100) : 0;
  const total = subtotal + vat;

  const [to, setTo] = useState(invoiceData.clientEmail || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName}`
  );
  const [message, setMessage] = useState(
    `Hi ${invoiceData.clientName || "there"},\n\nPlease find attached your invoice ${invoiceData.invoiceNumber} for ${formatCurrency(total, invoiceData.currency)}, payable by ${invoiceData.dueDate}.\n\nLet us know if you have any questions — happy to help.\n\nWarmly,\n${invoiceData.companyName}`
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(invoiceData.clientEmail || "");
      setSubject(`Invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Please add a recipient email");
      return;
    }
    setSending(true);
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; color:#1C1917; max-width:600px; margin:0 auto;">
        <div style="background:linear-gradient(135deg,#1C1917 0%,#3D1F0A 100%); padding:28px 32px; border-radius:14px 14px 0 0;">
          <h1 style="color:#fff; margin:0; font-size:22px; font-weight:700;">${invoiceData.companyName}</h1>
          <p style="color:rgba(255,255,255,.7); margin:6px 0 0; font-size:13px;">Invoice ${invoiceData.invoiceNumber}</p>
        </div>
        <div style="background:#fff; padding:32px; border:1px solid #EDECEA; border-top:none; border-radius:0 0 14px 14px;">
          <p style="white-space:pre-line; font-size:14px; line-height:1.6; color:#1C1917;">${message.replace(/</g, "&lt;")}</p>
          <div style="background:#FAFAF8; border-left:3px solid ${invoiceData.accentColor}; padding:16px 20px; border-radius:8px; margin:24px 0;">
            <p style="margin:0; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#78716C; font-weight:600;">Amount Due</p>
            <p style="margin:4px 0 0; font-size:28px; font-weight:800; color:${invoiceData.accentColor};">${formatCurrency(total, invoiceData.currency)}</p>
            <p style="margin:4px 0 0; font-size:12px; color:#78716C;">Due by ${invoiceData.dueDate}</p>
          </div>
          <p style="font-size:12px; color:#78716C; margin-top:24px; padding-top:16px; border-top:1px solid #EDECEA;">
            ${invoiceData.companyName} · ${invoiceData.companyEmail} · ${invoiceData.companyPhone}
          </p>
        </div>
      </div>`;

    const recipients = [to.trim(), ...cc.split(",").map((e) => e.trim()).filter(Boolean)];
    const result = await sendNotificationEmail({ to: recipients, subject, html });
    setSending(false);

    if (result) {
      toast.success(`Invoice sent to ${to}`);
      onSent?.();
      onOpenChange(false);
    } else {
      toast.error("Failed to send invoice. Check Resend configuration.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] w-[92vw] p-0 overflow-hidden border-0 shadow-lvl-3 rounded-[20px] [&>button]:hidden">
        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Left dark hero panel */}
          <div className="md:w-[40%] premium-hero-gradient p-8 md:p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div
              aria-hidden
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
              style={{ background: "hsl(var(--primary) / 0.18)", filter: "blur(40px)" }}
            />
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center mb-6">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-2 leading-tight">Send Invoice</h2>
              <p className="text-sm text-white/60 leading-relaxed">
                Dispatch <span className="text-primary font-semibold">{invoiceData.invoiceNumber}</span> directly to your client. The invoice will arrive in their inbox with REDtech branding.
              </p>
            </div>

            <div className="relative space-y-3 mt-8">
              <div className="rounded-lg p-4 bg-white/5 ring-1 ring-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold mb-1">Amount</p>
                <p className="text-xl font-extrabold text-primary">{formatCurrency(total, invoiceData.currency)}</p>
                <p className="text-xs text-white/50 mt-1">Due {invoiceData.dueDate}</p>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-gold mt-0.5 flex-shrink-0" />
                <span><b className="text-white/70">RAC tip:</b> Invoices sent before noon are paid 38% faster.</span>
              </p>
            </div>
          </div>

          {/* Right form panel */}
          <div className="md:w-[60%] flex flex-col bg-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-base font-bold">Compose Email</h3>
              <button
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <Label htmlFor="send-to" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">To</Label>
                <Input
                  id="send-to"
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="client@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-cc" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">CC (optional)</Label>
                <Input
                  id="send-cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="finance@company.com, manager@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-subject" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Subject</Label>
                <Input
                  id="send-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-message" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Message</Label>
                <Textarea
                  id="send-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="resize-none font-[450] leading-relaxed"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Sent via <span className="font-semibold text-foreground">Resend</span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={sending} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lvl-2 min-w-[140px]">
                  {sending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4 mr-2" /> Send Invoice</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};