import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency = "GBP",
  locale?: string
) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const intlLocale =
    locale === "ar" ? "ar-KW" : currency === "KWD" ? "ar-KW" : "en-GB";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency,
  }).format(value);
}

export function formatDate(date: Date | string, locale?: string) {
  const intlLocale = locale === "ar" ? "ar-KW" : "en-GB";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string, locale?: string) {
  const intlLocale = locale === "ar" ? "ar-KW" : "en-GB";
  return new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
