// types/i18n.ts
export interface TranslationMessages {
    [key: string]: string | TranslationMessages;
  }
  
  export interface I18nConfig {
    fallbackLocale: string;
    messages: {
      [locale: string]: TranslationMessages;
    };
  }