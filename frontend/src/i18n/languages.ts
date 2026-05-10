export type SupportedLanguageCode = "en" | "am";

export type SupportedLanguage = {
  code: SupportedLanguageCode;
  label: string;
  nativeLabel: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
  },
  {
    code: "am",
    label: "Amharic",
    nativeLabel: "አማርኛ",
  },
];

export function isSupportedLanguage(value: string | null): value is SupportedLanguageCode {
  return SUPPORTED_LANGUAGES.some((language) => language.code === value);
}

export function getLanguageLabel(code: string) {
  return SUPPORTED_LANGUAGES.find((language) => language.code === code)?.nativeLabel ?? "English";
}
