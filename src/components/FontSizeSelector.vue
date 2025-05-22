<!-- FontSizeSelector.vue -->
<template>
  <div class="font-size-selector">
    <label :for="id">{{ label }}</label>
    <div class="font-size-controls">
      <button 
        @click="decrease" 
        :disabled="currentSize <= minSize"
        class="size-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
        </svg>
      </button>
      
      <input
        type="number"
        v-model.number="currentSize"
        @input="handleInputChange"
        :min="minSize"
        :max="maxSize"
        class="size-input"
      />
      <button 
        @click="increase" 
        :disabled="currentSize >= maxSize"
        class="size-button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';

export default defineComponent({
  name: 'FontSizeSelector',
  props: {
    label: {
      type: String,
      default: 'Font Size'
    },
    id: {
      type: String,
      default: 'font-size-selector'
    },
    modelValue: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const minSize = 10;
    const maxSize = 24;
    const baseSize = 16; // Base font size in points

    // Convert percentage to points
    const percentageToPoints = (percentage: string): number => {
      const percent = parseFloat(percentage);
      return Math.round((percent / 100) * baseSize);
    };

    // Convert points to percentage
    const pointsToPercentage = (points: number): string => {
      return `${Math.round((points / baseSize) * 100)}%`;
    };

    // Current size in points
    const currentSize = ref(percentageToPoints(props.modelValue));

    // Watch for external changes
    watch(() => props.modelValue, (newValue) => {
      currentSize.value = percentageToPoints(newValue);
    });

    const handleInputChange = () => {
      // Ensure value is within bounds
      if (currentSize.value < minSize) currentSize.value = minSize;
      if (currentSize.value > maxSize) currentSize.value = maxSize;
      
      const newPercentage = pointsToPercentage(currentSize.value);
      emit('update:modelValue', newPercentage);
    };

    const increase = () => {
      if (currentSize.value < maxSize) {
        currentSize.value++;
        const newPercentage = pointsToPercentage(currentSize.value);
        emit('update:modelValue', newPercentage);
      }
    };

    const decrease = () => {
      if (currentSize.value > minSize) {
        currentSize.value--;
        const newPercentage = pointsToPercentage(currentSize.value);
        emit('update:modelValue', newPercentage);
      }
    };

    return {
      currentSize,
      minSize,
      maxSize,
      handleInputChange,
      increase,
      decrease
    };
  }
});
</script>

<style scoped>
.font-size-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-size: 0.9rem;
  color: var(--text-color, #000000);
}

.font-size-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}

.size-button {
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  background-color: var(--background-color, #ffffff);
  color: var(--text-color, #000000);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.size-button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.size-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.size-input {
  padding: 0.5rem;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  background-color: var(--background-color, #ffffff);
  color: var(--text-color, #000000);
  text-align: center;
  font-size: 0.9rem;
}

.size-input:focus {
  outline: 2px solid var(--accent-color, #f5a623);
  border-color: transparent;
}

/* Hide number input arrows */
.size-input::-webkit-inner-spin-button,
.size-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.size-input[type=number] {
  -moz-appearance: textfield;
}

</style>