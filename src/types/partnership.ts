export type AgreementType = 'referral' | 'strategic' | 'reseller' | 'distribution';
export type CommissionType = 'percentage' | 'fixed' | 'tiered';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'on-conversion' | 'annually';

export interface CommissionTier {
  id: string;
  label: string;
  rate: string;
}

export interface CoveredService {
  id: string;
  name: string;
  commissionRate: string;
}

export interface PartnershipData {
  // Company (REDtech Africa side)
  companyName: string;
  companyTagline?: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyRep: string;
  companyRepTitle: string;
  customLogo?: string;
  accentColor: string;

  // Partner Info
  partnerName: string;
  partnerCompany?: string;
  partnerRole?: string;
  partnerAddress?: string;
  partnerPhone?: string;
  partnerEmail?: string;
  partnerRep?: string;
  partnerRepTitle?: string;

  // Agreement Meta
  agreementNumber: string;
  agreementDate: string;
  effectiveDate: string;
  expiryDate: string;
  autoRenew: boolean;

  // Agreement Type
  agreementType: AgreementType;

  // Services Covered
  coveredServices: CoveredService[];

  // Commission Structure
  commissionType: CommissionType;
  firstReferralRate: string;
  ongoingReferralRate: string;
  commissionCapMonths: number;
  tiers: CommissionTier[];
  paymentFrequency: PaymentFrequency;
  paymentMethod: string;
  minimumPayout?: string;

  // Rewards / Non-Cash
  nonCashRewards: string[];

  // Tracking & Attribution
  trackingMethod: string;
  attributionWindow: string;
  reportingSchedule: string;

  // Restrictions
  nonCompete: boolean;
  nonCompeteDuration: string;
  nonCompeteScope: string;
  exclusivity: boolean;
  exclusivityTerritory?: string;

  // Obligations
  partnerObligations: string[];
  companyObligations: string[];

  // Termination
  terminationNoticeDays: number;
  terminationCauses: string[];

  // Dispute Resolution
  governingLaw: string;
  disputeResolution: string;

  // Additional Clauses
  additionalClauses: string[];

  // Footer
  footerNote?: string;
}

export const defaultPartnershipCompany = {
  companyName: "REDtech Africa",
  companyTagline: "Technology Solutions for Africa",
  companyAddress: "Lagos, Nigeria",
  companyPhone: "+234 000 000 0000",
  companyEmail: "partnerships@redtechafrica.com",
  companyRep: "",
  companyRepTitle: "Managing Director",
  accentColor: "#bc7e57",
};

export const AGREEMENT_LABELS: Record<AgreementType, string> = {
  referral: "Referral Partnership Agreement",
  strategic: "Strategic Partnership Agreement",
  reseller: "Reseller Partnership Agreement",
  distribution: "Distribution Partnership Agreement",
};
