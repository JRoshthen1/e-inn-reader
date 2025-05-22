// i18n/useI18n.ts
import { ref, computed, inject, type InjectionKey } from 'vue';
import { type TranslationMessages, type I18nConfig } from '../types/i18n';

export const I18nKey: InjectionKey<ReturnType<typeof createI18n>> = Symbol('i18n');

export function createI18n(config: I18nConfig) {
  const defaultLocale = config.fallbackLocale;
  
  const detectUserLocale = (): string => {
    // 1. Check local storage first
    const storedLocale = localStorage.getItem('user-locale');
    if (storedLocale && config.messages[storedLocale]) {
      return storedLocale;
    }
    // Detect user's preferred locale as browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang && config.messages[browserLang]) {
      return browserLang;
    }
    // 3. Fall back to default
    return defaultLocale;
  };

  const currentLocale = ref(detectUserLocale());
  const messages = ref(config.messages);

  const setLocale = (locale: string) => {
    if (messages.value[locale]) {
      currentLocale.value = locale;
      localStorage.setItem('user-locale', locale);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    
    // Try to find translation in current locale
    let result = findTranslation(keys, currentLocale.value);
    
    // If not found, try fallback locale
    if (!result) {
      result = findTranslation(keys, defaultLocale);
    }
    
    // Return original key if translation not found
    if (!result) return key;
    
    // Process any parameters if needed
    if (params) {
      return result.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return result;
  };
  
  // Helper function to find translation
  const findTranslation = (keys: string[], locale: string): string | null => {
    let current: any = messages.value[locale];
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  };

  const availableLocales = computed(() => Object.keys(messages.value));

  return {
    currentLocale,
    setLocale,
    t,
    availableLocales,
    messages
  };
}

export function useI18n() {
  const i18n = inject(I18nKey);
  if (!i18n) {
    throw new Error('useI18n() must be used inside a component with i18n provided');
  }
  return i18n;
}