import * as React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendDocumentByEmail } from "@/lib/send-document";

interface SendDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printNode: HTMLElement | null;
  entityType: "invoice" | "waybill" | "partnership" | "document";
  entityId: string;
  documentLabel: string;
  defaultTo?: string;
  recipientName?: string;
  companyName?: string;
  defaultSubject?: string;
  filenameBase?: string;
}

async function nodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * pageW) / canvas.width;
  let position = 0;
  let remaining = imgH;
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
  remaining -= pageH;
  while (remaining > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    remaining -= pageH;
  }
  return pdf.output("blob");
}

export function SendDocumentModal({
  open,
  onOpenChange,
  printNode,
  entityType,
  entityId,
  documentLabel,
  defaultTo = "",
  recipientName = "",
  companyName = "REDtech Africa",
  defaultSubject,
  filenameBase = "Document",
}: SendDocumentModalProps) {
  const [to, setTo] = React.useState(defaultTo);
  const [subject, setSubject] = React.useState(defaultSubject || `${documentLabel} ${entityId}`);
  const [message, setMessage] = React.useState(
    `Hi${recipientName ? " " + recipientName.split(" ")[0] : ""},\n\nPlease find attached ${documentLabel} ${entityId}.\n\nKind regards,\n${companyName}`,
  );
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTo(defaultTo);
      setSubject(defaultSubject || `${documentLabel} ${entityId}`);
    }
  }, [open, defaultTo, defaultSubject, documentLabel, entityId]);

  const handleSend = async () => {
    if (!to.trim()) { toast.error("Recipient email is required"); return; }
    if (!printNode) { toast.error("Document not ready yet"); return; }
    setSending(true);
    try {
      const filename = `${filenameBase}.pdf`;
      const pdfBlob = await nodeToPdfBlob(printNode);
      await sendDocumentByEmail({
        to,
        subject,
        html: `<div style="font-family:system-ui,sans-serif;line-height:1.55;white-space:pre-wrap">${message.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`,
        filename,
        pdfBlob,
        entityType,
        entityId,
      });
      toast.success(`${documentLabel} sent to ${to}`);
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send {documentLabel}
          </DialogTitle>
          <DialogDescription>
            We'll generate a PDF and email it to your recipient as an attachment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>To</Label>
            <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
