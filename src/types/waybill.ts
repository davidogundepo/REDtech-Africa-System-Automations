export interface WaybillItem {
  id: string;
  description: string;
  quantity: number;
}

export interface WaybillData {
  // Company Info
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyPhone2?: string;
  companyEmail: string;
  companyWebsite: string;
  
  // Waybill Meta
  waybillNumber: string;
  waybillDate: string;
  
  // Supplier Info
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierPhone2?: string;
  
  // Delivery Info
  deliveredTo: string;
  deliveryDepartment?: string;
  deliveryOrganization?: string;
  deliveryAddress: string;
  attentionTo?: string;
  deliveryMethod: 'Vehicle' | 'Courier' | 'Hand Delivery' | 'Air Freight' | 'Sea Freight' | 'Other';
  customDeliveryMethod?: string;
  
  // Items
  items: WaybillItem[];
  
  // Additional Fields
  remarks?: string;
  receiverName?: string;
  receiverSignatureDate?: string;
  
  // Toggles
  showRemarks: boolean;
  showReceiverSection: boolean;
  showWebsite: boolean;
  showThankYouMessage: boolean;
  thankYouMessage: string;
}

export const defaultWaybillInfo: Partial<WaybillData> = {
  companyName: "REDtech Africa",
  companyAddress: "Trocadero Square, The Rock Drive, Lekki Phase 1",
  companyPhone: "0818 428 1100",
  companyPhone2: "0818 969 6614",
  companyEmail: "olu@redtechafrica.com",
  companyWebsite: "WWW.REDTECHAFRICA.COM",
  supplierName: "REDtech Africa Consulting LTD",
  supplierEmail: "olu@redtechafrica.com",
  supplierPhone: "0818 428 1100",
  supplierPhone2: "0818 969 6614",
  deliveryMethod: 'Vehicle',
  showRemarks: true,
  showReceiverSection: true,
  showWebsite: true,
  showThankYouMessage: true,
  thankYouMessage: "Thank you for considering services.",
};
