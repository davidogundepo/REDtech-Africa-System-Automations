import { usePlatformSettings } from "./platform-settings";

export type CurrencyCode = "NGN" | "USD" | "GBP" | "EUR" | "ZAR" | "GHS" | "KES";

const SYMBOLS: Record<CurrencyCode, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  ZAR: "R",
  GHS: "₵",
  KES: "KSh",
};

const LOCALES: Record<CurrencyCode, string> = {
  NGN: "en-NG",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  ZAR: "en-ZA",
  GHS: "en-GH",
  KES: "en-KE",
};

export function useCompany() {
  const { get } = usePlatformSettings();
  const name = get<string>("company_name" as any, "REDtech Africa");
  const description = get<string>("company_description" as any, "Africa's premium engineering & consulting collective.");
  const mission = get<string>("company_mission" as any, "");
  const vision = get<string>("company_vision" as any, "");
  const currency = (get<string>("company_currency" as any, "NGN") as CurrencyCode) || "NGN";
  const accent = get<string>("company_accent" as any, "#C9A66B");
  const symbol = SYMBOLS[currency] ?? currency;
  const locale = LOCALES[currency] ?? "en-US";

  const formatMoney = (n: number) => {
    if (n == null || isNaN(n)) return `${symbol}0`;
    return `${symbol}${Math.round(n).toLocaleString(locale)}`;
  };

  return { name, description, mission, vision, currency, accent, symbol, locale, formatMoney };
}
