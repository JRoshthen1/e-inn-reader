<!-- src/components/AnnotationsPanel.vue -->
<template>
  <div class="annotations-panel" v-show="isVisible">
    <div class="annotations-header">
      <h3>{{ t('reader.annotations') }} ({{ annotations.length }})</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div v-if="annotations.length === 0" class="no-annotations">
      {{ t('reader.emptyAnnotationList')}}
    </div>
    <div v-else class="annotations-list">
      <div 
        v-for="annotation in annotations" 
        :key="annotation.id"
        class="annotation-item"
        @click="$emit('goto', annotation.cfiRange)"
      >
        <div class="annotation-header">
          <h4 class="annotation-name">{{ annotation.name }}</h4>
          <span class="annotation-date">{{ formatDate(annotation.createdAt) }}</span>
        </div>
        <p class="annotation-text">{{ truncateText(annotation.text, 100) }}</p>
        <div class="annotation-actions">
          <button @click.stop="$emit('edit', annotation)" class="edit-btn">{{ t('settings.edit') }}</button>
          <button @click.stop="$emit('delete', annotation.id)" class="delete-btn">{{ t('settings.delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../i18n/usei18n';

const { t } = useI18n();

defineProps({
  annotations: {
    type: Array,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  }
});

defineEmits(['close', 'goto', 'edit', 'delete']);


// Utility functions
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
</script>

<style>
.annotations-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  background: var(--background-color);
  border-left: 1px solid var(--divider-color);
  padding: 1rem;
  overflow-y: auto;
  z-index: 50;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
}

.annotations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.annotations-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-btn:hover {
  opacity: 1;
}

.no-annotations {
  color: var(--text-color);
  opacity: 0.7;
  font-style: italic;
  text-align: center;
  padding: 2rem 1rem;
}

.annotations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annotation-item {
  border: 1px solid var(--divider-color);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--background-color);
}

.annotation-item:hover {
  border-color: var(--accent-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.annotation-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-color);
  flex: 1;
}

.annotation-date {
  font-size: 0.75rem;
  color: var(--text-color);
  opacity: 0.6;
  margin-left: 0.5rem;
}

.annotation-text {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: var(--text-color);
}

.annotation-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.edit-btn, .delete-btn {
  padding: 0.3rem 0.6rem;
  font-size: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-btn {
  background-color: var(--accent-color);
  color: white;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

/* Responsive styles */
@media (max-width: 768px) {
  .annotations-panel {
    position: fixed;
    width: 100%;
    left: 0;
    right: 0;
    top: auto;
    bottom: 0;
    height: 50%;
    z-index: 50;
    border-top: 1px solid var(--divider-color);
    border-left: none;
  }
}
</style>