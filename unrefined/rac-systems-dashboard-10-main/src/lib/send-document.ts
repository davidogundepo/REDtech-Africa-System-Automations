import { supabase } from "@/integrations/supabase/client";
import { activity } from "@/lib/activity";

export interface SendDocumentArgs {
  to: string | string[];
  cc?: string[];
  subject: string;
  html?: string;
  filename: string;
  pdfBlob: Blob;
  entityType: string;   // "invoice" | "waybill" | "partnership"
  entityId: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const idx = result.indexOf("base64,");
      resolve(idx >= 0 ? result.slice(idx + 7) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function sendDocumentByEmail(args: SendDocumentArgs) {
  const contentBase64 = await blobToBase64(args.pdfBlob);
  const { data, error } = await (supabase as any).functions.invoke("send-document-email", {
    body: {
      to: args.to,
      cc: args.cc,
      subject: args.subject,
      html: args.html,
      filename: args.filename,
      contentBase64,
      contentType: "application/pdf",
    },
  });
  if (error) throw error;

  // Track in activity log + storage
  const recipient = Array.isArray(args.to) ? args.to.join(", ") : args.to;
  await activity.emailed(args.entityType, args.entityId, recipient);
  await activity.generated(args.entityType, args.entityId, `${args.entityType} ${args.filename} emailed to ${recipient}`, args.pdfBlob.size);

  return data;
}