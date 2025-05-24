<!-- StylesModal.vue -->
<template>
  <div class="styles-modal" :class="{ 'open': isOpen }">
    <div class="styles-modal-content">
      <div class="styles-modal-header">
        <div class="modal-title-area">
          <h4 v-if="title">{{ title }}</h4>
        </div>
      </div>

      <div class="styles-modal-body">
        <div class="preset-colors">
          <h4>{{ t('settings.presets') }}</h4>
          <div class="preset-buttons">
            <button 
              v-for="preset in presets" 
              :key="preset.name"
              @click="applyPreset(preset.value)" 
              class="preset-button"
              :style="{
                backgroundColor: preset.bgColor,
                color: preset.textColor,
              }"
            >
              <span>{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <font-selector
          :label="t('settings.fontFamily')"
          :model-value="fontFamilyValue"
          @update:model-value="updateFontFamily"
          :fonts="fontOptions"
        />
        
        <font-size-selector
          :label="t('settings.fontSize')"
          :model-value="fontSizeValue"
          @update:model-value="updateFontSize"
        />
        
        <rgb-color-picker 
          :label="t('settings.textColor')" 
          :model-value="textColorValue"
          @update:model-value="updateTextColor" 
        />
        
        <rgb-color-picker 
          :label="t('settings.backgroundColor')" 
          :model-value="backgroundColorValue"
          @update:model-value="updateBackgroundColor" 
        />
        
        <rgb-color-picker 
          :label="t('settings.accentColor')" 
          :model-value="accentColorValue"
          @update:model-value="updateAccentColor" 
        />

        <LanguageSelector class="lang-selector" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, toRef, computed, watch } from 'vue';
import RgbColorPicker from './RgbColorPicker.vue';
import FontSelector from './FontSelector.vue';
import FontSizeSelector from './FontSizeSelector.vue';
import LanguageSelector from '../components/LanguageSelector.vue';
import { useI18n } from '../i18n/usei18n';
import { type RenditionTheme, type PresetOption, type FontOption } from '../types/styles';

export default defineComponent({
  name: 'StylesModal',
  components: {
    RgbColorPicker,
    FontSelector,
    FontSizeSelector,
    LanguageSelector
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    textColor: {
      type: String,
      default: '#000000'
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    accentColor: {
      type: String,
      default: '#f5a623'
    },
    fontFamily: {
      type: String,
      default: 'Arial, sans-serif'
    },
    fontSize: {
      type: String,
      default: '100%'
    },
    rendition: {
      type: Object as PropType<RenditionTheme | null>,
      default: null
    },
    title: {
      type: String,
      default: ''
    },
    presetsTitle: {
      type: String,
      default: ''
    },
    customPresets: {
      type: Array as PropType<PresetOption[]>,
      default: null
    },
    customFonts: {
      type: Array as PropType<FontOption[]>,
      default: null
    }
  },
  emits: [
    'close', 
    'update:textColor', 
    'update:backgroundColor', 
    'update:accentColor',
    'update:fontFamily',
    'update:fontSize',
    'preset-applied'
  ],
  setup(props, { emit }) {
    const { t } = useI18n();
    
    // Create refs from props for template access
    const textColorValue = toRef(props, 'textColor');
    const backgroundColorValue = toRef(props, 'backgroundColor');
    const accentColorValue = toRef(props, 'accentColor');
    const fontFamilyValue = toRef(props, 'fontFamily');
    const fontSizeValue = toRef(props, 'fontSize');
    
    // Update functions that emit events to parent for v-model binding
    const updateTextColor = (value: string): void => {
      emit('update:textColor', value);
    };
    
    const updateBackgroundColor = (value: string): void => {
      emit('update:backgroundColor', value);
    };
    
    const updateAccentColor = (value: string): void => {
      emit('update:accentColor', value);
    };
    
    const updateFontFamily = (value: string): void => {
      emit('update:fontFamily', value);
    };
    
    const updateFontSize = (value: string): void => {
      emit('update:fontSize', value);
    };
    
    // Default presets if custom presets not provided
    const defaultPresets = [
      { 
        name: t('settings.white'), 
        value: 'light',
        bgColor: '#ffffff',
        textColor: '#000000'
      },
      { 
        name: t('settings.black'), 
        value: 'dark',
        bgColor: '#121212',
        textColor: '#ffffff'
      },
      { 
        name: t('settings.sepia'), 
        value: 'sepia',
        bgColor: '#f4ecd8',
        textColor: '#5b4636'
      }
    ];
    
    // Default font options if none provided
    const defaultFontOptions: FontOption[] = [
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Times New Roman', value: 'Times New Roman, serif' },
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Verdana', value: 'Verdana, sans-serif' },
      { label: 'Courier New', value: 'Courier New, monospace' },
      { label: 'Fast Sans', value: 'Fast Sans, sans-serif' },
      { label: 'Fast Serif', value: 'Fast Serif, serif' },
      { label: 'Fast Mono', value: 'Fast Mono, monospace' },
      { label: 'Fast Dotted', value: 'Fast Dotted, sans-serif' },
    ];
    
    // Use custom presets if provided, else use defaults
    const presets = computed(() => props.customPresets || defaultPresets);
    
    // Use custom fonts if provided, else use defaults
    const fontOptions = computed(() => props.customFonts || defaultFontOptions);
    
    // Function to apply preset color schemes
    const applyPreset = (preset: string): void => {
      let newTextColor: string, newBackgroundColor: string, newAccentColor: string;
      
      switch(preset) {
        case 'light':
          newTextColor = '#000000';
          newBackgroundColor = '#ffffff';
          newAccentColor = '#f5a623';
          break;
        case 'dark':
          newTextColor = '#ffffff';
          newBackgroundColor = '#121212';
          newAccentColor = '#bb86fc';
          break;
        case 'sepia':
          newTextColor = '#5b4636';
          newBackgroundColor = '#f4ecd8';
          newAccentColor = '#d9813b';
          break;
        default:
          // For custom presets, find matching preset by value
          const customPreset = presets.value.find(p => p.value === preset);
          if (customPreset) {
            // This is a simplified example. In real-world usage, you'd need to define
            // specific values for all colors in each custom preset
            newTextColor = customPreset.textColor;
            newBackgroundColor = customPreset.bgColor;
            newAccentColor = props.accentColor; // Keep current accent color as fallback
          } else {
            return; // Unknown preset, do nothing
          }
      }
      
      // Emit updated values
      emit('update:textColor', newTextColor);
      emit('update:backgroundColor', newBackgroundColor);
      emit('update:accentColor', newAccentColor);
      
      // Emit preset-applied event with preset name
      emit('preset-applied', preset);
    };

    // Add event listener to handle escape key
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
      } else {
        document.removeEventListener('keydown', handleKeyDown);
      }
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
          close()
      }
    };
    
    // Close modal
    const close = (): void => {
      emit('close');
    };
    
    return {
      t,
      textColorValue,
      backgroundColorValue,
      accentColorValue,
      fontFamilyValue,
      fontSizeValue,
      updateTextColor,
      updateBackgroundColor,
      updateAccentColor,
      updateFontFamily,
      updateFontSize,
      presets,
      fontOptions,
      applyPreset,
      close
    };
  }
});
</script>
<style scoped>
.styles-modal {
  position: fixed;
  top: 0;
  right: 0;
  transform: translate(256px);
  width: 256px;
  height: 100vh;
  background-color: var(--background-color, #ffffff);
  border-left: 1px solid var(--divider-color);
  z-index: 1000;
  transition: all 0.3s ease-in-out;
  overflow-y: auto;
}
.styles-modal.open {
  transform: translateX(0px);
}
.styles-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: 5px;
}

.modal-title-area {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.styles-modal-header h4 {
  margin: 0;
  color: var(--text-color, #000000);
  font-weight: bold;
  padding: 0 0 0 0.5rem;
}

.close-button {
  background: none;
  border: none;
  color: var(--accent-color);
  cursor: pointer;
  padding: 0.5rem;
}

.styles-modal-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 2rem;
}

.preset-colors {
  margin-bottom: 1rem;
}
.preset-colors h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--text-color, #000000);
}
.preset-buttons {
  display: flex;
  gap: 0.5rem;
}
.preset-button {
  font-family: var(--font-family);
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.2s;
  border: 1px solid var(--divider-color);
}
.preset-button:hover {
  transform: translateY(-2px);
}


</style>