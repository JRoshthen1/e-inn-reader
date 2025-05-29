<!-- src/components/AnnotationsButton.vue -->
<template>
  <button v-if="count > 0" class="annotations-toggle-btn" @click="$emit('toggle')" :title="isOpen ? 'Close annotations' : 'Open annotations'">
    <span class="annotation-count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  count: {
    type: Number,
    default: 0
  }
});

defineEmits(['toggle']);
</script>

<style>
.annotations-toggle-btn {
  position: fixed;
  right: 60px;
  top: 6px;
  width: 24px;
  height: 24px;
  color: var(--accent-color);
  border: none;
  border-bottom: 1px solid var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 40;
  transition: transform 0.2s;
  font-size: 1rem;
}
.annotations-toggle-btn:active {
  transform: scale(0.95);
}
</style>