export type CountryCode = "GB" | "KW";

export const REGION_DEFAULTS: Record<
  CountryCode,
  { timezone: string; currency: string; locale: string }
> = {
  GB: { timezone: "Europe/London", currency: "GBP", locale: "en" },
  KW: { timezone: "Asia/Kuwait", currency: "KWD", locale: "ar" },
};

export function getRegionDefaults(country: string) {
  if (country === "KW") return REGION_DEFAULTS.KW;
  return REGION_DEFAULTS.GB;
}
