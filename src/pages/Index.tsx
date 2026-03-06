import { InvoiceGenerator } from "@/components/invoice/InvoiceGenerator";
import { useAuth } from "@/lib/auth-context";
import { ViewerRestricted } from "@/components/ViewerRestricted";

const Index = () => {
  const { isViewer } = useAuth();

  if (isViewer) {
    return (
      <div className="flex-1 min-h-screen bg-background p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: '#bc7e57' }}>Invoice Generator</h1>
          <p className="text-muted-foreground mt-2">Auto-generate recurring invoices with live preview and PDF export</p>
        </div>
        <ViewerRestricted action="create, edit, or download invoices" />
      </div>
    );
  }

  return <InvoiceGenerator />;
};

export default Index;
