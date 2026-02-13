import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceData, defaultCompanyInfo } from "@/types/invoice";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePreview } from "./InvoicePreview";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Eye, Edit } from "lucide-react";
import { toast } from "sonner";

const getInitialInvoiceData = (): InvoiceData => {
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 14);

  // Format date as DDMMYYYY for invoice number
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  return {
    ...defaultCompanyInfo,
    companyLogo: "",
    invoiceNumber: `INV-${day}${month}${year}`,
    invoiceDate: today.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],
    clientName: "",
    clientCompany: "",
    clientAddress: "",
    clientCity: "",
    clientPostcode: "",
    clientEmail: "",
    lineItems: [
      {
        id: "1",
        description: "",
        details: "",
        quantity: 1,
        amount: 0,
      }
    ],
    paymentDetails: {
      bankName: "Stanbic IBTC Bank",
      accountName: "REDtech Africa Consulting",
      sortCode: "",
      accountNumber: "0033629255",
      reference: "",
    },
    paymentArrangement: [],
    notes: [],
    optionalServices: [],
    packageInclusions: [],
    accentColor: defaultCompanyInfo.accentColor,
  };
};

export const InvoiceGenerator = () => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialInvoiceData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${invoiceData.clientName || 'Client'}-${invoiceData.invoiceNumber}`,
    onBeforePrint: () => {
      setIsGenerating(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsGenerating(false);
      toast.success("Invoice generated successfully!");
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

  const handleGenerateInvoice = () => {
    if (!invoiceData.clientName) {
      toast.error("Please enter client name");
      return;
    }
    if (invoiceData.lineItems.length === 0 || !invoiceData.lineItems[0].description) {
      toast.error("Please add at least one line item");
      return;
    }
    setIsGenerating(true);
    // Simulate brief delay for UX
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
              <h1 className="text-2xl font-bold text-invoice-accent">REDtech Invoice Generator</h1>
              <p className="text-sm text-muted-foreground">Create professional invoices ✨</p>
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
                onClick={handleGenerateInvoice}
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
                    Happy & Save
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
              <InvoiceForm invoiceData={invoiceData} setInvoiceData={setInvoiceData} />
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
                    <InvoicePreview ref={printRef} invoiceData={invoiceData} />
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
