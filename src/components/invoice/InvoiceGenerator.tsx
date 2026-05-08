import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { InvoiceData, defaultCompanyInfo } from "@/types/invoice";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePreview } from "./InvoicePreview";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Eye, Edit, ListTree, FolderArchive, Layers, Plus, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceDashboard } from "./InvoiceDashboard";
import { ResponsiveInvoicePreview } from "./ResponsiveInvoicePreview";
import { SendInvoiceModal } from "./SendInvoiceModal";
import { renderAndUploadPdf } from "@/lib/upload-pdf";

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
  const { profile } = useAuth();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(getInitialInvoiceData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
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
      // Save invoice data to transactions table
      const total = invoiceData.lineItems.reduce((sum, item) => sum + item.quantity * item.amount, 0);
      const description = `Invoice ${invoiceData.invoiceNumber} — ${invoiceData.clientCompany || invoiceData.clientName} (${invoiceData.lineItems.map(i => i.description).filter(Boolean).join(", ")})`;
      (supabase as any).from("transactions").insert({
        amount: total,
        type: "income",
        category: "Invoice",
        date: invoiceData.invoiceDate,
        description: description.slice(0, 500),
        created_by: profile?.id || null,
      }).then(({ error }: any) => {
        if (error) console.error("Failed to save invoice to transactions:", error);
      });

      // ── Upload real PDF to Storage + push to Document Repository ──────
      const pdfFilename = `${invoiceData.invoiceNumber}-${invoiceData.clientCompany || invoiceData.clientName}.pdf`;
      renderAndUploadPdf(printRef.current, pdfFilename, profile?.id).then((uploaded) => {
        const docUrl = uploaded?.url || `#invoice-${invoiceData.invoiceNumber}`;
        const docSize = uploaded ? `${(uploaded.bytes / 1024).toFixed(0)}KB` : `${Math.ceil(total / 100000)}KB`;
        const realBytes = uploaded?.bytes || 80_000;

        (supabase as any).from("documents").insert({
          name: `${invoiceData.invoiceNumber} — ${invoiceData.clientCompany || invoiceData.clientName}.pdf`,
          type: "pdf",
          size: docSize,
          url: docUrl,
          department: "Finance",
          created_by: profile?.full_name || "System",
          description: `Invoice — Sent | ${invoiceData.clientCompany || invoiceData.clientName} | ${invoiceData.currency}${total.toLocaleString()}`,
        }).then(({ error }: any) => {
          if (error) console.error("Failed to auto-save invoice to documents:", error);
        });

        // Audit + storage tally with REAL byte size
        import("@/lib/activity").then(({ activity }) =>
          activity.generated("invoice", invoiceData.invoiceNumber || crypto.randomUUID(),
            `Invoice for ${invoiceData.clientCompany || invoiceData.clientName} (${invoiceData.currency || "₦"}${total.toLocaleString()})`,
            realBytes)
        );
      });

      // ── Smart Client Sync ─────────────────────────────────────────────────
      // Saves client to CRM, increments their total_invoiced, updates deal_status
      // → Finance Dashboard & Client Directory stay in sync automatically.
      if (invoiceData.clientName || invoiceData.clientCompany) {
        const syncClient = async () => {
          const clientName = invoiceData.clientName || invoiceData.clientCompany || "";
          const clientCompany = invoiceData.clientCompany || invoiceData.clientName || "";
          const now = new Date().toISOString();

          // 1. Try to find existing client by email or company name
          let existingId: string | null = null;
          if (invoiceData.clientEmail) {
            const { data } = await (supabase as any).from("clients").select("id, total_invoiced").eq("email", invoiceData.clientEmail).maybeSingle();
            if (data) existingId = data.id;
          }
          if (!existingId && clientCompany) {
            const { data } = await (supabase as any).from("clients").select("id, total_invoiced").ilike("company", clientCompany).maybeSingle();
            if (data) existingId = data.id;
          }

          if (existingId) {
            // 2a. Client exists — fetch current total then increment
            const { data: current } = await (supabase as any).from("clients").select("total_invoiced").eq("id", existingId).single();
            const newTotal = (current?.total_invoiced || 0) + total;
            await (supabase as any).from("clients").update({
              name: clientName,
              company: clientCompany,
              email: invoiceData.clientEmail || undefined,
              address: invoiceData.clientAddress || undefined,
              city: invoiceData.clientCity || undefined,
              postcode: invoiceData.clientPostcode || undefined,
              deal_status: "won",
              status: "active",
              last_contact_date: now,
              total_invoiced: newTotal,
            }).eq("id", existingId);
          } else {
            // 2b. New client — insert with invoice total as starting value
            await (supabase as any).from("clients").insert({
              name: clientName,
              company: clientCompany,
              email: invoiceData.clientEmail || null,
              address: invoiceData.clientAddress || null,
              city: invoiceData.clientCity || null,
              postcode: invoiceData.clientPostcode || null,
              deal_status: "won",
              status: "active",
              last_contact_date: now,
              total_invoiced: total,
              total_deliveries: 0,
            });
          }
        };

        syncClient().catch(err => console.error("Client sync failed:", err));
      }

      toast.success(`Invoice generated & saved! ${invoiceData.clientCompany || invoiceData.clientName} — ${invoiceData.currency || "₦"}${total.toLocaleString()}`);
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
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto">
      
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20 shadow-sm backdrop-blur-md bg-card/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-invoice-accent/10 flex items-center justify-center hidden md:flex">
                 <ListTree className="w-5 h-5 text-invoice-accent" />
               </div>
               <div>
                 <h1 className="text-2xl font-black text-invoice-accent tracking-tight">Invoice Generator</h1>
                 <p className="text-xs text-muted-foreground hidden md:block uppercase tracking-widest font-bold">Billing command center</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="lg:hidden"
              >
                {showPreview ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showPreview ? "Edit Options" : "Live Preview"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!invoiceData.clientEmail) {
                    toast.error("Add a client email first");
                    return;
                  }
                  setSendOpen(true);
                }}
                className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary font-semibold"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
              <Button
                onClick={handleGenerateInvoice}
                disabled={isGenerating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lvl-2 hover:shadow-lvl-3 transition-all font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" />
                    Download PDF Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content within Tabs architecture */}
      <div className="container mx-auto px-4 lg:px-6 py-6 flex-1 max-w-7xl">
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="mb-6 flex-wrap h-auto gap-2 border-b border-border bg-transparent w-full justify-start rounded-none">
            <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-invoice-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground font-semibold px-4 pb-3 flex items-center gap-2 transition-all">
              <FolderArchive className="w-4 h-4" /> Global Ledger
            </TabsTrigger>
            <TabsTrigger value="create" className="rounded-none border-b-2 border-transparent data-[state=active]:border-invoice-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground font-semibold px-4 pb-3 flex items-center gap-2 transition-all">
              <Plus className="w-4 h-4" /> Create New Invoice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
             <InvoiceDashboard />
          </TabsContent>

          <TabsContent value="create" className="mt-6 animate-in fade-in duration-500">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Engine */}
              <div className={`${showPreview ? 'hidden lg:block' : 'block'}`}>
                <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-invoice-accent" />
                  <InvoiceForm invoiceData={invoiceData} setInvoiceData={setInvoiceData} />
                </div>
              </div>

              {/* Live Preview Monitor */}
              <div className={`${!showPreview ? 'hidden lg:block' : 'block'}`}>
                <div className="sticky top-[100px]">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2 px-2">
                    <Layers className="h-5 w-5 text-invoice-accent" />
                    Live Print Preview
                  </h2>
                  <ResponsiveInvoicePreview>
                    <InvoicePreview ref={printRef} invoiceData={invoiceData} />
                  </ResponsiveInvoicePreview>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <SendInvoiceModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        invoiceData={invoiceData}
        printNode={printRef.current}
        onSent={() => setInvoiceData((p) => ({ ...p, status: "sent" }))}
      />
    </div>
  );
};
