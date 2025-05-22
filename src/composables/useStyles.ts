// src/composables/useStyles.ts
import { ref, watch } from 'vue';
import { type RenditionTheme, type StylesOptions } from '../types/styles';

export function useStyles(options: StylesOptions = {}) {
  // Initialize style refs with defaults or provided values
  const textColor = ref(options.initialTextColor || '#000000');
  const backgroundColor = ref(options.initialBackgroundColor || '#ffffff');
  const accentColor = ref(options.initialAccentColor || '#f5a623');
  const fontFamily = ref(options.initialFontFamily || 'Arial, sans-serif');
  const fontSize = ref(options.initialFontSize || '100%');
  const stylesModalOpen = ref(false);
  const rendition = ref<RenditionTheme | null>(null);
  
  // Local storage management
  const loadSavedStyles = () => {
    const savedStyles = {
      text: localStorage.getItem('reader-text-color'),
      background: localStorage.getItem('reader-background-color'),
      accent: localStorage.getItem('accent-color'),
      fontFamily: localStorage.getItem('reader-font-family'),
      fontSize: localStorage.getItem('reader-font-size')
    };
    
    if (savedStyles.text) textColor.value = savedStyles.text;
    if (savedStyles.background) backgroundColor.value = savedStyles.background;
    if (savedStyles.accent) accentColor.value = savedStyles.accent;
    if (savedStyles.fontFamily) fontFamily.value = savedStyles.fontFamily;
    if (savedStyles.fontSize) fontSize.value = savedStyles.fontSize;
    
    applyStylesToDocument();
  };
  
  const saveStyles = () => {
    localStorage.setItem('reader-text-color', textColor.value);
    localStorage.setItem('reader-background-color', backgroundColor.value);
    localStorage.setItem('accent-color', accentColor.value);
    localStorage.setItem('reader-font-family', fontFamily.value);
    localStorage.setItem('reader-font-size', fontSize.value);
  };
  
  const applyStylesToDocument = () => {
    const root = document.documentElement;
    root.style.setProperty('--text-color', textColor.value);
    root.style.setProperty('--background-color', backgroundColor.value);
    root.style.setProperty('--accent-color', accentColor.value);
    root.style.setProperty('--font-family', fontFamily.value);
    root.style.setProperty('--font-size', fontSize.value);
    setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMeta('theme-color', backgroundColor.value);
  };
  
  // Reader theme application
  const applyStylesToReader = () => {
    if (!rendition.value?.themes) return;
    
    try {
      const { themes } = rendition.value;
      themes.override('color', textColor.value);
      themes.override('background', backgroundColor.value);
      themes.override('font-family', fontFamily.value);
      
      if (themes.fontSize) {
        themes.fontSize(fontSize.value);
      } else {
        themes.override('font-size', fontSize.value);
      }
    } catch (error) {
      console.error('Error applying styles to reader:', error);
    }
  };
  
  // Preset color schemes
  const applyPreset = (preset: 'light' | 'dark' | 'sepia') => {
    const presets = {
      light: { text: '#000000', bg: '#ffffff', accent: '#f5a623' },
      dark: { text: '#ffffff', bg: '#121212', accent: '#bb86fc' },
      sepia: { text: '#5b4636', bg: '#f4ecd8', accent: '#d9813b' }
    };
    
    const { text, bg, accent } = presets[preset];
    textColor.value = text;
    backgroundColor.value = bg;
    accentColor.value = accent;
  };

  // Update status bar meta tags
  const setMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement || document.createElement('meta');
    tag.setAttribute('name', name);
    tag.setAttribute('content', content);
    if (!tag.parentNode) document.head.appendChild(tag);
  };

  // Rendition setup
  const setRendition = (renditionObj: RenditionTheme): void => {
    rendition.value = renditionObj;
    applyStylesToReader();
  };
  
  const toggleStylesModal = () => {
    stylesModalOpen.value = !stylesModalOpen.value;
  };
  
  // Watch for style changes
  watch(
    [textColor, backgroundColor, accentColor, fontFamily, fontSize],
    () => {
      applyStylesToDocument();
      applyStylesToReader();
      saveStyles();
      
      if (options.onStyleChange) {
        options.onStyleChange(
          textColor.value, 
          backgroundColor.value, 
          accentColor.value, 
          fontFamily.value,
          fontSize.value
        );
      }
    }
  );
  
  loadSavedStyles();
  
  return {
    textColor,
    backgroundColor,
    accentColor,
    fontFamily,
    fontSize,
    stylesModalOpen,
    rendition,
    toggleStylesModal,
    applyPreset,
    setRendition,
    applyStylesToReader,
    applyStylesToDocument
  };
}