import { forwardRef } from "react";
import { InvoiceData } from "@/types/invoice";
import defaultLogo from "@/assets/company-logo.png";
import { Check } from "lucide-react";

interface InvoicePreviewProps {
  invoiceData: InvoiceData;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatCurrency = (amount: number, currency: string) => {
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoiceData }, ref) => {
    const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const vatAmount = invoiceData.vatEnabled ? subtotal * (invoiceData.vatRate / 100) : 0;
    const total = subtotal + vatAmount;
    const logoSrc = invoiceData.companyLogo || defaultLogo;
    const accent = invoiceData.accentColor || '#bc7e57';

    return (
      <div 
        ref={ref} 
        className="bg-white print-container"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11pt',
          lineHeight: '1.5',
          color: 'hsl(210 25% 20%)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-2 items-start">
            <img 
              src={logoSrc} 
              alt={invoiceData.companyName}
              className="h-12 w-auto object-contain object-left mb-2"
            />
            <h1 className="text-2xl font-bold" style={{ color: '#000000' }}>
              {invoiceData.companyName}
            </h1>
            <p className="text-sm">Phone: {invoiceData.companyPhone}</p>
            <p className="text-sm">Email: {invoiceData.companyEmail}</p>
            <p className="text-sm">{invoiceData.companyAddress}</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold mb-4" style={{ color: accent }}>INVOICE</h2>
            <div className="space-y-1 text-sm">
              <p><span className="font-semibold">Invoice #:</span> {invoiceData.invoiceNumber}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(invoiceData.invoiceDate)}</p>
              <p><span className="font-semibold">Due Date:</span> {formatDate(invoiceData.dueDate)}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-1 mb-8" style={{ backgroundColor: accent }}></div>

        {/* Bill To */}
        <div className="mb-8">
          <h3 className="font-bold mb-2" style={{ color: accent }}>BILL TO:</h3>
          <p className="font-semibold">{invoiceData.clientName}</p>
          {invoiceData.clientCompany && <p>{invoiceData.clientCompany}</p>}
          <p>{invoiceData.clientAddress}</p>
          {invoiceData.clientCity && <p>{invoiceData.clientCity}</p>}
          {invoiceData.clientPostcode && <p>{invoiceData.clientPostcode}</p>}
          {invoiceData.clientEmail && <p>Email: {invoiceData.clientEmail}</p>}
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: accent, color: '#fff' }}>
                <th className="text-left p-3 font-semibold">DESCRIPTION</th>
                <th className="text-center p-3 font-semibold w-20">QTY</th>
                <th className="text-right p-3 font-semibold w-32">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.lineItems.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? '' : ''} style={index % 2 === 0 ? { backgroundColor: '#f9f9f9' } : {}}>
                  <td className="p-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <p className="font-semibold">{item.description}</p>
                    {item.details && (
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>{item.details}</p>
                    )}
                  </td>
                  <td className="p-3 text-center" style={{ borderBottom: '1px solid #e5e7eb' }}>{item.quantity}</td>
                  <td className="p-3 text-right" style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {formatCurrency(item.amount, invoiceData.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, invoiceData.currency)}</span>
            </div>
            {invoiceData.vatEnabled && (
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <span>VAT ({invoiceData.vatRate}%):</span>
                <span>{formatCurrency(vatAmount, invoiceData.currency)}</span>
              </div>
            )}
            <div className="flex justify-between py-3 font-bold text-lg" style={{ borderBottom: `3px solid ${accent}` }}>
              <span>TOTAL DUE:</span>
              <span>{formatCurrency(total, invoiceData.currency)}</span>
            </div>
          </div>
        </div>

        {/* Optional Services */}
        {invoiceData.optionalServices && invoiceData.optionalServices.length > 0 && (
          <div className="mb-8 page-break-inside-avoid">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6" style={{ backgroundColor: accent }}></div>
              <h3 className="font-bold flex items-center gap-2" style={{ color: accent }}>
                <span className="text-xl">📦</span> Phase 2 - Optional Services Available
              </h3>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
              These services can be added at any time to enhance your digital presence:
            </p>
            <div className="space-y-3">
              {invoiceData.optionalServices.map((service) => (
                <div key={service.id} className="flex justify-between items-start py-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <p className="font-semibold">{service.description}</p>
                    {service.details && (
                      <p className="text-sm" style={{ color: '#6b7280' }}>{service.details}</p>
                    )}
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(service.amount, invoiceData.currency)}
                    {service.description.toLowerCase().includes('month') && '/month'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Arrangement */}
        {invoiceData.paymentArrangement && invoiceData.paymentArrangement.length > 0 && (
          <div className="mb-6 page-break-inside-avoid">
            <h3 className="font-bold mb-2" style={{ color: accent }}>Payment Arrangement:</h3>
            <ul className="list-disc list-inside space-y-1">
              {invoiceData.paymentArrangement.map((item, index) => (
                <li key={index} className="text-sm">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Payment Details */}
        <div className="mb-6 page-break-inside-avoid">
          <h3 className="font-bold mb-2" style={{ color: accent }}>Payment Details:</h3>
          <p className="font-semibold">Bank Transfer ({invoiceData.paymentDetails.bankName})</p>
          <div className="text-sm space-y-1 mt-2">
            <p>Account Name: {invoiceData.paymentDetails.accountName}</p>
            {invoiceData.paymentDetails.sortCode && (
              <p>Sort Code: {invoiceData.paymentDetails.sortCode}</p>
            )}
            <p>Account Number: {invoiceData.paymentDetails.accountNumber}</p>
            {invoiceData.paymentDetails.reference && (
              <p>Reference: {invoiceData.paymentDetails.reference}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoiceData.notes && invoiceData.notes.length > 0 && (
          <div className="mb-6 page-break-inside-avoid">
            <h3 className="font-bold mb-2" style={{ color: accent }}>Notes:</h3>
            <ul className="space-y-1">
              {invoiceData.notes.map((note, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span className="break-words whitespace-pre-wrap">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Package Inclusions */}
        {invoiceData.packageInclusions && invoiceData.packageInclusions.length > 0 && (
          <div className="mb-8 page-break-inside-avoid">
            <h3 className="font-bold mb-3" style={{ color: accent }}>What's Included in Your Package:</h3>
            <div className="grid grid-cols-2 gap-2">
              {invoiceData.packageInclusions.map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: accent }}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="break-words whitespace-pre-wrap">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-8 text-center text-sm" style={{ borderTop: '1px solid #e5e7eb', color: '#6b7280' }}>
          <p>
            Thank you for choosing {invoiceData.companyName}! | Questions? Email {invoiceData.companyEmail}
          </p>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = "InvoicePreview";
