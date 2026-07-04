"use client";

import { createContext, useContext } from "react";
import { t, type TranslationKey } from "@/lib/i18n/translations";

type LocaleContextValue = {
  locale: string;
  currency: string;
  dir: "ltr" | "rtl";
  tr: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  currency: "GBP",
  dir: "ltr",
  tr: (key) => t("en", key),
});

export function LocaleProvider({
  locale = "en",
  currency = "GBP",
  children,
}: {
  locale?: string;
  currency?: string;
  children: React.ReactNode;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return (
    <LocaleContext.Provider
      value={{
        locale,
        currency,
        dir,
        tr: (key) => t(locale, key),
      }}
    >
      <div dir={dir}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
