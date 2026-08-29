import { getLanguage } from "obsidian";
import { en, TranslationKey } from "./en";
import { tr } from "./tr";

const dictionaries: Record<string, Partial<Record<TranslationKey, string>>> = { en, tr };

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
