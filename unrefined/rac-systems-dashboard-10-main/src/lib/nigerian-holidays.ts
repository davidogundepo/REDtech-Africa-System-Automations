/**
 * Nigerian Public Holidays for the current year.
 * This list is updated annually and used across the platform
 * for attendance scoring, leave nudges, and social media reminders.
 */
export const getNigerianHolidays = (year: number) => [
  { name: "New Year's Day", date: `${year}-01-01`, type: "national" },
  { name: "Eid-el-Maulud (Mawlid)", date: `${year}-01-27`, type: "national" },
  { name: "Good Friday", date: getEasterDate(year, -2), type: "national" },
  { name: "Easter Monday", date: getEasterDate(year, 1), type: "national" },
  { name: "Workers' Day", date: `${year}-05-01`, type: "national" },
  { name: "Democracy Day", date: `${year}-06-12`, type: "national" },
  { name: "Eid-el-Fitr (Day 1)", date: getEidElFitr(year, 0), type: "national" },
  { name: "Eid-el-Fitr (Day 2)", date: getEidElFitr(year, 1), type: "national" },
  { name: "Eid-el-Kabir (Day 1)", date: getEidElKabir(year, 0), type: "national" },
  { name: "Eid-el-Kabir (Day 2)", date: getEidElKabir(year, 1), type: "national" },
  { name: "Independence Day", date: `${year}-10-01`, type: "national" },
  { name: "Christmas Day", date: `${year}-12-25`, type: "national" },
  { name: "Boxing Day", date: `${year}-12-26`, type: "national" },
];

/**
 * Calculate Easter date using the Anonymous Gregorian algorithm
 */
function getEasterDate(year: number, offset: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easter = new Date(year, month - 1, day + offset);
  return easter.toISOString().split("T")[0];
}

/**
 * Approximate Eid-el-Fitr dates (Islamic calendar varies yearly).
 * These are reasonable estimates for 2024-2028 range.
 */
function getEidElFitr(year: number, dayOffset: number): string {
  const estimates: Record<number, string> = {
    2024: "2024-04-10",
    2025: "2025-03-31",
    2026: "2026-03-20",
    2027: "2027-03-10",
    2028: "2028-02-27",
  };
  const base = estimates[year] || `${year}-04-01`;
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

/**
 * Approximate Eid-el-Kabir dates
 */
function getEidElKabir(year: number, dayOffset: number): string {
  const estimates: Record<number, string> = {
    2024: "2024-06-17",
    2025: "2025-06-07",
    2026: "2026-05-27",
    2027: "2027-05-16",
    2028: "2028-05-05",
  };
  const base = estimates[year] || `${year}-06-10`;
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  return d.toISOString().split("T")[0];
}

/**
 * Check if a given date string is a Nigerian holiday
 */
export const isNigerianHoliday = (dateStr: string): boolean => {
  const year = new Date(dateStr).getFullYear();
  return getNigerianHolidays(year).some(h => h.date === dateStr);
};

/**
 * Get upcoming holidays from today's date
 */
export const getUpcomingHolidays = (limit = 5): Array<{ name: string; date: string; type: string; daysUntil: number }> => {
  const now = new Date();
  const year = now.getFullYear();
  const holidays = [...getNigerianHolidays(year), ...getNigerianHolidays(year + 1)];
  
  return holidays
    .map(h => {
      const hDate = new Date(h.date);
      const diff = Math.ceil((hDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { ...h, daysUntil: diff };
    })
    .filter(h => h.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit);
};
