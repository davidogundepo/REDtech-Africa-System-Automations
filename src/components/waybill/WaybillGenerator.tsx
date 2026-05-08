import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { WaybillData, defaultWaybillInfo } from "@/types/waybill";
import { WaybillForm } from "./WaybillForm";
import { WaybillPreview } from "./WaybillPreview";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Eye, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { renderAndUploadPdf } from "@/lib/upload-pdf";

const getInitialWaybillData = (): WaybillData => {
  const today = new Date();
  
  // Format date as DDMMYYYY for waybill number
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  return {
    ...defaultWaybillInfo,
    companyName: defaultWaybillInfo.companyName || "REDtech Africa",
    companyAddress: defaultWaybillInfo.companyAddress || "Trocadero Square, The Rock Drive, Lekki Phase 1",
    companyPhone: defaultWaybillInfo.companyPhone || "0818 428 1100",
    companyEmail: defaultWaybillInfo.companyEmail || "hello@redtechafrica.com",
    companyWebsite: defaultWaybillInfo.companyWebsite || "WWW.REDTECHAFRICA.COM",
    supplierName: defaultWaybillInfo.supplierName || "REDtech Africa Consulting LTD",
    supplierEmail: defaultWaybillInfo.supplierEmail || "hello@redtechafrica.com",
    supplierPhone: defaultWaybillInfo.supplierPhone || "0818 428 1100",
    waybillNumber: `${day}${month}${year}`,
    waybillDate: today.toISOString().split('T')[0],
    deliveredTo: "",
    deliveryAddress: "",
    deliveryMethod: defaultWaybillInfo.deliveryMethod || 'Vehicle',
    items: [
      {
        id: "1",
        description: "",
        quantity: 1,
      }
    ],
    showRemarks: defaultWaybillInfo.showRemarks ?? true,
    showReceiverSection: defaultWaybillInfo.showReceiverSection ?? true,
    showWebsite: defaultWaybillInfo.showWebsite ?? true,
    showThankYouMessage: defaultWaybillInfo.showThankYouMessage ?? true,
    thankYouMessage: defaultWaybillInfo.thankYouMessage || "Thank you for considering services.",
    accentColor: defaultWaybillInfo.accentColor || "hsl(var(--primary))",
  };
};

export const WaybillGenerator = () => {
  const { profile } = useAuth();
  const [waybillData, setWaybillData] = useState<WaybillData>(getInitialWaybillData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${waybillData.deliveredTo || 'Client'}-WB${waybillData.waybillNumber}`,
    onBeforePrint: () => {
      setIsGenerating(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsGenerating(false);
      // Save waybill data to transactions table
      const itemCount = waybillData.items.reduce((sum, item) => sum + item.quantity, 0);
      const description = `Waybill WB${waybillData.waybillNumber} — ${waybillData.deliveredTo} (${itemCount} item${itemCount !== 1 ? 's' : ''}: ${waybillData.items.map(i => i.description).filter(Boolean).join(', ')})`;
      (supabase as any).from("transactions").insert({
        amount: 0,
        type: "expense",
        category: "Waybill / Delivery",
        date: waybillData.waybillDate,
        description: description.slice(0, 500),
        created_by: profile?.id || null,
      }).then(({ error }: any) => {
        if (error) console.error("Failed to save waybill to transactions:", error);
      });

      // ── Upload real PDF to Storage + push to Document Repository ──────
      const pdfFilename = `WB${waybillData.waybillNumber}-${waybillData.deliveredTo}.pdf`;
      renderAndUploadPdf(printRef.current, pdfFilename, profile?.id).then((uploaded) => {
        const docUrl = uploaded?.url || `#waybill-${waybillData.waybillNumber}`;
        const docSize = uploaded ? `${(uploaded.bytes / 1024).toFixed(0)}KB` : "~1KB";
        const realBytes = uploaded?.bytes || 70_000;

        (supabase as any).from("documents").insert({
          name: `WB${waybillData.waybillNumber} — ${waybillData.deliveredTo}.pdf`,
          type: "pdf",
          size: docSize,
          url: docUrl,
          department: "Operations",
          created_by: profile?.full_name || "System",
        }).then(({ error }: any) => {
          if (error) console.error("Failed to auto-save waybill to documents:", error);
        });

        // Audit + storage tally with REAL byte size
        import("@/lib/activity").then(({ activity }) =>
          activity.generated("waybill", waybillData.waybillNumber || crypto.randomUUID(),
            `Waybill to ${waybillData.deliveredTo} (${itemCount} item${itemCount !== 1 ? "s" : ""})`,
            realBytes)
        );
      });

      // ── Smart Recipient Sync ──────────────────────────────────────────────
      // Records the delivery against the recipient in the CRM:
      //   • Upserts them as a client (active)
      //   • Increments their total_deliveries counter
      //   • Updates last_contact_date → Client Directory stays live
      if (waybillData.deliveredTo) {
        const syncRecipient = async () => {
          const now = new Date().toISOString();
          const recipientName = waybillData.deliveredTo;
          const recipientAddress = waybillData.deliveryAddress || null;

          // 1. Find existing client by company name (waybills rarely have email)
          const { data: existing } = await (supabase as any)
            .from("clients")
            .select("id, total_deliveries")
            .ilike("company", recipientName)
            .maybeSingle();

          if (existing) {
            // 2a. Update delivery count + last contact
            await (supabase as any).from("clients").update({
              last_contact_date: now,
              total_deliveries: (existing.total_deliveries || 0) + 1,
              status: "active",
            }).eq("id", existing.id);
          } else {
            // 2b. New recipient — insert as active client
            await (supabase as any).from("clients").insert({
              name: recipientName,
              company: recipientName,
              address: recipientAddress,
              status: "active",
              deal_status: "lead",
              last_contact_date: now,
              total_invoiced: 0,
              total_deliveries: 1,
            });
          }
        };

        syncRecipient().catch(err => console.error("Recipient sync failed:", err));
      }

      toast.success(`Waybill generated & saved! Delivery to ${waybillData.deliveredTo} — ${itemCount} item${itemCount !== 1 ? 's' : ''}`);
    },
    pageStyle: `
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        html, body {
          height: 100%;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-container {
          width: 210mm !important;
          min-height: 297mm !important;
          padding: 15mm 20mm !important;
          margin: 0 !important;
          box-shadow: none !important;
        }
        .page-break-inside-avoid {
          page-break-inside: avoid;
        }
      }
    `,
  });

  const handleGenerateWaybill = () => {
    if (isGenerating) return; // double-submit guard
    const recipient = (waybillData.deliveredTo || "").trim();
    if (!recipient) {
      toast.error("Please enter delivery recipient");
      return;
    }
    if (recipient.length > 200) {
      toast.error("Recipient name is too long (max 200 chars)");
      return;
    }
    if (!waybillData.items?.length || !waybillData.items[0].description?.trim()) {
      toast.error("Please add at least one item with a description");
      return;
    }
    const badItem = waybillData.items.find(
      (it: any) => (it.quantity != null && Number(it.quantity) < 0)
    );
    if (badItem) {
      toast.error("Item quantity cannot be negative");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      try {
        handlePrint();
      } catch (e: any) {
        toast.error(e?.message || "Failed to generate waybill");
        setIsGenerating(false);
      }
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-invoice-accent">Waybill Generator</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="lg:hidden"
              >
                {showPreview ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? "Edit" : "Preview"}
              </Button>
              <Button
                onClick={handleGenerateWaybill}
                disabled={isGenerating}
                className="bg-invoice-accent hover:bg-invoice-accent/90 text-primary-foreground"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Generate & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 flex-1">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className={`${showPreview ? 'hidden lg:block' : 'block'}`}>
            <div className="bg-card rounded-lg border border-border shadow-sm">
              <WaybillForm waybillData={waybillData} setWaybillData={setWaybillData} />
            </div>
          </div>

          {/* Preview */}
          <div className={`${!showPreview ? 'hidden lg:block' : 'block'}`}>
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </h2>
              <div className="bg-muted p-4 rounded-lg overflow-auto max-h-[calc(100vh-180px)]">
                <div className="transform origin-top-left scale-[0.6] md:scale-[0.7] lg:scale-[0.55] xl:scale-[0.65]">
                  <div className="shadow-2xl">
                    <WaybillPreview ref={printRef} waybillData={waybillData} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
