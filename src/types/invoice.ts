export interface LineItem {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  amount: number;
}

export interface PaymentDetails {
  bankName: string;
  accountName: string;
  sortCode?: string;
  accountNumber: string;
  reference?: string;
}

export interface InvoiceData {
  // Company Info (defaults)
  companyName: string;
  companyTagline?: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo?: string;
  
  // Invoice Meta
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  
  // Client Info
  clientName: string;
  clientCompany?: string;
  clientAddress: string;
  clientCity?: string;
  clientPostcode?: string;
  clientEmail?: string;
  
  // Line Items
  lineItems: LineItem[];
  
  // Payment
  paymentDetails: PaymentDetails;
  paymentArrangement?: string[];
  
  // Notes
  notes?: string[];
  
  // Optional Services
  optionalServices?: LineItem[];
  
  // Package Inclusions
  packageInclusions?: string[];
  
  // Currency
  currency: string;
  
  // VAT
  vatEnabled: boolean;
  vatRate: number; // percentage e.g. 7.5
  
  // Branding
  accentColor: string;
}

export const defaultCompanyInfo = {
  companyName: "REDtech Africa Consulting",
  companyAddress: "Trocadero Square, The Rock Drive, Lekki Phase 1, Lagos",
  companyPhone: "+2347032980038",
  companyEmail: "olu@redtechafrica.com",
  currency: "₦",
  vatEnabled: true,
  vatRate: 7.5, // Nigeria VAT rate
  accentColor: "#bc7e57",
};
