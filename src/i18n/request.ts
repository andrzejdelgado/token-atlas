import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? defaultLocale) as Locale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
