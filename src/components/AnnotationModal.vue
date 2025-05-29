<!-- src/components/AnnotationModal.vue -->
<template>
  <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
    <div class="annotation-modal" @click.stop>
      <h3>{{ isEditing ? t("settings.update") : t("settings.add") }} {{t("reader.annotation")}}</h3>
      <div class="selected-text">
        <strong>{{ t("reader.selectedText") }}</strong>
        <p>"{{ selectedText }}"</p>
      </div>
      <form @submit.prevent="saveAnnotation">
        <div class="form-group">
          <label for="annotation-name">{{ t("reader.nameAnnotation") }}</label>
          <input
            id="annotation-name"
            v-model="name"
            type="text"
            :placeholder="t('reader.namePlaceholderAnnotation')"
            class="annotation-input"
            ref="nameInput"
          />
          <small class="form-hint">{{ t("reader.namelessAnnotation") }}</small>
        </div>
        <div class="form-group">
          <label for="annotation-note">{{ t("reader.noteAnnotation") }}</label>
          <textarea
            id="annotation-note"
            v-model="note"
            :placeholder="t('reader.notePlaceholderAnnotation')"
            class="annotation-textarea"
            rows="3"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="cancel-btn">
            {{ name.trim() ? t("settings.cancel") : t("settings.discard") }}
          </button>
          <button 
            type="submit" 
            class="save-btn"
            :disabled="!name.trim()"
          >
            {{ isEditing ? t("settings.update") : t("settings.save") }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue';
import { useI18n } from '../i18n/usei18n';

const { t } = useI18n();

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  selectedText: {
    type: String,
    default: ''
  },
  initialName: {
    type: String,
    default: ''
  },
  initialNote: {
    type: String,
    default: ''
  },
  isEditing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'save']);

const name = ref(props.initialName);
const note = ref(props.initialNote);
const nameInput = ref<HTMLInputElement | null>(null);

// Watch for prop changes to update internal state
watch(() => props.initialName, (newVal) => {
  name.value = newVal;
});

watch(() => props.initialNote, (newVal) => {
  note.value = newVal;
});

// Focus the name input when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      nameInput.value?.focus();
    });
  }
});

const saveAnnotation = () => {
  if (!name.value.trim()) return;
  
  emit('save', {
    name: name.value.trim(),
    note: note.value.trim()
  });
  
  // Reset form
  name.value = '';
  note.value = '';
};
</script>

<style>
.form-hint {
  font-size: 0.75rem;
  color: var(--text-color);
  opacity: 0.7;
  margin-top: 0.25rem;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-btn:disabled:hover {
  background: var(--accent-color);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.annotation-modal {
  background-color: var(--background-color);
  border-radius: 8px;
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.annotation-modal h3 {
  margin-top: 0;
  color: var(--text-color);
}

.selected-text {
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 0.9rem;
}

.selected-text p {
  margin: 0.5rem 0 0;
  font-style: italic;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-color);
}

.annotation-input, .annotation-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--divider-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: 0.9rem;
}

.annotation-input:focus, .annotation-textarea:focus {
  border-color: var(--accent-color);
  outline: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}

.cancel-btn, .save-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.cancel-btn {
  background-color: transparent;
  color: var(--text-color);
  border: 1px solid var(--divider-color);
}

.save-btn {
  background-color: var(--accent-color);
  color: white;
}
</style>