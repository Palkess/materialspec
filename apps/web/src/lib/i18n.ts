import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import svCommon from "@materialspec/shared/i18n/sv/common.json";
import svAuth from "@materialspec/shared/i18n/sv/auth.json";
import svSpecs from "@materialspec/shared/i18n/sv/specs.json";
import svErrors from "@materialspec/shared/i18n/sv/errors.json";
import svExport from "@materialspec/shared/i18n/sv/export.json";
import svAdmin from "@materialspec/shared/i18n/sv/admin.json";

import enCommon from "@materialspec/shared/i18n/en/common.json";
import enAuth from "@materialspec/shared/i18n/en/auth.json";
import enSpecs from "@materialspec/shared/i18n/en/specs.json";
import enErrors from "@materialspec/shared/i18n/en/errors.json";
import enExport from "@materialspec/shared/i18n/en/export.json";
import enAdmin from "@materialspec/shared/i18n/en/admin.json";

export function createI18n(lang: "sv" | "en") {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng: lang,
    fallbackLng: "sv",
    defaultNS: "common",
    ns: ["common", "auth", "specs", "errors", "export", "admin"],
    resources: {
      sv: {
        common: svCommon,
        auth: svAuth,
        specs: svSpecs,
        errors: svErrors,
        export: svExport,
        admin: svAdmin,
      },
      en: {
        common: enCommon,
        auth: enAuth,
        specs: enSpecs,
        errors: enErrors,
        export: enExport,
        admin: enAdmin,
      },
    },
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}
