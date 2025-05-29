<!-- RgbColorPicker.vue -->
<template>
  <div class="color-picker">
    <label>{{ props.label }}</label>
    <div class="color-input-group">
      <input 
        type="color" 
        :value="props.modelValue"
        @input="(e) => updateHexColor((e.target as HTMLInputElement).value)"
      />
      <input 
        type="text" 
        :value="props.modelValue"
        @input="(e) => updateHexColor((e.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string;
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

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
</style>