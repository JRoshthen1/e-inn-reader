// src/composables/useStyles.ts
import { ref, watch, nextTick } from 'vue';
import { type StylesOptions } from '../types/styles';
import type Rendition from 'epubjs/types/rendition';

export function useStyles(options: StylesOptions = {}) {
  // Initialize style refs with defaults or provided values
  const textColor = ref(options.initialTextColor || '#000000');
  const backgroundColor = ref(options.initialBackgroundColor || '#ffffff');
  const accentColor = ref(options.initialAccentColor || '#f5a623');
  const fontFamily = ref(options.initialFontFamily || 'Arial, sans-serif');
  const fontSize = ref(options.initialFontSize || '100%');
  const stylesModalOpen = ref(false);
  const rendition = ref<Rendition | null>(null);
  
  // Track if hooks are registered to avoid duplicate registration
  let hooksRegistered = false;
  let renderedEventListener: ((section: any, view: any) => void) | null = null;
  
  // Local storage management
  const loadSavedStyles = () => {
    try {
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
    } catch (error) {
      console.error('Error loading saved styles:', error);
    }
  };
  
  const saveStyles = () => {
    try {
      localStorage.setItem('reader-text-color', textColor.value);
      localStorage.setItem('reader-background-color', backgroundColor.value);
      localStorage.setItem('accent-color', accentColor.value);
      localStorage.setItem('reader-font-family', fontFamily.value);
      localStorage.setItem('reader-font-size', fontSize.value);
    } catch (error) {
      console.error('Error saving styles:', error);
    }
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
      ::selection {
        background-color: ${accentColor.value}4D;
        color: inherit;
      }

      ::-moz-selection {
        background-color: ${accentColor.value}4D;
        color: inherit;
      }
    `;
    head.appendChild(themeStyle);
  };
  
  // Apply styles to all currently loaded content - IMPROVED VERSION
  const applyStylesToAllContent = async () => {
    if (!rendition.value) return;
    
    try {
      // Method 1: Use getContents() API (most reliable)
      const contents = rendition.value.getContents();
      if (contents) {
        // Handle both single Contents object and array of Contents
        const contentsArray = Array.isArray(contents) ? contents : [contents];
        
        await Promise.all(
          contentsArray.map(async (content: any) => {
            if (content && content.document) {
              await nextTick(); // Ensure DOM is ready
              applyStylesToContent(content.document);
            }
          })
        );
      }
      
      // Method 2: Use views() as fallback
      const views = rendition.value.views();
      if (views && Array.isArray(views)) {
        await Promise.all(
          views.map(async (view: any) => {
            try {
              const doc = view.document || view.iframe?.contentDocument;
              if (doc) {
                await nextTick();
                applyStylesToContent(doc);
              }
            } catch (error) {
              console.warn('Could not access view content:', error);
            }
          })
        );
      }
      
    } catch (error) {
      console.error('Error applying styles to all content:', error);
    }
  };
  
  // Setup event listeners for automatic style application
  const setupEventListeners = () => {
    if (!rendition.value || renderedEventListener) return;
    
    try {
      // Create event listener function
      renderedEventListener = async (section: any, view: any) => {
        try {
          if (view && view.document) {
            await nextTick();
            applyStylesToContent(view.document);
          }
        } catch (error) {
          console.warn('Could not apply styles to rendered content:', error);
        }
      };
      
      // Register event listener
      rendition.value.on('rendered', renderedEventListener);
      
      // Also listen for display events
      rendition.value.on('displayed', async (section: any) => {
        await nextTick();
        await applyStylesToAllContent();
      });
      
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  };
  
  // Remove event listeners when cleaning up
  const removeEventListeners = () => {
    if (!rendition.value || !renderedEventListener) return;
    
    try {
      rendition.value.off('rendered', renderedEventListener);
      renderedEventListener = null;
    } catch (error) {
      console.error('Error removing event listeners:', error);
    }
  };
  
  const registerContentHooks = () => {
    if (!rendition.value || hooksRegistered) return;
    
    try {
      rendition.value.hooks.content.register(async (contents: any) => {
        if (contents.document) {
          await nextTick();
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
      const { themes } = rendition.value;
      
      if (themes) {
        // Apply theme overrides
        themes.override('color', textColor.value);
        themes.override('background', backgroundColor.value);
        themes.override('font-family', fontFamily.value);
        
        // Use fontSize method if available, otherwise use override
        if (typeof themes.fontSize === 'function') {
          themes.fontSize(fontSize.value);
        } else {
          themes.override('font-size', fontSize.value);
        }
      }
      
      // Wait for next tick to ensure themes are applied
      await nextTick();
      
      // Apply styles to all current content
      await applyStylesToAllContent();
      
      // Setup hooks and event listeners for future content
      registerContentHooks();
      setupEventListeners();
      
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

  // Rendition setup - IMPROVED VERSION
  const setRendition = async (renditionObj: Rendition): Promise<void> => {
    // Clean up previous rendition
    if (rendition.value) {
      removeEventListeners();
      hooksRegistered = false;
    }
    
    rendition.value = renditionObj;
    hooksRegistered = false; // Reset hook registration flag
    
    try {
      // Wait for rendition to be ready if it has a started promise
      if (renditionObj.started) {
        await renditionObj.started;
      }
      
      // Wait for initial display if display method exists
      if (renditionObj.display) {
        await renditionObj.display();
      }
      
      // Apply styles after everything is ready
      await applyStylesToReader();
      
    } catch (error) {
      console.error('Error setting up rendition:', error);
      // Still try to apply styles even if setup partially failed
      await applyStylesToReader();
    }
  };
  
  const toggleStylesModal = () => {
    stylesModalOpen.value = !stylesModalOpen.value;
  };
  
  // Force refresh all styles (useful for debugging or manual refresh)
  const refreshStyles = async () => {
    try {
      await nextTick();
      applyStylesToDocument();
      await applyStylesToReader();
    } catch (error) {
      console.error('Error refreshing styles:', error);
    }
  };
  
  // Watch for style changes with debouncing - IMPROVED VERSION
  let styleUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
  
  watch(
    [textColor, backgroundColor, accentColor, fontFamily, fontSize],
    async () => {
      // Clear existing timeout
      if (styleUpdateTimeout) {
        clearTimeout(styleUpdateTimeout);
      }
      
      // Debounce style updates to avoid too frequent changes
      styleUpdateTimeout = setTimeout(async () => {
        try {
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
        } catch (error) {
          console.error('Error updating styles:', error);
        }
      }, 150); // Slightly increased debounce time for better performance
    }
  );
  
  // Load saved styles on initialization
  loadSavedStyles();
  
  // Cleanup function
  const cleanup = () => {
    removeEventListeners();
    if (styleUpdateTimeout) {
      clearTimeout(styleUpdateTimeout);
    }
  };
  
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
    refreshStyles,
    cleanup
  };
}