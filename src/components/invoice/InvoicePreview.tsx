import { forwardRef } from "react";
import { InvoiceData } from "@/types/invoice";
import defaultLogo from "@/assets/company-logo.png";
import { Check } from "lucide-react";

interface InvoicePreviewProps {
  invoiceData: InvoiceData;
}

// Lighten a hex color toward white by `amount` (0..1) — used for accent washes.
const lighten = (hex: string, amount: number) => {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) + (255 - ((num >> 16) & 255)) * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * amount));
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * amount));
  return `rgb(${r}, ${g}, ${b})`;
};

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
    const accentSoft = lighten(accent, 0.85);
    const accentMid  = lighten(accent, 0.55);
    const isDraft = (invoiceData.status || "draft") === "draft";

    return (
      <div 
        ref={ref} 
        className="bg-white print-container relative"
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
        {/* DRAFT watermark — diagonal, faded, only when status=draft */}
        {isDraft && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <span
              style={{
                transform: 'rotate(-28deg)',
                fontSize: '140pt',
                fontWeight: 800,
                letterSpacing: '12px',
                color: accent,
                opacity: 0.06,
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              DRAFT
            </span>
          </div>
        )}

        {/* Top accent band */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '6mm',
            background: `linear-gradient(90deg, ${accent} 0%, ${accentMid} 100%)`,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
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
            <h2
              className="text-4xl font-extrabold mb-3 tracking-tight"
              style={{ color: accent, letterSpacing: '-0.5px' }}
            >
              INVOICE
            </h2>
            <div
              className="inline-block text-left rounded-lg px-4 py-3"
              style={{ background: accentSoft, border: `1px solid ${accentMid}` }}
            >
              <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold uppercase tracking-wider" style={{ color: accent }}>Invoice #</span>
                <span className="font-mono font-semibold">{invoiceData.invoiceNumber}</span>
                <span className="font-semibold uppercase tracking-wider" style={{ color: accent }}>Issue Date</span>
                <span>{formatDate(invoiceData.invoiceDate)}</span>
                <span className="font-semibold uppercase tracking-wider" style={{ color: accent }}>Due Date</span>
                <span className="font-semibold">{formatDate(invoiceData.dueDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 grid grid-cols-2 gap-6">
          <div className="rounded-lg p-4" style={{ background: '#FAFAF8', borderLeft: `3px solid ${accent}` }}>
            <h3 className="text-[10pt] font-bold mb-2 uppercase tracking-wider" style={{ color: accent }}>Bill To</h3>
            <p className="font-bold text-base">{invoiceData.clientName}</p>
            {invoiceData.clientCompany && <p className="font-medium">{invoiceData.clientCompany}</p>}
            <p className="text-sm" style={{ color: '#57534E' }}>{invoiceData.clientAddress}</p>
            {invoiceData.clientCity && <p className="text-sm" style={{ color: '#57534E' }}>{invoiceData.clientCity}</p>}
            {invoiceData.clientPostcode && <p className="text-sm" style={{ color: '#57534E' }}>{invoiceData.clientPostcode}</p>}
            {invoiceData.clientEmail && <p className="text-sm mt-1" style={{ color: accent }}>{invoiceData.clientEmail}</p>}
          </div>
          <div className="rounded-lg p-4" style={{ background: '#FAFAF8', borderLeft: '3px solid #1C1917' }}>
            <h3 className="text-[10pt] font-bold mb-2 uppercase tracking-wider" style={{ color: '#1C1917' }}>Amount Due</h3>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: accent }}>
              {formatCurrency(total, invoiceData.currency)}
            </p>
            <p className="text-xs mt-1" style={{ color: '#78716C' }}>
              Payable by {formatDate(invoiceData.dueDate)}
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse" style={{ borderRadius: 8, overflow: 'hidden' }}>
            <thead>
              <tr style={{ backgroundColor: accent, color: '#fff' }}>
                <th className="text-left p-3 font-semibold text-[10pt] uppercase tracking-wider">Description</th>
                <th className="text-center p-3 font-semibold w-20 text-[10pt] uppercase tracking-wider">Qty</th>
                <th className="text-right p-3 font-semibold w-32 text-[10pt] uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.lineItems.map((item, index) => (
                <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#FDFDFC' : '#FFFFFF' }}>
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
          <div className="w-80 rounded-lg overflow-hidden" style={{ border: `1px solid ${accentMid}`, background: '#FFFFFF' }}>
            <div className="flex justify-between py-2 px-4" style={{ background: accentSoft }}>
              <span className="text-sm">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrency(subtotal, invoiceData.currency)}</span>
            </div>
            {invoiceData.vatEnabled && (
              <div className="flex justify-between py-2 px-4" style={{ borderTop: `1px solid ${accentMid}` }}>
                <span className="text-sm">VAT ({invoiceData.vatRate}%)</span>
                <span className="text-sm font-medium">{formatCurrency(vatAmount, invoiceData.currency)}</span>
              </div>
            )}
            <div
              className="flex justify-between py-3 px-4 items-baseline"
              style={{ background: accent, color: '#FFFFFF' }}
            >
              <span className="font-bold uppercase tracking-wider text-sm">Total Due</span>
              <span className="font-extrabold text-xl tracking-tight">{formatCurrency(total, invoiceData.currency)}</span>
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
      </div>
    );
  }
);

InvoicePreview.displayName = "InvoicePreview";
