<!-- AnnotationsButton.vue -->
<template>
  <div class="annotations-button-container">
    <!-- Count button when no selection -->
    <button 
      v-if="count > 0 && !hasSelection" 
      class="annotations-count-btn" 
      :class="{ 'is-open': isOpen }"
      @click="$emit('toggle')"
      :title="countButtonTitle"
    >
      <span class="count-indicator">{{ count }}</span>
    </button>
    
    <button
      v-if="hasSelection"
      class="create-annotation-btn"
      @click="$emit('createFromSelection')"
      :title="'Double-tap text to select, then click here to annotate'"
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        class="pencil-icon"
      >
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        <path d="m15 5 4 4"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  count: {
    type: Number,
    default: 0
  },
  hasSelection: {
    type: Boolean,
    default: false
  },
});

defineEmits(['toggle', 'createFromSelection']);

watch(() => props.hasSelection, (newValue, oldValue) => {
  console.log('AnnotationsButton hasSelection changed:', { newValue, oldValue });
}, { immediate: true });

const countButtonTitle = computed(() => {
  return props.isOpen ? `Close annotations (${props.count})` : `Open annotations (${props.count})`;
});
</script>

<style scoped>
.annotations-button-container {
  position: fixed;
  right: 60px;
  top: 6px;
  z-index: 40;
}

.annotations-count-btn {
  width: 32px;
  height: 32px;
  color: var(--accent-color);
  border: none;
  border-bottom: 1px solid var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  background: transparent;
  font-weight: 600;
}

.annotations-count-btn:hover {
  transform: translateY(-2px);
}

.create-annotation-btn {
  width: 24px;
  height: 24px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease-in-out;
}

.pencil-icon {
  transition: transform 0.2s ease;
}

.create-annotation-btn:hover .pencil-icon {
  transform: rotate(-20deg);
}

.count-indicator {
  font-weight: 600;
  font-size: 14px;
}

</style>