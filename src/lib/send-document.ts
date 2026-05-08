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

async function readBooleanPlatformSetting(key: string, fallback: boolean) {
  try {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return typeof data?.value === "boolean" ? data.value : fallback;
  } catch {
    return fallback;
  }
}

async function getCurrentUserRole() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return null;

  const { data } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? null;
}

export async function sendDocumentByEmail(args: SendDocumentArgs) {
  const role = await getCurrentUserRole();
  const allowUserEmails = await readBooleanPlatformSetting("allow_user_emails", true);

  if (!role) {
    throw new Error("You need to be signed in to send documents.");
  }

  if (!allowUserEmails && role !== "admin" && role !== "super_admin") {
    throw new Error("Document email sending is currently restricted to admins.");
  }

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
