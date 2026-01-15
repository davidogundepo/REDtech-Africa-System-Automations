import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { WaybillData, defaultWaybillInfo } from "@/types/waybill";
import { WaybillForm } from "./WaybillForm";
import { WaybillPreview } from "./WaybillPreview";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Eye, Edit } from "lucide-react";
import { toast } from "sonner";

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
    companyEmail: defaultWaybillInfo.companyEmail || "olu@redtechafrica.com",
    companyWebsite: defaultWaybillInfo.companyWebsite || "WWW.REDTECHAFRICA.COM",
    supplierName: defaultWaybillInfo.supplierName || "REDtech Africa Consulting LTD",
    supplierEmail: defaultWaybillInfo.supplierEmail || "olu@redtechafrica.com",
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
  };
};

export const WaybillGenerator = () => {
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
      toast.success("Waybill generated successfully!");
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
    if (!waybillData.deliveredTo) {
      toast.error("Please enter delivery recipient");
      return;
    }
    if (waybillData.items.length === 0 || !waybillData.items[0].description) {
      toast.error("Please add at least one item");
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-invoice-accent">REDtech Waybill Generator</h1>
              <p className="text-sm text-muted-foreground">Create professional waybills 📦</p>
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
