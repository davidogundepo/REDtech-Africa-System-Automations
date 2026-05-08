import { useState, useRef, useMemo } from "react";
import { useReactToPrint } from "react-to-print";
import { MotionPage } from "@/components/shared/MotionPage";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, Download, RotateCcw, Eye, Edit, Plus, Trash2, ChevronDown, ChevronUp, 
  Handshake, Building2, Users, DollarSign, Shield, Scale, FileSignature, Sparkles, Send
} from "lucide-react";
import { toast } from "sonner";
import {
  PartnershipData, CommissionTier, CoveredService, AgreementType,
  defaultPartnershipCompany, AGREEMENT_LABELS,
} from "@/types/partnership";
import { SendDocumentModal } from "@/components/shared/SendDocumentModal";

// ── UTILITIES ──
const today = new Date().toISOString().split("T")[0];
const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const generateAgreementNumber = () => {
  const d = new Date();
  return `RAC-AGR-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 900) + 100)}`;
};

const formatDate = (d: string) => {
  if (!d) return "_______________";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

// ── DEFAULT DATA ──
const createDefaultData = (profile: any): PartnershipData => ({
  ...defaultPartnershipCompany,
  companyRep: profile?.full_name || "",

  partnerName: "",
  partnerCompany: "",
  partnerRole: "",
  partnerAddress: "",
  partnerPhone: "",
  partnerEmail: "",
  partnerRep: "",
  partnerRepTitle: "",

  agreementNumber: generateAgreementNumber(),
  agreementDate: today,
  effectiveDate: today,
  expiryDate: nextYear,
  autoRenew: true,
  agreementType: "referral",

  coveredServices: [
    { id: "1", name: "Enterprise Software Solutions", commissionRate: "10–15%" },
    { id: "2", name: "Cloud Infrastructure Services", commissionRate: "8–12%" },
    { id: "3", name: "Digital Transformation Consulting", commissionRate: "12–18%" },
  ],

  commissionType: "percentage",
  firstReferralRate: "10–15%",
  ongoingReferralRate: "5–10%",
  commissionCapMonths: 12,
  tiers: [],
  paymentFrequency: "monthly",
  paymentMethod: "Bank Transfer",
  minimumPayout: "₦10,000 minimum before payout",

  nonCashRewards: [
    "Priority access to new product launches",
    "Co-branded marketing materials",
  ],

  trackingMethod: "Unique referral code + UTM tracking link provided to the Partner",
  attributionWindow: "30 days from first click or contact",
  reportingSchedule: "Monthly performance report sent by the 5th of each month",

  partnerObligations: [
    "Actively promote covered services to their network using approved materials",
    "Only use REDtech Africa-approved marketing materials and messaging",
    "Promptly notify the Company of any disputes or client concerns",
    "Not engage in any misrepresentation of services or pricing",
  ],
  companyObligations: [
    "Provide the Partner with a unique referral code and tracking link",
    "Deliver approved marketing materials, demos, and sales support",
    "Pay agreed commissions on the defined schedule for verified conversions",
    "Provide monthly performance reports",
  ],

  nonCompete: true,
  nonCompeteDuration: "12 months from the effective termination date",
  nonCompeteScope: "enterprise technology services in Nigeria",
  exclusivity: false,
  exclusivityTerritory: "",

  terminationNoticeDays: 30,
  terminationCauses: [
    "Material breach of this Agreement that remains uncured after 7 days' written notice",
    "Fraudulent referral activity or deliberate misrepresentation",
    "Insolvency, bankruptcy, or cessation of business by either Party",
    "Conduct seriously detrimental to the Company's brand, reputation, or client relationships",
  ],

  governingLaw: "Federal Republic of Nigeria",
  disputeResolution: "The Parties agree to resolve any dispute through good-faith negotiation within 14 days, followed by mediation, and if unresolved, binding arbitration under the Arbitration and Conciliation Act (Cap A18, Laws of the Federation of Nigeria).",

  additionalClauses: [],
  footerNote: "Partnership Agreement — Strictly Confidential",
});

// ── COLLAPSIBLE SECTION ──
function Section({ title, icon: Icon, children, defaultOpen = true }: { 
  title: string; icon?: any; children: React.ReactNode; defaultOpen?: boolean 
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/40 backdrop-blur-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
      >
        <span className="text-sm font-bold text-foreground flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">{children}</div>}
    </div>
  );
}

// ── FIELD ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

// ── LIST FIELD ──
function ListField({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            className="flex-1 h-9 bg-background border-border/50 rounded-lg text-sm"
            value={item}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-500/10 shrink-0"
            onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="text-primary hover:text-[#a66c4a] hover:bg-primary/10 h-8 text-xs font-semibold"
        onClick={() => onChange([...items, ""])}>
        <Plus className="h-3 w-3 mr-1.5" /> Add item
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── PARTNERSHIP FORM ──
// ══════════════════════════════════════════════════════════════
function PartnershipForm({ data, onChange }: { data: PartnershipData; onChange: (d: PartnershipData) => void }) {
  const set = (key: keyof PartnershipData, value: unknown) => onChange({ ...data, [key]: value });

  const addService = () => set("coveredServices", [...data.coveredServices, { id: Date.now().toString(), name: "", commissionRate: "" }]);
  const removeService = (id: string) => set("coveredServices", data.coveredServices.filter(s => s.id !== id));
  const updateService = (id: string, key: keyof CoveredService, value: string) =>
    set("coveredServices", data.coveredServices.map(s => s.id === id ? { ...s, [key]: value } : s));

  const addTier = () => set("tiers", [...data.tiers, { id: Date.now().toString(), label: "", rate: "" }]);
  const removeTier = (id: string) => set("tiers", data.tiers.filter(t => t.id !== id));
  const updateTier = (id: string, key: keyof CommissionTier, value: string) =>
    set("tiers", data.tiers.map(t => t.id === id ? { ...t, [key]: value } : t));

  const inputCls = "h-10 bg-background border-border/50 rounded-xl text-sm";

  return (
    <div className="space-y-3 p-1">
      {/* Agreement Details */}
      <Section title="Agreement Details" icon={FileSignature}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Agreement Number">
            <Input className={inputCls} value={data.agreementNumber} onChange={e => set("agreementNumber", e.target.value)} />
          </Field>
          <Field label="Agreement Type">
            <Select value={data.agreementType} onValueChange={v => set("agreementType", v as AgreementType)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="referral">Referral Partnership</SelectItem>
                <SelectItem value="strategic">Strategic Partnership</SelectItem>
                <SelectItem value="reseller">Reseller Agreement</SelectItem>
                <SelectItem value="distribution">Distribution Agreement</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Agreement Date"><Input type="date" className={inputCls} value={data.agreementDate} onChange={e => set("agreementDate", e.target.value)} /></Field>
          <Field label="Effective Date"><Input type="date" className={inputCls} value={data.effectiveDate} onChange={e => set("effectiveDate", e.target.value)} /></Field>
          <Field label="Expiry Date"><Input type="date" className={inputCls} value={data.expiryDate} onChange={e => set("expiryDate", e.target.value)} /></Field>
          <Field label="Auto-Renew">
            <div className="flex items-center gap-3 mt-1">
              <Switch checked={data.autoRenew} onCheckedChange={v => set("autoRenew", v)} />
              <span className="text-sm text-muted-foreground">Auto-renew annually</span>
            </div>
          </Field>
        </div>
        <Field label="Brand Accent Color">
          <div className="flex gap-3 items-center">
            <input type="color" value={data.accentColor} onChange={e => set("accentColor", e.target.value)}
              className="w-10 h-10 rounded-xl border border-border/50 cursor-pointer p-0.5" />
            <Input className={`${inputCls} w-32`} value={data.accentColor} onChange={e => set("accentColor", e.target.value)} />
          </div>
        </Field>
      </Section>

      {/* Company */}
      <Section title="Your Company (REDtech Africa)" icon={Building2} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name"><Input className={inputCls} value={data.companyName} onChange={e => set("companyName", e.target.value)} /></Field>
          <Field label="Tagline"><Input className={inputCls} value={data.companyTagline || ""} onChange={e => set("companyTagline", e.target.value)} /></Field>
          <Field label="Address"><Input className={inputCls} value={data.companyAddress} onChange={e => set("companyAddress", e.target.value)} /></Field>
          <Field label="Email"><Input className={inputCls} value={data.companyEmail} onChange={e => set("companyEmail", e.target.value)} /></Field>
          <Field label="Phone"><Input className={inputCls} value={data.companyPhone} onChange={e => set("companyPhone", e.target.value)} /></Field>
          <Field label="Signatory Name"><Input className={inputCls} value={data.companyRep} onChange={e => set("companyRep", e.target.value)} /></Field>
          <Field label="Signatory Title"><Input className={inputCls} value={data.companyRepTitle} onChange={e => set("companyRepTitle", e.target.value)} /></Field>
        </div>
      </Section>

      {/* Partner */}
      <Section title="Partner Information" icon={Users}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partner Full Name"><Input className={inputCls} value={data.partnerName} onChange={e => set("partnerName", e.target.value)} placeholder="e.g. Adaeze Okonkwo" /></Field>
          <Field label="Partner Company"><Input className={inputCls} value={data.partnerCompany || ""} onChange={e => set("partnerCompany", e.target.value)} placeholder="e.g. Lagos Tech Club" /></Field>
          <Field label="Partner Role"><Input className={inputCls} value={data.partnerRole || ""} onChange={e => set("partnerRole", e.target.value)} placeholder="e.g. Business Dev Manager" /></Field>
          <Field label="Partner Email"><Input className={inputCls} value={data.partnerEmail || ""} onChange={e => set("partnerEmail", e.target.value)} /></Field>
          <Field label="Partner Phone"><Input className={inputCls} value={data.partnerPhone || ""} onChange={e => set("partnerPhone", e.target.value)} /></Field>
          <Field label="Partner Address"><Input className={inputCls} value={data.partnerAddress || ""} onChange={e => set("partnerAddress", e.target.value)} /></Field>
          <Field label="Signatory (if different)"><Input className={inputCls} value={data.partnerRep || ""} onChange={e => set("partnerRep", e.target.value)} /></Field>
          <Field label="Signatory Title"><Input className={inputCls} value={data.partnerRepTitle || ""} onChange={e => set("partnerRepTitle", e.target.value)} /></Field>
        </div>
      </Section>

      {/* Services */}
      <Section title="Covered Services" icon={Sparkles}>
        <div className="space-y-3">
          {data.coveredServices.map(s => (
            <div key={s.id} className="flex gap-3 items-center">
              <Input className={`${inputCls} flex-1`} value={s.name} placeholder="Service name" onChange={e => updateService(s.id, "name", e.target.value)} />
              <Input className={`${inputCls} w-32`} value={s.commissionRate} placeholder="Rate" onChange={e => updateService(s.id, "commissionRate", e.target.value)} />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 shrink-0" onClick={() => removeService(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-8 text-xs font-semibold" onClick={addService}>
            <Plus className="h-3 w-3 mr-1.5" /> Add Service
          </Button>
        </div>
      </Section>

      {/* Commission */}
      <Section title="Commission Structure" icon={DollarSign}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Commission Type">
            <Select value={data.commissionType} onValueChange={v => set("commissionType", v)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage of Sale</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="tiered">Tiered (Multiple Levels)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="First Referral Rate"><Input className={inputCls} value={data.firstReferralRate} onChange={e => set("firstReferralRate", e.target.value)} /></Field>
          <Field label="Ongoing Rate"><Input className={inputCls} value={data.ongoingReferralRate} onChange={e => set("ongoingReferralRate", e.target.value)} /></Field>
          <Field label="Cap (months)"><Input type="number" className={inputCls} value={data.commissionCapMonths} onChange={e => set("commissionCapMonths", Number(e.target.value))} min={1} max={60} /></Field>
          <Field label="Payment Frequency">
            <Select value={data.paymentFrequency} onValueChange={v => set("paymentFrequency", v as any)}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="on-conversion">On Every Conversion</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Payment Method"><Input className={inputCls} value={data.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} /></Field>
          <Field label="Min Payout Threshold"><Input className={inputCls} value={data.minimumPayout || ""} onChange={e => set("minimumPayout", e.target.value)} /></Field>
        </div>
        {data.commissionType === "tiered" && (
          <div className="mt-4 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance Tiers</Label>
            {data.tiers.map(t => (
              <div key={t.id} className="flex gap-3 items-center">
                <Input className={`${inputCls} flex-1`} value={t.label} placeholder="e.g. 1–3 referrals" onChange={e => updateTier(t.id, "label", e.target.value)} />
                <Input className={`${inputCls} w-32`} value={t.rate} placeholder="e.g. 10%" onChange={e => updateTier(t.id, "rate", e.target.value)} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 shrink-0" onClick={() => removeTier(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 h-8 text-xs font-semibold" onClick={addTier}>
              <Plus className="h-3 w-3 mr-1.5" /> Add Tier
            </Button>
          </div>
        )}
      </Section>

      {/* Rewards */}
      <Section title="Rewards & Perks" icon={Sparkles} defaultOpen={false}>
        <Field label="Non-Cash Rewards">
          <ListField items={data.nonCashRewards} onChange={v => set("nonCashRewards", v)} placeholder="e.g. Event tickets, Airtime credit" />
        </Field>
      </Section>

      {/* Tracking */}
      <Section title="Tracking & Attribution" icon={Eye} defaultOpen={false}>
        <Field label="Tracking Method"><Input className={inputCls} value={data.trackingMethod} onChange={e => set("trackingMethod", e.target.value)} /></Field>
        <Field label="Attribution Window"><Input className={inputCls} value={data.attributionWindow} onChange={e => set("attributionWindow", e.target.value)} /></Field>
        <Field label="Reporting Schedule"><Input className={inputCls} value={data.reportingSchedule} onChange={e => set("reportingSchedule", e.target.value)} /></Field>
      </Section>

      {/* Obligations */}
      <Section title="Obligations" icon={FileText} defaultOpen={false}>
        <Field label="Partner Obligations">
          <ListField items={data.partnerObligations} onChange={v => set("partnerObligations", v)} placeholder="e.g. Actively promote covered services" />
        </Field>
        <Field label="Company Obligations">
          <ListField items={data.companyObligations} onChange={v => set("companyObligations", v)} placeholder="e.g. Provide marketing materials" />
        </Field>
      </Section>

      {/* Restrictions */}
      <Section title="Restrictions" icon={Shield} defaultOpen={false}>
        <Field label="Non-Compete Clause">
          <div className="flex items-center gap-3 mt-1">
            <Switch checked={data.nonCompete} onCheckedChange={v => set("nonCompete", v)} />
            <span className="text-sm text-muted-foreground">Include non-compete clause</span>
          </div>
        </Field>
        {data.nonCompete && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration"><Input className={inputCls} value={data.nonCompeteDuration} onChange={e => set("nonCompeteDuration", e.target.value)} /></Field>
            <Field label="Scope"><Input className={inputCls} value={data.nonCompeteScope} onChange={e => set("nonCompeteScope", e.target.value)} /></Field>
          </div>
        )}
        <Field label="Exclusivity">
          <div className="flex items-center gap-3 mt-1">
            <Switch checked={data.exclusivity} onCheckedChange={v => set("exclusivity", v)} />
            <span className="text-sm text-muted-foreground">Grant exclusive territory rights</span>
          </div>
        </Field>
        {data.exclusivity && (
          <Field label="Territory"><Input className={inputCls} value={data.exclusivityTerritory || ""} onChange={e => set("exclusivityTerritory", e.target.value)} placeholder="e.g. Lagos State" /></Field>
        )}
      </Section>

      {/* Termination */}
      <Section title="Termination" icon={Scale} defaultOpen={false}>
        <Field label="Notice Period (days)">
          <Input type="number" className={`${inputCls} w-32`} value={data.terminationNoticeDays} onChange={e => set("terminationNoticeDays", Number(e.target.value))} min={1} />
        </Field>
        <Field label="Grounds for Immediate Termination">
          <ListField items={data.terminationCauses} onChange={v => set("terminationCauses", v)} placeholder="e.g. Fraudulent referral activity" />
        </Field>
      </Section>

      {/* Legal */}
      <Section title="Governing Law & Disputes" icon={Scale} defaultOpen={false}>
        <Field label="Governing Law"><Input className={inputCls} value={data.governingLaw} onChange={e => set("governingLaw", e.target.value)} /></Field>
        <Field label="Dispute Resolution">
          <textarea className="w-full border border-border/50 rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[72px] resize-y"
            value={data.disputeResolution} onChange={e => set("disputeResolution", e.target.value)} />
        </Field>
      </Section>

      {/* Extra */}
      <Section title="Additional Clauses" icon={FileText} defaultOpen={false}>
        <Field label="Custom Clauses">
          <ListField items={data.additionalClauses} onChange={v => set("additionalClauses", v)} placeholder="e.g. Partner must attend quarterly reviews" />
        </Field>
        <Field label="Footer Note">
          <Input className={inputCls} value={data.footerNote || ""} onChange={e => set("footerNote", e.target.value)} />
        </Field>
      </Section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── PARTNERSHIP PREVIEW (PDF-READY) ──
// ══════════════════════════════════════════════════════════════
import { forwardRef } from "react";

const PartnershipPreview = forwardRef<HTMLDivElement, { data: PartnershipData }>(
  ({ data }, ref) => {
    const accent = data.accentColor || "hsl(var(--primary))";
    const accentBg = `${accent}10`;
    const accentBorder = `${accent}35`;
    const agreementLabel = AGREEMENT_LABELS[data.agreementType] || "Partnership Agreement";

    const body: React.CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "10pt", lineHeight: "1.75", color: "#1a1a1a" };
    const h3Style: React.CSSProperties = { fontFamily: "system-ui, sans-serif", fontSize: "8.5pt", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: accent, marginBottom: "6px", marginTop: "0", display: "flex", alignItems: "center", gap: "8px" };
    const clauseStyle: React.CSSProperties = { marginBottom: "7mm", pageBreakInside: "avoid" as const };
    const sectionBar = <div style={{ width: "4px", height: "16px", background: accent, borderRadius: "2px", display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} />;

    let clauseNum = 0;
    const clause = () => { clauseNum++; return clauseNum; };

    return (
      <div ref={ref} style={{ ...body, width: "210mm", minHeight: "297mm", padding: "0", background: "white" }}>
        {/* Letterhead */}
        <div style={{ background: accent, padding: "12mm 18mm 10mm", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "14pt", fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>{data.companyName}</div>
              {data.companyTagline && <div style={{ fontSize: "7.5pt", opacity: 0.65, fontFamily: "system-ui, sans-serif" }}>{data.companyTagline}</div>}
            </div>
            <div style={{ textAlign: "right", fontFamily: "system-ui, sans-serif" }}>
              <div style={{ fontSize: "7.5pt", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Reference No.</div>
              <div style={{ fontSize: "9.5pt", fontWeight: 700 }}>{data.agreementNumber || "RAC-AGR-000000"}</div>
              <div style={{ fontSize: "7.5pt", opacity: 0.75, marginTop: "4px" }}>Date: {formatDate(data.agreementDate)}</div>
              <div style={{ fontSize: "7.5pt", opacity: 0.75 }}>Effective: {formatDate(data.effectiveDate)}</div>
            </div>
          </div>
          <div style={{ marginTop: "10mm", textAlign: "center" }}>
            <div style={{ fontSize: "17pt", fontWeight: 800, fontFamily: "system-ui, sans-serif", letterSpacing: "-0.01em" }}>{agreementLabel}</div>
            <div style={{ fontSize: "9pt", opacity: 0.8, marginTop: "4px", fontFamily: "system-ui, sans-serif" }}>{data.companyName} &amp; {data.partnerName || "Partner Name"}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "10mm 18mm 12mm" }}>
          {/* Parties */}
          <div style={{ ...clauseStyle, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: "8px", padding: "6mm" }}>
            <h3 style={h3Style}>{sectionBar}Parties to This Agreement</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6mm" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "9.5pt", marginBottom: "4px" }}>THE COMPANY</div>
                <div><strong>{data.companyName}</strong></div>
                {data.companyTagline && <div style={{ fontSize: "9pt" }}>{data.companyTagline}</div>}
                <div style={{ fontSize: "9pt" }}>{data.companyAddress}</div>
                <div style={{ fontSize: "9pt" }}>{data.companyEmail} · {data.companyPhone}</div>
                <div style={{ fontSize: "9pt", marginTop: "4px" }}>Rep: <strong>{data.companyRep}</strong> ({data.companyRepTitle})</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "9.5pt", marginBottom: "4px" }}>THE PARTNER</div>
                <div><strong>{data.partnerName || "Partner Name"}</strong></div>
                {data.partnerCompany && <div>{data.partnerCompany}</div>}
                {data.partnerRole && <div style={{ fontSize: "9pt" }}>{data.partnerRole}</div>}
                {data.partnerAddress && <div style={{ fontSize: "9pt" }}>{data.partnerAddress}</div>}
                {data.partnerEmail && <div style={{ fontSize: "9pt" }}>{data.partnerEmail}{data.partnerPhone ? ` · ${data.partnerPhone}` : ""}</div>}
                {data.partnerRep && <div style={{ fontSize: "9pt", marginTop: "4px" }}>Rep: <strong>{data.partnerRep}</strong>{data.partnerRepTitle ? ` (${data.partnerRepTitle})` : ""}</div>}
              </div>
            </div>
          </div>

          {/* Duration */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}{clause()}. Agreement Duration</h3>
            <p style={{ margin: 0 }}>
              This Agreement commences on <strong>{formatDate(data.effectiveDate)}</strong> and remains in effect until <strong>{formatDate(data.expiryDate)}</strong>, unless terminated earlier.
              {data.autoRenew && " Upon expiry, this Agreement shall automatically renew for successive 12-month periods unless either Party provides written notice of non-renewal at least 30 days prior."}
            </p>
          </div>

          {/* Services */}
          {data.coveredServices.length > 0 && (
            <div style={clauseStyle}>
              <h3 style={h3Style}>{sectionBar}{clause()}. Covered Services</h3>
              <p style={{ margin: "0 0 6px" }}>The following {data.companyName} services are covered:</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: accent, color: "white" }}>
                    <th style={{ padding: "5px 10px", textAlign: "left", fontSize: "8.5pt", fontFamily: "system-ui, sans-serif" }}>Service</th>
                    <th style={{ padding: "5px 10px", textAlign: "right", fontSize: "8.5pt", fontFamily: "system-ui, sans-serif", width: "140px" }}>Commission / Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.coveredServices.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 === 0 ? accentBg : "white" }}>
                      <td style={{ padding: "5px 10px", borderBottom: `1px solid ${accentBorder}` }}>{s.name}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${accentBorder}`, fontWeight: 600 }}>{s.commissionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Commission */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}{clause()}. Commission & Referral Fees</h3>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              <li><strong>First Referral Rate:</strong> {data.firstReferralRate}</li>
              <li><strong>Ongoing Rate:</strong> {data.ongoingReferralRate}</li>
              <li><strong>Commission Duration:</strong> Max {data.commissionCapMonths} months per client</li>
              <li><strong>Payment Method:</strong> {data.paymentMethod}</li>
              <li><strong>Payment Frequency:</strong> {data.paymentFrequency}</li>
              {data.minimumPayout && <li><strong>Minimum Payout:</strong> {data.minimumPayout}</li>}
            </ul>
            {data.tiers.length > 0 && (
              <>
                <p style={{ margin: "6px 0 4px", fontWeight: 600 }}>Performance Tiers:</p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {data.tiers.map(t => <li key={t.id}><strong>{t.label}:</strong> {t.rate}</li>)}
                </ul>
              </>
            )}
          </div>

          {/* Rewards */}
          {data.nonCashRewards.length > 0 && (
            <div style={clauseStyle}>
              <h3 style={h3Style}>{sectionBar}{clause()}. Additional Rewards & Perks</h3>
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {data.nonCashRewards.filter(r => r).map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {/* Tracking */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}{clause()}. Referral Tracking & Attribution</h3>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              <li><strong>Tracking:</strong> {data.trackingMethod}</li>
              <li><strong>Attribution Window:</strong> {data.attributionWindow}</li>
              <li><strong>Reporting:</strong> {data.reportingSchedule}</li>
            </ul>
          </div>

          {/* Obligations */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}{clause()}. Obligations</h3>
            {data.partnerObligations.length > 0 && (
              <>
                <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Partner Obligations:</p>
                <ul style={{ margin: "0 0 8px", paddingLeft: "18px" }}>
                  {data.partnerObligations.filter(o => o).map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </>
            )}
            {data.companyObligations.length > 0 && (
              <>
                <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Company Obligations:</p>
                <ul style={{ margin: 0, paddingLeft: "18px" }}>
                  {data.companyObligations.filter(o => o).map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              </>
            )}
          </div>

          {/* Non-Compete */}
          {data.nonCompete && (
            <div style={clauseStyle}>
              <h3 style={h3Style}>{sectionBar}{clause()}. Non-Compete Clause</h3>
              <p style={{ margin: 0 }}>
                During the term and for <strong>{data.nonCompeteDuration}</strong> following termination, the Partner agrees not to promote services substantially similar to <strong>{data.nonCompeteScope}</strong>.
              </p>
            </div>
          )}

          {/* Exclusivity */}
          {data.exclusivity && (
            <div style={clauseStyle}>
              <h3 style={h3Style}>{sectionBar}{clause()}. Exclusivity</h3>
              <p style={{ margin: 0 }}>
                The Company grants exclusive referral rights within: <strong>{data.exclusivityTerritory || "as defined in Schedule A"}</strong>.
              </p>
            </div>
          )}

          {/* Termination */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}{clause()}. Termination</h3>
            <p style={{ margin: "0 0 6px" }}>Either Party may terminate with <strong>{data.terminationNoticeDays} days'</strong> written notice. Immediate termination may occur for:</p>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              {data.terminationCauses.filter(c => c).map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>

          {/* Additional */}
          {data.additionalClauses.length > 0 && (
            <div style={clauseStyle}>
              <h3 style={h3Style}>{sectionBar}{clause()}. Additional Terms</h3>
              <ul style={{ margin: 0, paddingLeft: "18px" }}>
                {data.additionalClauses.filter(c => c).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* General Provisions */}
          <div style={clauseStyle}>
            <h3 style={h3Style}>{sectionBar}General Provisions</h3>
            <ul style={{ margin: 0, paddingLeft: "18px" }}>
              <li><strong>Governing Law:</strong> This Agreement is governed by the laws of the <strong>{data.governingLaw}</strong>.</li>
              <li><strong>Dispute Resolution:</strong> {data.disputeResolution}</li>
              <li><strong>Entire Agreement:</strong> This document constitutes the entire agreement and supersedes all prior discussions.</li>
              <li><strong>Amendments:</strong> This Agreement may only be amended in writing and signed by both Parties.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: "10mm", borderTop: `2px solid ${accent}`, paddingTop: "8mm" }}>
            <h3 style={{ ...h3Style, marginBottom: "8mm" }}>{sectionBar}Signatures</h3>
            <p style={{ margin: "0 0 8mm", fontSize: "9pt" }}>By signing below, both Parties agree to the terms and conditions as of the date first written above.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16mm" }}>
              <SigBlock label="For the Company" name={data.companyRep || data.companyName} title={data.companyRepTitle} company={data.companyName} accent={accent} />
              <SigBlock label="For the Partner" name={data.partnerRep || data.partnerName || "Partner Representative"} title={data.partnerRepTitle} company={data.partnerCompany} accent={accent} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#f5f5f5", borderTop: `3px solid ${accent}`, padding: "4mm 18mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "7.5pt", color: "#666", fontFamily: "system-ui, sans-serif" }}>{data.agreementNumber} · {data.companyEmail}</div>
          <div style={{ fontSize: "7.5pt", color: "#999", fontFamily: "system-ui, sans-serif" }}>{data.footerNote || `${agreementLabel} — Confidential`}</div>
        </div>
      </div>
    );
  }
);
PartnershipPreview.displayName = "PartnershipPreview";

function SigBlock({ label, name, title, company, accent }: { label: string; name: string; title?: string; company?: string; accent: string }) {
  return (
    <div>
      <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: accent, marginBottom: "14mm", fontFamily: "system-ui, sans-serif" }}>{label}</div>
      <div style={{ borderBottom: "1px solid #333", marginBottom: "4px", height: "1px" }} />
      <div style={{ fontSize: "8.5pt", fontWeight: 700 }}>{name}</div>
      {title && <div style={{ fontSize: "8pt", color: "#555" }}>{title}</div>}
      {company && <div style={{ fontSize: "8pt", color: "#555" }}>{company}</div>}
      <div style={{ marginTop: "8px", fontSize: "8pt", color: "#888" }}>Date: _______________</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── MAIN PAGE ──
// ══════════════════════════════════════════════════════════════
export default function PartnershipGenerator() {
  const { profile } = useAuth();
  const [data, setData] = useState<PartnershipData>(() => createDefaultData(profile));
  const [activeView, setActiveView] = useState<"form" | "preview">("form");
  const [exporting, setExporting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Partnership-Agreement-${data.partnerName || "Partner"}-${data.agreementNumber}`,
    onAfterPrint: () => {
      setExporting(false);
      // Render real PDF, upload to Storage, save to Document Repository,
      // and tally bytes against this user's storage quota.
      const filename = `Partnership-${data.partnerName || "Partner"}-${data.agreementNumber}.pdf`;
      (async () => {
        const uploaded = await import("@/lib/upload-pdf").then(m =>
          m.renderAndUploadPdf(printRef.current, filename, profile?.id)
        );
        const url = uploaded?.url || `#partnership-${data.agreementNumber}`;
        const sizeBytes = uploaded?.bytes || 120_000;
        const sizeLabel = sizeBytes > 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(1)}MB`
          : `${Math.max(1, Math.round(sizeBytes / 1024))}KB`;

        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await (supabase as any).from("documents").insert({
          name: filename,
          type: "pdf",
          size: sizeLabel,
          url,
          department: "Partnerships",
          created_by: profile?.full_name || "System",
          description: `Partnership agreement — ${data.partnerCompany || data.partnerName}`,
        });
        if (error) console.error("Failed to save partnership to documents:", error);

        import("@/lib/activity").then(({ activity }) =>
          activity.generated(
            "partnership",
            data.agreementNumber || crypto.randomUUID(),
            `Partnership agreement with ${data.partnerCompany || data.partnerName}`,
            sizeBytes,
          )
        );
      })();
    },
  });

  const validateBeforeExport = (): string | null => {
    if (!data.partnerName?.trim()) return "Partner representative name is required";
    if (!data.partnerCompany?.trim()) return "Partner company is required";
    if (!data.agreementNumber?.trim()) return "Agreement number is required";
    if (!data.effectiveDate) return "Effective date is required";
    if (!data.expiryDate) return "Expiry date is required";
    if (new Date(data.expiryDate) <= new Date(data.effectiveDate)) return "Expiry date must be after effective date";
    if (data.partnerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.partnerEmail)) return "Partner email is not valid";
    if (!data.coveredServices?.length) return "Add at least one covered service";
    return null;
  };

  const handleExport = () => {
    if (exporting) return;
    const err = validateBeforeExport();
    if (err) { toast.error(err); return; }
    setExporting(true);
    try {
      handlePrint();
    } catch (e: any) {
      setExporting(false);
      toast.error(e?.message || "Failed to export PDF");
    }
  };

  const handleReset = () => {
    if (exporting) return;
    if (confirm("Reset all fields to defaults?")) {
      setData(createDefaultData(profile));
      toast.success("All fields reset to defaults");
    }
  };

  return (
    <MotionPage className="flex-1 w-full flex flex-col min-h-screen bg-background p-4 md:p-8 overflow-y-auto">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Legal Document Generator</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Partnership <span className="text-primary">Agreement</span></h1>
          <p className="text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Generate professional partnership agreements with live preview and PDF export. Fill in the form, preview the document, and download.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleReset} className="border-border/50 h-10 px-4 rounded-2xl font-bold text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-4 w-4 mr-2" /> Reset
          </Button>
          <div className="flex border border-border/50 rounded-xl overflow-hidden shadow-sm lg:hidden">
            <button onClick={() => setActiveView("form")}
              className={`h-10 px-4 text-xs font-bold tracking-wide transition-all ${activeView === "form" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted/60"}`}>
              <Edit className="h-3.5 w-3.5 inline mr-1.5" />Edit
            </button>
            <button onClick={() => setActiveView("preview")}
              className={`h-10 px-4 text-xs font-bold tracking-wide transition-all ${activeView === "preview" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted/60"}`}>
              <Eye className="h-3.5 w-3.5 inline mr-1.5" />Preview
            </button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const err = validateBeforeExport();
              if (err) { toast.error(err); return; }
              setSendOpen(true);
            }}
            disabled={exporting}
            className="border-border/50 h-10 px-4 rounded-2xl font-bold"
          >
            <Send className="h-4 w-4 mr-2" /> Send to Partner
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="bg-primary hover:bg-[#a66c4a] h-10 px-5 rounded-2xl font-bold shadow-lg disabled:opacity-60">
            <Download className="h-4 w-4 mr-2" /> {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="grid lg:grid-cols-2 gap-6 flex-1">
        {/* Form Panel */}
        <div className={`${activeView === "preview" ? "hidden lg:block" : "block"}`}>
          <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden rounded-2xl">
            <CardContent className="p-4 max-h-[calc(100vh-240px)] overflow-y-auto">
              <PartnershipForm data={data} onChange={setData} />
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className={`${activeView === "form" ? "hidden lg:block" : "block"}`}>
          <div className="sticky top-0">
            <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2 mb-3 uppercase tracking-wider">
              <Eye className="h-4 w-4 text-primary" /> Live Preview
            </h2>
            <div className="bg-muted/30 p-3 rounded-2xl border border-border/50 overflow-auto max-h-[calc(100vh-240px)] shadow-inner">
              <div className="transform origin-top-left scale-[0.52] xl:scale-[0.62]" style={{ width: "210mm" }}>
                <div className="shadow-2xl bg-white rounded-lg overflow-hidden">
                  <PartnershipPreview ref={printRef} data={data} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SendDocumentModal
        open={sendOpen}
        onOpenChange={setSendOpen}
        printNode={printRef.current}
        entityType="partnership"
        entityId={data.agreementNumber}
        documentLabel="Partnership Agreement"
        defaultTo={data.partnerEmail}
        recipientName={data.partnerName}
        companyName={(data as any).companyName || "REDtech Africa"}
        defaultSubject={`Partnership Agreement ${data.agreementNumber} — ${data.partnerCompany}`}
        filenameBase={`Partnership-${data.agreementNumber}-${data.partnerCompany || "Partner"}`}
      />
    </MotionPage>
  );
}
