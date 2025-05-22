<template>
  <div class="language-selector">
    <select 
      :value="currentLocale" 
      @change="handleLocaleChange"
      class="locale-select"
    >
      <option 
        v-for="locale in availableLocales" 
        :key="locale" 
        :value="locale"
      >
        {{ getLanguageName(locale) }}
      </option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from '../i18n/usei18n';

export default defineComponent({
  name: 'LanguageSelector',
  
  setup() {
    const { currentLocale, availableLocales, setLocale } = useI18n();
    
    const languageNames: Record<string, string> = {
      en: 'EN',
      cs: 'CZ',
      sk: 'SK',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      ru: 'Русский',
      zh: '中文',
      ja: '日本語',
      ko: '한국어'
    };
    
    const getLanguageName = (locale: string): string => {
      return languageNames[locale] || locale;
    };
    
    const handleLocaleChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      setLocale(target.value);
    };
    
    return {
      currentLocale,
      availableLocales,
      getLanguageName,
      handleLocaleChange
    };
  }
});
</script>

<style scoped>
.language-selector {
  display: inline-block;
}

.locale-select {
  padding: 0.5rem;
  background-color: var(--background-color);
  border: 1px solid var(--accent-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: var(--text-color);
  cursor: pointer;
}

/* Remove dropdown arrow */
select {
  appearance: none;
  /* for Firefox */
  -moz-appearance: none;
  /* for Chrome */
  -webkit-appearance: none;
}
  /* For IE10 */
select::-ms-expand {
  display: none;
}

.locale-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>