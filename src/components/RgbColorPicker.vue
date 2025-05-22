<!-- RgbColorPicker.vue -->
<template>
  <div class="color-picker">
    <label>{{ props.label }}</label>
    <div class="color-input-group">
      <input 
        type="color" 
        :value="props.modelValue"
        @input="updateHexColor($event.target.value)"
      />
      <input 
        type="text" 
        :value="props.modelValue"
        @input="updateHexColor($event.target.value)"
      />
    </div>

    <!-- <div class="color-sliders">
      <label>R</label>
      <input 
        type="range" 
        min="0" 
        max="255" 
        :value="rgbValues.r"
        @input="updateRgbValue('r', $event.target.value)"
      />
      <span>{{ rgbValues.r }}</span>
    </div>
    <div class="color-sliders">
      <label>G</label>
      <input 
        type="range" 
        min="0" 
        max="255" 
        :value="rgbValues.g"
        @input="updateRgbValue('g', $event.target.value)"
      />
      <span>{{ rgbValues.g }}</span>
    </div>
    <div class="color-sliders">
      <label>B</label>
      <input 
        type="range" 
        min="0" 
        max="255" 
        :value="rgbValues.b"
        @input="updateRgbValue('b', $event.target.value)"
      />
      <span>{{ rgbValues.b }}</span>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface RgbValues {
  r: number;
  g: number;
  b: number;
}

const props = defineProps<{
  label: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Function to convert hex to RGB
const hexToRgb = (hex: string): RgbValues => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Function to convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (parseInt(String(r)) << 16) + (parseInt(String(g)) << 8) + parseInt(String(b))).toString(16).slice(1);
};

// Computed RGB values from hex prop
const rgbValues = computed<RgbValues>(() => {
  return hexToRgb(props.modelValue);
});

// Update hex color from input
const updateHexColor = (hexValue: string): void => {
  // Make sure the hex has a # prefix
  if (!hexValue.startsWith('#')) {
    hexValue = '#' + hexValue;
  }
  
  // Validate the hex format
  if (/^#[0-9A-F]{6}$/i.test(hexValue)) {
    emit('update:modelValue', hexValue);
  }
};

// Update color from RGB sliders
const updateRgbValue = (channel: keyof RgbValues, value: string): void => {
  const rgb = { ...rgbValues.value };
  rgb[channel] = parseInt(value);
  const hexValue = rgbToHex(rgb.r, rgb.g, rgb.b);
  emit('update:modelValue', hexValue);
};
</script>

<script lang="ts">
export default {
  name: 'RgbColorPicker'
};
</script>

<style scoped>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.color-picker label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-color, #000000);
}

.color-input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.color-input-group input[type="color"] {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  cursor: pointer;
}

.color-input-group input[type="text"] {
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 0 0.5rem;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
}

.color-sliders {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.color-sliders label {
  width: 20px;
  text-align: center;
  margin: 0;
}

.color-sliders input[type="range"] {
  flex: 1;
  height: 6px;
}

.color-sliders span {
  width: 30px;
  text-align: center;
}
</style>