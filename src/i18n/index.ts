import { getLanguage } from "obsidian";
import { ar } from "./ar";
import { de } from "./de";
import { en, TranslationKey } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";
import { ja } from "./ja";
import { ko } from "./ko";
import { pt } from "./pt";
import { ru } from "./ru";
import { tr } from "./tr";
import { zh } from "./zh";

const dictionaries: Record<string, Partial<Record<TranslationKey, string>>> = {
  ar,
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  pt,
  ru,
  tr,
  zh
};

function language(): string {
  const current = getLanguage();
  return current.length > 0 ? current.split("-")[0] : "en";
}

export function locale(): string {
  return language();
}

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const dictionary = dictionaries[language()];
  let text = dictionary?.[key] ?? en[key];

  if (vars !== undefined) {
    for (const name of Object.keys(vars)) {
      text = text.split(`{${name}}`).join(String(vars[name]));
    }
  }
  return text;
}
