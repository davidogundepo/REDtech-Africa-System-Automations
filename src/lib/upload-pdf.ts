import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "generated-docs";

/**
 * Render a DOM node into a multi-page A4 PDF, upload it to the
 * `generated-docs` storage bucket and return the public URL + size.
 *
 * Best-effort — never throws; on any failure returns null so the print
 * flow keeps working.
 */
export interface UploadedPdf {
  url: string;
  bytes: number;
  path: string;
}

export async function renderAndUploadPdf(
  node: HTMLElement | null | undefined,
  filename: string,
  ownerId?: string,
): Promise<UploadedPdf | null> {
  if (!node) return null;
  try {
    // Capture node at 2x for sharpness
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * pageW) / canvas.width;

    // Multi-page support
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

    const blob = pdf.output("blob");
    const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const folder = ownerId || "shared";
    const path = `${folder}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });
    if (error) {
      console.warn("[upload-pdf] storage upload failed:", error.message);
      return null;
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: pub.publicUrl, bytes: blob.size, path };
  } catch (err) {
    console.warn("[upload-pdf] render/upload error:", err);
    return null;
  }
}
