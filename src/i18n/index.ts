  import { createI18n } from './usei18n';
  import { translations } from './translations';
  
  export const i18n = createI18n({
    fallbackLocale: 'sk',
    messages: translations
  });
  
  