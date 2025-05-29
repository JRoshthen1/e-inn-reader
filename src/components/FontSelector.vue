<!-- FontSelector.vue -->
<template>
  <div class="font-selector">
    <label :for="id">{{ label }}</label>
    <select 
      :id="id" 
      :value="modelValue" 
      @change="handleChange"
      class="font-select"
    >
      <option 
        v-for="font in fontOptions" 
        :key="font.value" 
        :value="font.value"
        :style="{ fontFamily: font.value }"
      >
        {{ font.label }}
      </option>
    </select>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { type FontOption } from '../types/styles';

export default defineComponent({
  name: 'FontSelector',
  props: {
    label: {
      type: String,
      default: 'Font Family'
    },
    id: {
      type: String,
      default: 'font-selector'
    },
    modelValue: {
      type: String,
      required: true
    },
    fonts: {
      type: Array as PropType<FontOption[]>,
      default: () => []
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const defaultFonts: FontOption[] = [
      // Custom Fast fonts https://github.com/Born2Root/Fast-Font
      { label: 'Fast Sans', value: '"Fast Sans", sans-serif' },
      { label: 'Fast Serif', value: '"Fast Serif", serif' },
      { label: 'Fast Mono', value: '"Fast Mono", monospace' },
      { label: 'Fast Dotted', value: '"Fast Dotted", sans-serif' },
      
      // Standard system fonts
      { label: 'Arial', value: 'Arial, sans-serif' },
      { label: 'Times New Roman', value: 'Times New Roman, serif' },
      { label: 'Georgia', value: 'Georgia, serif' },
      { label: 'Verdana', value: 'Verdana, sans-serif' },
      { label: 'Courier New', value: 'Courier New, monospace' }
    ];

    const fontOptions = props.fonts.length > 0 ? props.fonts : defaultFonts;

    const handleChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      emit('update:modelValue', target.value);
    };

    return {
      fontOptions,
      handleChange
    };
  }
});
</script>

<style scoped>
.font-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
  color: var(--text-color, #000000);
}

.font-select {
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--divider-color);
  background-color: var(--background-color, #ffffff);
  color: var(--text-color, #000000);
  width: 100%;
  cursor: pointer;
}

.font-select:focus {
  outline: 2px solid var(--accent-color, #f5a623);
  border-color: transparent;
}
</style>