<!-- src/views/LibraryView.vue -->
<template>
  <div class="library-wrapper" :class="{ slideLeft: stylesModalOpen }">
      <div class="library-header">
      <h4>{{ t('library.library') }}</h4>
      <StylesButton 
        :is-open="stylesModalOpen" 
        @toggle="toggleStylesModal" 
      />
    </div>

    <div class="library-container">
      <div class="import-section">
        <input
          type="file"
          id="fileInput"
          ref="fileInput"
          accept=".epub"
          multiple
          style="display: none"
          @change="handleFileImport"
        />
        <button class="import-button" @click="triggerFileInput">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M21 14a1 1 0 0 0-1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4a1 1 0 0 0-2 0v4a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-4a1 1 0 0 0-1-1m-9.71 1.71a1 1 0 0 0 .33.21a.94.94 0 0 0 .76 0a1 1 0 0 0 .33-.21l4-4a1 1 0 0 0-1.42-1.42L13 12.59V3a1 1 0 0 0-2 0v9.59l-2.29-2.3a1 1 0 1 0-1.42 1.42Z"/></svg>
        </button>
      </div>
      <div v-if="loading" class="loading">
        {{ t('library.loading') }}
      </div>
      <div v-else-if="epubFiles.length === 0" class="empty-library">
        <div class="empty-icon">📚</div>
        <p>{{ t('library.emptyLibrary') }}</p>
      </div>
      <div v-else class="book-grid">
        <BookCard 
          v-for="book in epubFiles" 
          :key="book.id" 
          :book="book"

          @read="openReader"
          @book-updated="handleBookUpdated"
          @book-deleted="handleBookDeleted"
        />
      </div>
    </div>
  <div v-if="toast.message" :class="['toast', toast.type]">{{ toast.message }}</div>
  </div>

  <StylesModal
    v-model:text-color="textColor"
    v-model:background-color="backgroundColor"
    v-model:accent-color="accentColor"
    v-model:font-family="fontFamily"
    :is-open="stylesModalOpen"
    @close="toggleStylesModal"
    :title="t('settings.settings')"
  />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import StylesModal from '../components/StylesModal.vue';
import StylesButton from '../components/StylesButton.vue'
import BookCard from '../components/BookCard.vue';
import { useI18n } from '../i18n/usei18n';
import { useStyles } from '../composables/useStyles';
import { type EpubFile } from '../types/epubFile';
import { 
  formatFilename,
  createToast
} from '../utils/utils';
import { RemoteBookService } from '../services/remoteBookService';
import { ImportBookService } from '../services/importBookService';

export default defineComponent({
  name: 'LibraryView',
  components: {
    BookCard,
    StylesModal,
    StylesButton
  },
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const epubFiles = ref<EpubFile[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<string | null>(null);
    const fileInput = ref<HTMLInputElement | null>(null);
    const { toast, showToast } = createToast();

    // Use composable for styles management
    const { 
      textColor, 
      backgroundColor, 
      accentColor,
      fontFamily, 
      stylesModalOpen, 
      toggleStylesModal 
    } = useStyles();

    // Environment configuration
    const useRemoteApi = computed(() => {
      return import.meta.env.VITE_REMOTE_API === 'true';
    });
    
    const apiBaseUrl = computed(() => {
      return import.meta.env.VITE_API_URL;
    });
    
    // Create services
    const importBookService = new ImportBookService();
    const remoteBookService = new RemoteBookService(apiBaseUrl.value);

    // Load the library on component mount
    const loadLibrary = async (): Promise<void> => {
      loading.value = true;
      error.value = null;
      document.title = t('library.library')
      
      try {
        // Get locally imported books first
        const localBooks = await importBookService.loadLocalBooks();
        let allBooks = [...localBooks];
        
        // If remote API is enabled, fetch those books too
        if (useRemoteApi.value) {
          try {
            const remoteBooks = await remoteBookService.fetchEpubList();
            
            // Filter out remote books that are already in local storage
            for (const remoteBook of remoteBooks) {
              const alreadyExists = localBooks.some(localBook => {
                const remoteOriginalId = remoteBook.originalId || remoteBook.id.replace('remote-', '');
                const localOriginalId = localBook.originalId || localBook.id.replace('local-', '');
                return remoteOriginalId === localOriginalId || 
                       remoteBook.filename === localBook.filename;
              });
              
              if (!alreadyExists) {
                allBooks.push(remoteBook);
              }
            }
          } catch (err) {
            console.error('Error fetching remote EPUB list:', err);
            showToast('Could not retrieve online library. Showing local books only.', 'error');
          }
        }
        
        // Sort by date added, newest first
        allBooks.sort((a, b) => {
          return (b.dateAdded || 0) - (a.dateAdded || 0);
        });
        
        epubFiles.value = allBooks;
      } catch (err) {
        console.error('Error loading library:', err);
        showToast('Failed to load library. Please try again later.', 'error');
        epubFiles.value = []; // Ensure books is at least an empty array
      } finally {
        loading.value = false;
      }
    };

    // Function to open the reader for a book
    const openReader = async (book: EpubFile): Promise<void> => {
      try {
        // For local books, open directly
        if (book.isLocal) {
          router.push(`/reader/${book.id}`);
          return;
        }
        
        // For remote books, check if already downloaded
        if (book.isRemote) {
          if (await importBookService.bookExistsInDB(book)) {
            // Book is already in local storage, find its local ID
            const localBooks = await importBookService.loadLocalBooks();
            const localBook = localBooks.find(localBook => {
              const remoteId = book.originalId || book.id.replace('remote-', '');
              const localOriginalId = localBook.originalId || localBook.id.replace('local-', '');
              return remoteId === localOriginalId || book.filename === localBook.filename;
            });
            
            if (localBook) {
              router.push(`/reader/${localBook.id}`);
              return;
            }
          }
          
          // Need to download the book first
          showToast(`Downloading "${formatFilename(book.filename)}"...`, 'info');
          
          try {
            // Download the book
            const blob = await remoteBookService.downloadBook(book);
            
            // Store in IndexedDB
            const localId = await importBookService.storeBook(book, blob);
            
            showToast(`"${formatFilename(book.filename)}" has been downloaded to your local library.`, 'success');
            
            // Open the reader
            router.push(`/reader/${localId}`);
          } catch (err) {
            console.error('Error downloading book:', err);
            showToast(`Failed to download the book: ${err instanceof Error ? err.message : String(err)}`, 'error');
          }
        }
      } catch (err) {
        console.error('Error preparing book for reading:', err);
        showToast(`Error preparing book for reading: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    };

    // Function to trigger file input click
    const triggerFileInput = (): void => {
      if (fileInput.value) {
        fileInput.value.click();
      }
    };
    
    // Handle file import from user's filesystem
    const handleFileImport = async (event: Event): Promise<void> => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (!files || files.length === 0) {
        return;
      }
      
      try {
        let importedCount = 0;
        const failedImports: Array<{name: string, reason: string}> = [];
        
        // Process each file
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Check if the file is an EPUB
          if (!file.name.toLowerCase().endsWith('.epub')) {
            failedImports.push({ name: file.name, reason: 'Not an EPUB file' });
            continue;
          }
          
          try {
            // Import the file using the service
            const importedBook = await importBookService.importLocalFile(file);
            
            // Add the imported book to the current view
            epubFiles.value = [...epubFiles.value, importedBook];
            importedCount++;
            
          } catch (err) {
            console.error('Error processing file:', file.name, err);
            failedImports.push({ name: file.name, reason: 'Processing error' });
          }
        }
        
        // Reset file input
        target.value = '';
        
        // Show import summary
        if (importedCount > 0) {
          const message = `Successfully imported ${importedCount} book${importedCount !== 1 ? 's' : ''}.`;
          showToast(message, 'success');
        }
        
        if (failedImports.length > 0) {
          let failMessage = `Failed to import ${failedImports.length} file${failedImports.length !== 1 ? 's' : ''}`;
          showToast(failMessage, 'error');
        }
        
      } catch (err) {
        console.error('Import error:', err);
        showToast(`Error importing books: ${err instanceof Error ? err.message : String(err)}`, 'error');
      }
    };
    
    // Handle book updated event
    const handleBookUpdated = (updatedBook: EpubFile): void => {
      // Find the book in the list and update it
      const index = epubFiles.value.findIndex(b => b.id === updatedBook.id);
      if (index !== -1) {
        epubFiles.value[index] = updatedBook;
        // Create a new array to trigger reactivity
        epubFiles.value = [...epubFiles.value];
        showToast(`Book "${updatedBook.title || formatFilename(updatedBook.filename)}" has been updated.`, 'success');
      }
    };
    
    // Handle book deleted event
    const handleBookDeleted = (bookId: string): void => {
      // Find the book first to get its title for the toast message
      const deletedBook = epubFiles.value.find(b => b.id === bookId);
      const bookTitle = deletedBook ? (deletedBook.title || formatFilename(deletedBook.filename)) : 'Book';
      
      // Remove the book from the list
      epubFiles.value = epubFiles.value.filter(b => b.id !== bookId);
      showToast(`"${bookTitle}" has been removed from your library.`, 'success');
    };

    onMounted(() => {
      loadLibrary();
    });

    return {
      t,
      epubFiles,
      loading,
      error,
      fileInput,
      openReader,
      triggerFileInput,
      handleFileImport,
      handleBookUpdated,
      handleBookDeleted,
      toast,
      showToast,
      // Styles from composable
      textColor, 
      backgroundColor, 
      accentColor, 
      stylesModalOpen, 
      fontFamily,
      toggleStylesModal
    };
  }
});
</script>

<style scoped>
.library-wrapper{
  transition: all 0.3s ease-in-out;
}

.library-container {
  padding: 1rem 2rem;
  color: var(--text-color, #000000);
  background-color: var(--background-color, #ffffff);
  max-width: 1200px;
  margin: 0 auto;
}

.library-header {
  background: var(--background-color);
  display: flex;
  align-items: center;
  padding: 5px;
  justify-content: space-between;
  color: var(--text-color);
  margin: 0;
  border-bottom: 1px solid var(--divider-color);
}

.library-header h4 {
  margin: 0;
  font-weight: bold;
  padding: 0 0 0 0.5rem;
}

.slideLeft {
  transform: translateX(-256px);
}

.import-section {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 999;
  transition: transform 0.2s;
}

.import-section:active {
  transform: scale(0.9);
}

.import-button {
  background-color: var(--accent-color, #f5a623);
  color: white;
  border: none;
  border-radius: 50%;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}

.import-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

.import-button:active {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Status Messages */
.loading, .error, .empty-library {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: var(--text-color);
}

.empty-library {
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  color: var(--text-color);
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 24px;
  margin-top: 2rem;
}

.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeIn 0.3s, fadeOut 0.3s 3.7s;
  max-width: 90%;
}

.toast.success {
  background-color: var(--green);
  color: white;
}

.toast.error {
  background-color: var(--red);
  color: white;
}

.toast.info {
  background-color: var(--blue);
  color: white;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(-50%, 20px); }
}

@media (max-width: 768px) {  
  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .library-container {
    padding: 1rem;
  }
}
</style>