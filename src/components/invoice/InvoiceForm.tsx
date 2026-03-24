import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceData, LineItem, defaultCompanyInfo } from "@/types/invoice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CreditCard, ListChecks, Palette, User, Building2, Plus, Trash2 } from "lucide-react";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface InvoiceFormProps {
  invoiceData: InvoiceData;
  setInvoiceData: React.Dispatch<React.SetStateAction<InvoiceData>>;
}

export const InvoiceForm = ({ invoiceData, setInvoiceData }: InvoiceFormProps) => {
  const updateField = <K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
  };

  const updatePaymentDetails = (field: keyof InvoiceData['paymentDetails'], value: string) => {
    setInvoiceData(prev => ({
      ...prev,
      paymentDetails: { ...prev.paymentDetails, [field]: value }
    }));
  };

  // Live CRM client lookup from Supabase
  const { data: crmClients } = useQuery({
    queryKey: ["crm-clients-lookup"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("clients").select("id, name, company, address, city, postcode, email, status").order("name");
      if (error) throw error;
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSmartClientSelect = (clientId: string) => {
    const client = (crmClients || []).find((c: any) => c.id === clientId);
    if (!client) return;
    setInvoiceData(prev => ({
      ...prev,
      clientName: client.name || "",
      clientCompany: client.company || "",
      clientAddress: client.address || "",
      clientCity: client.city || "",
      clientPostcode: client.postcode || "",
      clientEmail: client.email || "",
    }));
    toast.success(`${client.company || client.name} auto-filled from CRM! ✅`);
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      description: "",
      details: "",
      quantity: 1,
      amount: 0,
    };
    updateField('lineItems', [...invoiceData.lineItems, newItem]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    updateField('lineItems', invoiceData.lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (id: string) => {
    updateField('lineItems', invoiceData.lineItems.filter(item => item.id !== id));
  };

  const addOptionalService = () => {
    const newItem: LineItem = {
      id: `opt-${Date.now()}`,
      description: "",
      details: "",
      quantity: 1,
      amount: 0,
    };
    updateField('optionalServices', [...(invoiceData.optionalServices || []), newItem]);
  };

  const updateOptionalService = (id: string, field: keyof LineItem, value: string | number) => {
    updateField('optionalServices', (invoiceData.optionalServices || []).map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeOptionalService = (id: string) => {
    updateField('optionalServices', (invoiceData.optionalServices || []).filter(item => item.id !== id));
  };

  const addPackageInclusion = () => {
    updateField('packageInclusions', [...(invoiceData.packageInclusions || []), ""]);
  };

  const updatePackageInclusion = (index: number, value: string) => {
    const updated = [...(invoiceData.packageInclusions || [])];
    updated[index] = value;
    updateField('packageInclusions', updated);
  };

  const removePackageInclusion = (index: number) => {
    updateField('packageInclusions', (invoiceData.packageInclusions || []).filter((_, i) => i !== index));
  };

  const addNote = () => {
    updateField('notes', [...(invoiceData.notes || []), ""]);
  };

  const updateNote = (index: number, value: string) => {
    const updated = [...(invoiceData.notes || [])];
    updated[index] = value;
    updateField('notes', updated);
  };

  const removeNote = (index: number) => {
    updateField('notes', (invoiceData.notes || []).filter((_, i) => i !== index));
  };

  const addPaymentArrangement = () => {
    updateField('paymentArrangement', [...(invoiceData.paymentArrangement || []), ""]);
  };

  const updatePaymentArrangement = (index: number, value: string) => {
    const updated = [...(invoiceData.paymentArrangement || [])];
    updated[index] = value;
    updateField('paymentArrangement', updated);
  };

  const removePaymentArrangement = (index: number) => {
    updateField('paymentArrangement', (invoiceData.paymentArrangement || []).filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 p-6 overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* Company Branding */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Company Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={invoiceData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="REDtech Africa Consulting"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={invoiceData.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="h-10 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={invoiceData.accentColor}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  placeholder="#bc7e57"
                  className="flex-1"
                />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['#bc7e57', '#1a1a2e', '#16213e', '#0f3460', '#e94560', '#533483', '#2b9348', '#d4a373', '#264653', '#2a9d8f', '#e76f51', '#606c38'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateField('accentColor', c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${invoiceData.accentColor === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
          <LogoUpload
            logo={invoiceData.companyLogo}
            onLogoChange={(logo) => updateField('companyLogo', logo)}
            onLogoRemove={() => updateField('companyLogo', undefined as any)}
          />
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Address</Label>
            <Input
              id="companyAddress"
              value={invoiceData.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                value={invoiceData.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Email</Label>
              <Input
                id="companyEmail"
                value={invoiceData.companyEmail}
                onChange={(e) => updateField('companyEmail', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice #</Label>
              <Input
                id="invoiceNumber"
                value={invoiceData.invoiceNumber}
                onChange={(e) => updateField('invoiceNumber', e.target.value)}
                placeholder="INV-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Date</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceData.invoiceDate}
                onChange={(e) => updateField('invoiceDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={invoiceData.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Symbol</Label>
              <Select value={invoiceData.currency} onValueChange={(val) => updateField('currency', val)}>
                <SelectTrigger id="currency" className="bg-background">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="₦">🇳🇬 Naira (₦)</SelectItem>
                  <SelectItem value="$">🇺🇸 USD ($)</SelectItem>
                  <SelectItem value="£">🇬🇧 GBP (£)</SelectItem>
                  <SelectItem value="€">🇪🇺 EUR (€)</SelectItem>
                  <SelectItem value="₵">🇬🇭 Cedis (₵)</SelectItem>
                  <SelectItem value="C$">🇨🇦 CAD (C$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatEnabled">VAT</Label>
              <div className="flex items-center h-10">
                <input
                  id="vatEnabled"
                  type="checkbox"
                  checked={invoiceData.vatEnabled}
                  onChange={(e) => updateField('vatEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="vatEnabled" className="ml-2 text-sm">Enable VAT</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={invoiceData.vatRate}
                onChange={(e) => updateField('vatRate', parseFloat(e.target.value) || 0)}
                disabled={!invoiceData.vatEnabled}
                placeholder="7.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Info */}
      <Card>
        <CardHeader className="pb-4 border-b border-border/50 mb-4 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-invoice-accent" />
            Client Details (Bill To)
          </CardTitle>
          <div className="mt-4">
             <Label className="text-muted-foreground flex items-center gap-2 mb-2 text-xs uppercase tracking-wider font-bold">Smart Client Lookup (CRM)</Label>
             <Select onValueChange={(val) => handleSmartClientSelect(val)}>
               <SelectTrigger className="w-full bg-background border-invoice-accent/30 focus:ring-invoice-accent/20 transition-all">
                 <SelectValue placeholder="Select a known client to auto-fill details instantly..." />
               </SelectTrigger>
               <SelectContent>
                 {(crmClients || []).length === 0 ? (
                   <SelectItem value="__loading" disabled>No CRM clients yet…</SelectItem>
                 ) : (crmClients || []).map((c: any) => (
                   <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                     {c.company || c.name}{c.company && c.name !== c.company ? ` — ${c.name}` : ""}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={invoiceData.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientCompany">Company (Optional)</Label>
              <Input
                id="clientCompany"
                value={invoiceData.clientCompany || ""}
                onChange={(e) => updateField('clientCompany', e.target.value)}
                placeholder="Company Ltd"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Address</Label>
            <Input
              id="clientAddress"
              value={invoiceData.clientAddress}
              onChange={(e) => updateField('clientAddress', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientCity">City</Label>
              <Input
                id="clientCity"
                value={invoiceData.clientCity || ""}
                onChange={(e) => updateField('clientCity', e.target.value)}
                placeholder="Lagos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPostcode">Postcode</Label>
              <Input
                id="clientPostcode"
                value={invoiceData.clientPostcode || ""}
                onChange={(e) => updateField('clientPostcode', e.target.value)}
                placeholder="100001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <Input
              id="clientEmail"
              type="email"
              value={invoiceData.clientEmail || ""}
              onChange={(e) => updateField('clientEmail', e.target.value)}
              placeholder="client@email.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              Line Items
            </span>
            <Button size="sm" onClick={addLineItem} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoiceData.lineItems.map((item, index) => (
            <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLineItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  placeholder="Service description"
                />
              </div>
              <div className="space-y-2">
                <Label>Details (Optional)</Label>
                <Textarea
                  value={item.details || ""}
                  onChange={(e) => updateLineItem(item.id, 'details', e.target.value)}
                  placeholder="Additional details about this item..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount ({invoiceData.currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
          {invoiceData.lineItems.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No items added yet. Click "Add Item" to start.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Optional Services */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5" />
              Optional Services (Phase 2)
            </span>
            <Button size="sm" onClick={addOptionalService} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Service
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(invoiceData.optionalServices || []).map((item, index) => (
            <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-muted-foreground">Service {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOptionalService(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Service Name</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateOptionalService(item.id, 'description', e.target.value)}
                  placeholder="Service name"
                />
              </div>
              <div className="space-y-2">
                <Label>Details</Label>
                <Input
                  value={item.details || ""}
                  onChange={(e) => updateOptionalService(item.id, 'details', e.target.value)}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label>Price ({invoiceData.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => updateOptionalService(item.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
          {(invoiceData.optionalServices || []).length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Optional services that can be added to enhance the package.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={invoiceData.paymentDetails.bankName}
                onChange={(e) => updatePaymentDetails('bankName', e.target.value)}
                placeholder="GTBank"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={invoiceData.paymentDetails.accountName}
                onChange={(e) => updatePaymentDetails('accountName', e.target.value)}
                placeholder="REDtech Africa Consulting"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={invoiceData.paymentDetails.accountNumber}
                onChange={(e) => updatePaymentDetails('accountNumber', e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortCode">Sort Code (Optional)</Label>
              <Input
                id="sortCode"
                value={invoiceData.paymentDetails.sortCode || ""}
                onChange={(e) => updatePaymentDetails('sortCode', e.target.value)}
                placeholder="00-00-00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">Payment Reference</Label>
            <Input
              id="reference"
              value={invoiceData.paymentDetails.reference || ""}
              onChange={(e) => updatePaymentDetails('reference', e.target.value)}
              placeholder="INV-001-CLIENT"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Arrangement */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Payment Arrangement</span>
            <Button size="sm" onClick={addPaymentArrangement} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(invoiceData.paymentArrangement || []).map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updatePaymentArrangement(index, e.target.value)}
                placeholder="e.g., Initial payment of 50% due within 7 days"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePaymentArrangement(index)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">Notes</span>
            <Button size="sm" onClick={addNote} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add Note
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(invoiceData.notes || []).map((note, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={note}
                onChange={(e) => updateNote(index, e.target.value)}
                placeholder="Additional note..."
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeNote(index)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Package Inclusions */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="text-lg">What's Included in Your Package</span>
            <Button size="sm" onClick={addPackageInclusion} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(invoiceData.packageInclusions || []).map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updatePackageInclusion(index, e.target.value)}
                placeholder="e.g., Fully responsive website"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePackageInclusion(index)}
                className="text-destructive hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
