// src/composables/useStyles.ts
import { ref, watch, nextTick } from 'vue';
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
  
  // Track if hooks are registered to avoid duplicate registration
  let hooksRegistered = false;
  
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
  
  // Import stylesheets from document to iframe
  const importDocumentStylesheets = (doc: Document) => {
    // Skip if already imported
    if (doc.querySelector('[data-imported-stylesheets]')) return;
    
    // Create marker to avoid duplicates
    const markerStyle = doc.createElement('style');
    markerStyle.setAttribute('data-imported-stylesheets', 'true');
    markerStyle.textContent = '/* Stylesheets imported */';
    doc.head.appendChild(markerStyle);
    
    const mainStylesheets = Array.from(document.styleSheets);

    // Check each stylesheet for font-face rules and copy them
    let fontFaceCss = '';
    mainStylesheets.forEach(stylesheet => {
      try {
        // Access rules safely (might throw error for cross-origin sheets)
        const rules = stylesheet.cssRules || stylesheet.rules;
        if (!rules) return;
        
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          if (rule.constructor.name === 'CSSFontFaceRule') {
            fontFaceCss += rule.cssText + '\n';
          }
        }
      } catch (e) {} // Silently ignore cross-origin stylesheet errors
    });
    
    if (fontFaceCss) {
      const fontStyle = doc.createElement('style');
      fontStyle.setAttribute('data-custom-styles', 'imported-fonts');
      fontStyle.textContent = fontFaceCss;
      doc.head.appendChild(fontStyle);
    }
  };
  
  // Apply styles to a specific content document
  const applyStylesToContent = (doc: Document) => {
    const head = doc.head || doc.getElementsByTagName('head')[0];
    if (!head) return;
    
    // Remove existing theme styles to avoid duplicates
    const existingStyles = head.querySelectorAll('[data-custom-styles="theme"]');
    existingStyles.forEach(style => style.remove());
    
    importDocumentStylesheets(doc);
    
    // Create and inject theme styles
    const themeStyle = doc.createElement('style');
    themeStyle.setAttribute('data-custom-styles', 'theme');
    themeStyle.textContent = `
      body, html {
        color: ${textColor.value} !important;
        background-color: ${backgroundColor.value} !important;
        font-family: ${fontFamily.value} !important;
        font-size: ${fontSize.value} !important;
        transition: all 0.3s ease;
      }
      * {
        color: inherit !important;
        font-family: inherit !important;
      }
      p, div, span, h1, h2, h3, h4, h5, h6 {
        color: ${textColor.value} !important;
        font-family: ${fontFamily.value} !important;
      }
    `;
    head.appendChild(themeStyle);
  };
  
  // Apply styles to all currently loaded content
  const applyStylesToAllContent = () => {
    if (!rendition.value) return;
    
    try {
      // Get all iframes (epub.js uses iframes for content)
      const iframes = rendition.value.manager?.container?.querySelectorAll('iframe');
      
      if (iframes) {
        iframes.forEach((iframe: HTMLIFrameElement) => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (doc) {
              applyStylesToContent(doc);
            }
          } catch (error) {
            console.warn('Could not access iframe content:', error);
          }
        });
      }
      
      // Also try to get content through epub.js API
      if (rendition.value.getContents) {
        const contents = rendition.value.getContents();
        contents.forEach((content: any) => {
          if (content.document) {
            applyStylesToContent(content.document);
          }
        });
      }
      
    } catch (error) {
      console.error('Error applying styles to all content:', error);
    }
  };
  
  const registerContentHooks = () => {
    if (!rendition.value || hooksRegistered) return;
    
    try {
      rendition.value.hooks.content.register((contents: any) => {
        if (contents.document) {
          applyStylesToContent(contents.document);
        }
      });
      
      hooksRegistered = true;
    } catch (error) {
      console.error('Error registering content hooks:', error);
    }
  };
  
  const applyStylesToReader = async () => {
    if (!rendition.value) return;
    
    try {
      if (rendition.value.themes) {
        const { themes } = rendition.value;
        
        themes.override('color', textColor.value);
        themes.override('background', backgroundColor.value);
        themes.override('font-family', fontFamily.value);
        
        if (themes.fontSize) {
          themes.fontSize(fontSize.value);
        } else {
          themes.override('font-size', fontSize.value);
        }
      }
      
      await nextTick();
      applyStylesToAllContent();
      registerContentHooks();
      
    } catch (error) {
      console.error('Error applying styles to reader:', error);
    }
  };
  

  // Update status bar meta tags
  const setMeta = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement || document.createElement('meta');
    tag.setAttribute('name', name);
    tag.setAttribute('content', content);
    if (!tag.parentNode) document.head.appendChild(tag);
  };

  // Rendition setup (enhanced)
  const setRendition = async (renditionObj: RenditionTheme): Promise<void> => {
    rendition.value = renditionObj;
    hooksRegistered = false; // Reset hook registration flag
    
    // Wait for rendition to be ready
    if (renditionObj.display) {
      await renditionObj.display();
    }
    
    // Apply styles after display
    await applyStylesToReader();
  };
  
  const toggleStylesModal = () => {
    stylesModalOpen.value = !stylesModalOpen.value;
  };
  
  // Force refresh all styles (useful for debugging or manual refresh)
  const refreshStyles = async () => {
    await nextTick();
    applyStylesToDocument();
    await applyStylesToReader();
  };
  
  // Watch for style changes with debouncing
  let styleUpdateTimeout: NodeJS.Timeout | null = null;
  
  watch(
    [textColor, backgroundColor, accentColor, fontFamily, fontSize],
    async () => {
      // Clear existing timeout
      if (styleUpdateTimeout) {
        clearTimeout(styleUpdateTimeout);
      }
      
      // Debounce style updates to avoid too frequent changes
      styleUpdateTimeout = setTimeout(async () => {
        applyStylesToDocument();
        await applyStylesToReader();
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
      }, 100);
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
    setRendition,
    applyStylesToReader,
    applyStylesToDocument,
    refreshStyles
  };
}