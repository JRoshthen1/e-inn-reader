<!-- src/components/BookCard.vue -->
<template>
  <div 
    class="book-card"
  >
    <div class="book-content" @click="$emit('read', book)">
      <div class="book-cover">
        <div class="book-icon">📚</div>
        <div v-if="book.isLocal" class="book-badge">
          {{ t('library.local') }}
        </div>
      </div>
      <div class="book-info">
        <h3 class="book-title">{{ displayTitle }}</h3>
        <div class="book-details">
          
          <!-- Size information (if available) -->
          <div v-if="book.size" class="detail-row">
            <span class="detail-label">{{ t('library.size') }}:</span> 
            <span class="detail-value">{{ formattedSize }}</span>
          </div>
          
          <!-- Date information -->
          <div v-if="dateAdded" class="detail-row">
            <span class="detail-label">{{ t('library.added') }}:</span> 
            <span class="detail-value">{{ dateAdded }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Settings button for local books only -->
    <button 
      v-if="book.isLocal" 
      @click.stop="settingsModalOpen = true" 
      class="book-settings-button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    </button>
    
    <BookSettingsModal
      :book="book"
      :is-open="settingsModalOpen"
      @close="settingsModalOpen = false"
      @book-updated="handleBookUpdated"
      @book-deleted="handleBookDeleted"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useI18n } from '../i18n/usei18n';
import { type EpubFile } from '../types/epubFile';
import { formatFilename, formatFileSize, formatDate } from '../utils/utils';
import BookSettingsModal from './BookSettingsModal.vue';

export default defineComponent({
  name: 'BookCard',
  components: {
    BookSettingsModal
  },
  props: {
    book: {
      type: Object as () => EpubFile,
      required: true
    }
  },
  emits: ['read', 'book-updated', 'book-deleted'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const settingsModalOpen = ref(false);
    const displayTitle = computed(() => {
      return props.book.title || formatFilename(props.book.filename);
    });

    const formattedSize = computed(() => {
      return props.book.size ? formatFileSize(props.book.size) : t('library.unknown');
    });

    const dateAdded = computed(() => {
      return props.book.dateAdded ? formatDate(props.book.dateAdded) : null;
    });
    
    const handleBookUpdated = (updatedBook: EpubFile) => {
      emit('book-updated', updatedBook);
    };
    
    const handleBookDeleted = (bookId: string) => {
      emit('book-deleted', bookId);
    };

    return {
      t,
      displayTitle,
      formattedSize,
      dateAdded,
      settingsModalOpen,
      handleBookUpdated,
      handleBookDeleted
    };
  }
});
</script>

<style scoped>
.book-card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  border: 1px solid var(--divider-color);
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  height: 100%;
  max-width: 100%;
}

.book-card:hover,
.book-card:focus {
  transform: scale(1.03);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  outline: none;
}

.book-card:active {
  transform: scale(0.98);
}

.book-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
}

/* Book Cover */
.book-cover {
  background-color: color-mix(in srgb, var(--accent-color) 10%, transparent);
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border-bottom: 1px solid var(--divider-color);
}

.book-icon {
  font-size: 36px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.book-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  background-color: var(--accent-color);
  color: white;
}

/* Book Info Section */
.book-info {
  padding: 1rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.book-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.3;
}

.book-details {
  color: var(--muted-text);
  font-size: 14px;
  flex-grow: 1;
}

.detail-row {
  display: flex;
  margin-bottom: 4px;
  line-height: 1.3;
}

.detail-label {
  font-weight: 500;
  margin-right: 6px;
}

.detail-value {
  flex: 1;
  text-align: right;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 2.6em; /* Based on line-height to ensure it stays contained */
  line-height: 1.3;
}

.book-actions {
  display: flex;
  padding: 10px;
  border-top-width: 1px;
  border-top-style: solid;
  border-top-color: var(--divider-color);
  justify-content: space-around;
  margin-top: auto;
}

.book-settings-button {
  color: var(--muted-text);
  position: absolute;
  top: 8px;
  left: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  opacity: 0.7;
  transition: opacity 0.2s, background-color 0.2s;
  z-index: 5;
}

.book-settings-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
}
</style>