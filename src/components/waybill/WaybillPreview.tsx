import { forwardRef } from "react";
import { WaybillData } from "@/types/waybill";
import defaultLogo from "@/assets/company-logo.png";

interface WaybillPreviewProps {
  waybillData: WaybillData;
}

export const WaybillPreview = forwardRef<HTMLDivElement, WaybillPreviewProps>(
  ({ waybillData }, ref) => {
    const deliveryMethodText = waybillData.deliveryMethod === 'Other' 
      ? waybillData.customDeliveryMethod || 'Other'
      : waybillData.deliveryMethod;

    const logoSrc = waybillData.companyLogo || defaultLogo;
    const accent = waybillData.accentColor || 'hsl(var(--primary))';

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
        {/* Header with Logo */}
        <div className="flex items-center gap-3 mb-6">
          <img 
            src={logoSrc} 
            alt={waybillData.companyName}
            className="h-10 w-auto object-contain"
          />
          <span className="font-semibold text-xl text-foreground">
            {waybillData.companyName}
          </span>
        </div>

        {/* Waybill Number */}
        <div className="mb-6">
          <p className="font-semibold">Waybill No: {waybillData.waybillNumber}</p>
        </div>

        {/* Supplier Info */}
        <div className="mb-6 text-sm space-y-1">
          <p><span className="font-semibold">Supplier:</span> {waybillData.supplierName}</p>
          <p>
            <span className="font-semibold">Email:</span>{' '}
            <a href={`mailto:${waybillData.supplierEmail}`} className="text-blue-600 underline">
              {waybillData.supplierEmail}
            </a>
          </p>
          <p>
            <span className="font-semibold">Mobile:</span> {waybillData.supplierPhone}
            {waybillData.supplierPhone2 && ` | ${waybillData.supplierPhone2}`}
          </p>
        </div>

        {/* Delivery Info */}
        <div className="mb-4 text-sm space-y-1">
          <p><span className="font-semibold">Delivered To:</span> {waybillData.deliveredTo}</p>
          {waybillData.deliveryDepartment && <p>{waybillData.deliveryDepartment}</p>}
          {waybillData.deliveryOrganization && <p>{waybillData.deliveryOrganization}</p>}
          <p>{waybillData.deliveryAddress}</p>
        </div>

        {/* Attention To */}
        {waybillData.attentionTo && (
          <div className="mb-6">
            <div 
              className="inline-block px-4 py-2 text-sm"
              style={{ backgroundColor: 'hsl(var(--muted))' }}
            >
              <span className="font-semibold">Attention:</span> {waybillData.attentionTo}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr style={{ backgroundColor: accent }}>
                <th className="border border-gray-400 p-3 text-left w-16 text-white">S/N</th>
                <th className="border border-gray-400 p-3 text-center text-white">ITEM</th>
                <th className="border border-gray-400 p-3 text-center w-16 text-white">Qty</th>
              </tr>
            </thead>
            <tbody>
              {waybillData.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-400 p-3 text-center">{index + 1}</td>
                  <td className="border border-gray-400 p-3">{item.description}</td>
                  <td className="border border-gray-400 p-3 text-center">{item.quantity}</td>
                </tr>
              ))}
              {waybillData.items.length === 0 && (
                <tr>
                  <td className="border border-gray-400 p-3 text-center">1</td>
                  <td className="border border-gray-400 p-3 text-muted-foreground italic">No items added</td>
                  <td className="border border-gray-400 p-3 text-center">0</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Delivery Method */}
        <div className="mb-6 text-sm">
          <p><span className="font-semibold">Delivery Method:</span> {deliveryMethodText}</p>
        </div>

        {/* Remarks */}
        {waybillData.showRemarks && (
          <div className="mb-8">
            <p className="font-semibold text-sm mb-2">Remarks</p>
            <div className="space-y-3">
              {waybillData.remarks ? (
                <p className="text-sm border-b border-gray-400 pb-2">{waybillData.remarks}</p>
              ) : (
                <>
                  <div className="border-b border-gray-400 h-6"></div>
                  <div className="border-b border-gray-400 h-6"></div>
                  <div className="border-b border-gray-400 h-6"></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Receiver Section */}
        {waybillData.showReceiverSection && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold w-32">Receiver Name</span>
              <div className="flex-1 border-b border-gray-400 h-6"></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold w-32">Receiver Signature</span>
              <div className="flex-1 border-b border-gray-400 h-6"></div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold w-32">Date</span>
              <div className="flex-1 border-b border-gray-400 h-6"></div>
            </div>
          </div>
        )}

        {/* Thank You Message */}
        {waybillData.showThankYouMessage && (
          <div className="text-center mb-6">
            <p className="font-bold text-sm text-foreground">
              {waybillData.thankYouMessage.toUpperCase()}
            </p>
          </div>
        )}

        {/* Footer: Website | Address */}
        <div className="text-center text-sm text-foreground">
          {waybillData.showWebsite && (
            <>
              <span className="lowercase">{waybillData.companyWebsite.toLowerCase()}</span>
              <span className="mx-2">|</span>
            </>
          )}
          <span>{waybillData.companyAddress}</span>
        </div>
      </div>
    );
  }
);

WaybillPreview.displayName = "WaybillPreview";
