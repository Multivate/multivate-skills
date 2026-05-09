import { getRequestConfig } from "next-intl/server";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import { routing, type AppLocale } from "./routing";

const messagesByLocale = {
  en,
  de,
  fr,
  es,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  const safeLocale = locale as AppLocale;

  return {
    locale: safeLocale,
    messages: messagesByLocale[safeLocale],
  };
});
