<!-- src/components/BookSettingsModal.vue -->
<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay">
      <div 
        class="modal-content" 
        @click.stop
      >
        <div class="modal-header">
          <h3>{{ t('settings.bookSettings') }}</h3>
          <button class="close-button" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41z"/>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="bookTitle">{{ t('library.title') }}</label>
            <input 
              id="bookTitle" 
              v-model="localTitle" 
              type="text" 
              :placeholder="t('library.enter_title')"
            />
          </div>
          
          <div class="book-info">
            <div class="info-item">
              <span class="info-label">{{ t('library.filename') }}:</span>
              <span class="info-value">{{ book.filename }}</span>
            </div>
            <div v-if="book.size" class="info-item">
              <span class="info-label">{{ t('library.size') }}:</span>
              <span class="info-value">{{ formattedSize }}</span>
            </div>
            <div v-if="dateAdded" class="info-item">
              <span class="info-label">{{ t('library.added') }}:</span>
              <span class="info-value">{{ dateAdded }}</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button 
            class="delete-button" 
            @click="confirmDelete"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M14 11v6m-4-6v6M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M4 7h16M7 7l2-4h6l2 4" stroke-width="1"/></svg>
            {{ t('settings.deleteBook') }}
          </button>
          <button 
            class="save-button" 
            @click="saveChanges"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5.616 20q-.691 0-1.153-.462T4 18.384V5.616q0-.691.463-1.153T5.616 4h10.29q.323 0 .628.13q.305.132.522.349l2.465 2.465q.218.218.348.522q.131.305.131.628v10.29q0 .691-.462 1.154T18.384 20zM19 7.85L16.15 5H5.616q-.27 0-.443.173T5 5.616v12.769q0 .269.173.442t.443.173h12.769q.269 0 .442-.173t.173-.443zm-7 8.689q.827 0 1.414-.587T14 14.538t-.587-1.413T12 12.539t-1.413.586T10 14.538t.587 1.414t1.413.586M7.577 9.77h5.808q.348 0 .578-.23t.23-.577V7.577q0-.348-.23-.578t-.578-.23H7.577q-.348 0-.578.23t-.23.578v1.385q0 .348.23.578t.578.23M5 7.85V19V5z"/></svg>
            {{ t('settings.saveChanges') }}
          </button>
        </div>
        
        <!-- Confirmation Dialog -->
        <div v-if="showDeleteConfirm" class="confirm-dialog" @click.stop>
          <div class="confirm-content">
            <p>{{ t('settings.confirmDelete') }} <strong>"{{ book.title || formatFilename(book.filename) }}"</strong>?</p>
            <div class="confirm-buttons">
              <button 
                @click="showDeleteConfirm = false"
              >
                {{ t('settings.cancel') }}
              </button>
              <button 
                @click="deleteBook"
              >
                {{ t('settings.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>


<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useI18n } from '../i18n/usei18n';
import { type EpubFile } from '../types/epubFile';
import { formatFilename, formatFileSize, formatDate } from '../utils/utils';
import { ImportBookService } from '../services/importBookService';
import { useStyles } from '../composables/useStyles';

export default defineComponent({
  name: 'BookSettingsModal',
  props: {
    book: {
      type: Object as () => EpubFile,
      required: true
    },
    isOpen: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'book-updated', 'book-deleted'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const { textColor, backgroundColor, accentColor, fontFamily } = useStyles();
    const localTitle = ref('');
    const showDeleteConfirm = ref(false);
    const importBookService = new ImportBookService();
    
    // Initialize local title with book title
    onMounted(() => {
      localTitle.value = props.book.title || formatFilename(props.book.filename);
    });
    
    // Update local title when book changes
    watch(() => props.book, (newBook) => {
      localTitle.value = newBook.title || formatFilename(newBook.filename);
    });
    
    // Add event listener to handle escape key
    watch(() => props.isOpen, (isOpen) => {
      if (isOpen) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      } else {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      }
    });
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showDeleteConfirm.value) {
          showDeleteConfirm.value = false;
        } else {
          emit('close');
        }
      }
    };
    

    // Format size for display using utility function
    const formattedSize = computed(() => {
      return props.book.size ? formatFileSize(props.book.size) : t('library.unknown');
    });

    // Format date for display using utility function
    const dateAdded = computed(() => {
      return props.book.dateAdded ? formatDate(props.book.dateAdded) : null;
    });

    // Save changes to the book title
    const saveChanges = async () => {
      try {
        if (localTitle.value !== props.book.title) {
          // Create an updated book object
          const updatedBook: EpubFile = {
            ...props.book,
            title: localTitle.value
          };
          
          await importBookService.storeBook(updatedBook);

          emit('book-updated', updatedBook);
        }
        emit('close');
      } catch (err) {
        console.error('Error updating book:', err);
      }
    };

    // Show delete confirmation dialog
    const confirmDelete = () => {
      showDeleteConfirm.value = true;
    };

    // Delete the book from IndexedDB
    const deleteBook = async () => {
      try {
        await importBookService.deleteBook(props.book.id);
        emit('book-deleted', props.book.id);
        emit('close');
      } catch (err) {
        console.error('Error deleting book:', err);
      }
    };

    // Clean up event listeners when component is unmounted
    onMounted(() => {
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = ''; // Ensure we reset overflow if component unmounts
      };
    });

    return {
      t,
      textColor,
      backgroundColor,
      accentColor,
      fontFamily,
      localTitle,
      formattedSize,
      dateAdded,
      showDeleteConfirm,
      saveChanges,
      confirmDelete,
      deleteBook,
      formatFilename
    };
  }
});
</script>

<style scoped>
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

.modal-content {
  width: 90%;
  max-width: 500px;
  background-color: var(--background-color);
  color: var(--text-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--divider-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.modal-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--divider-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5em;
  font-weight: bold;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  padding: 4px;
  color: inherit;
}

.modal-body {
  padding: 16px;
  flex-grow: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--divider-color);
  font-size: 16px;
}

.book-info {
  margin-top: 24px;
}

.info-item {
  margin-bottom: 8px;
  display: flex;
}
.info-value {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: 2.6em; /* Based on line-height to ensure it stays contained */
  line-height: 1.3;
}
.info-label {
  font-weight: 500;
  margin-right: 8px;
  min-width: 80px;
}

.modal-footer {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--divider-color);
}

.save-button{background: var(--green);}
.delete-button{background: var(--red);}
.save-button, .delete-button {
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.save-button > svg, .delete-button > svg {
  width: 20px;
  margin: 0 5px 2.5px 0;
  }

.confirm-dialog {
  position: fixed; 
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1100; 
}

.confirm-content {
  padding: 24px;
  background-color: var(--background-color);
  border-radius: 8px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.confirm-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.confirm-buttons button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-color);
  background-color: var(--divider-color);
}
</style>