const TZ = "Asia/Bangkok";

export const bkkTime = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso));

export const bkkDateShort = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(new Date(iso));

export const bkkDateFull = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));

// YYYY-MM-DD in Bangkok time
export const bkkYMD = (iso: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
  return parts; // en-CA gives YYYY-MM-DD
};
