<template>
  <div class="reader-container">
    <div 
      class="reader-area" 
      :class="{ 
        slideRight: expandedToc, 
        slideLeft: stylesModalOpen 
      }"
    >
      <button
        v-if="showToc"
        class="toc-button"
        :class="{ 'toc-button-expanded': expandedToc }"
        @click="toggleToc"
      >
        <span class="toc-button-bar" style="top: 35%"></span>
        <span class="toc-button-bar" style="top: 66%"></span>
      </button>

      <h2 class="book-title">{{ bookTitle }}</h2>

      <StylesButton :is-open="stylesModalOpen" @toggle="toggleStylesModal" />
      
      <AnnotationsButton 
        :is-open="showAnnotationsPanel" 
        :count="savedAnnotations.length"
        :has-selection="hasTextSelection"
        @toggle="toggleAnnotationsPanel"
        @createFromSelection="createAnnotationFromSelection"
      />

      <div v-if="loading" class="loading">{{ t("reader.loading") }}</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="reader-view">
        <EpubView
          ref="epubRef"
          v-if="bookData"
          :url="bookData"
          :location="location"
          @update:location="locationChange"
          :tocChanged="onTocChange"
          :getRendition="getRendition"
          :toggleBubble="toggleSelectionBubble"
        />
      </div>
    </div>

    <!-- Table of Contents -->
    <div v-if="showToc">
      <div class="toc-area" v-show="expandedToc">
        <TocComponent
          :toc="toc"
          :current="currentHref"
          :setLocation="setLocation"
        />
      </div>
      <div v-if="expandedToc" class="toc-background" @click="toggleToc"></div>
    </div>

    <!-- Annotations Panel -->
    <AnnotationsPanel
      :annotations="savedAnnotations"
      :is-visible="showAnnotationsPanel"
      @close="showAnnotationsPanel = false"
      @goto="goToAnnotation"
      @edit="editAnnotation"
      @delete="deleteAnnotation"
    />

    <!-- Annotation Modal -->
    <AnnotationModal
      :is-open="showAnnotationModal"
      :selected-text="pendingAnnotation?.text || ''"
      :initial-name="annotationName"
      :initial-note="annotationNote"
      :is-editing="!!editingAnnotation"
      @close="closeAnnotationModal"
      @save="handleAnnotationSave"
    />

    <!-- Styles Modal -->
    <StylesModal
      v-model:text-color="textColor"
      v-model:background-color="backgroundColor"
      v-model:accent-color="accentColor"
      v-model:font-family="fontFamily"
      v-model:font-size="fontSize"
      :is-open="stylesModalOpen"
      @close="toggleStylesModal"
      :title="t('settings.settings')"
    />
  </div>
</template>

<script setup lang="ts">
import {
  ref, reactive, onMounted, onUnmounted, toRefs, watch, nextTick
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../i18n/usei18n";
import EpubView from "../components/EpubView.vue";
import StylesModal from "../components/StylesModal.vue";
import StylesButton from "../components/StylesButton.vue";
import AnnotationsPanel from "../components/AnnotationsPanel.vue";
import AnnotationModal from "../components/AnnotationModal.vue";
import AnnotationsButton from "../components/AnnotationsButton.vue";
import TocComponent from "../components/TocComponent.vue";
import { useStyles } from "../composables/useStyles";
import { useAnnotations } from "../composables/useAnnotations";
import { loadBookFromIndexedDB } from "../utils/utils";
import type { EpubFile } from "../types/epubFile";
import type { AnnotationFormData } from "../types/annotations";

// Import epub.js types
import type Rendition from 'epubjs/types/rendition';
import type { DisplayedLocation } from 'epubjs/types/rendition';
import type Contents from 'epubjs/types/contents';
import type Book from 'epubjs/types/book';

// Extended NavItem interface
interface ExtendedNavItem {
  id: string;
  href: string;
  label: string;
  subitems: Array<ExtendedNavItem>;
  parent?: string;
  expansion: boolean;
}

// Event handler types
interface RelocatedEvent {
  start: DisplayedLocation;
  end: DisplayedLocation;
  atStart: boolean;
  atEnd: boolean;
}

// Setup state
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const bookData = ref<ArrayBuffer | null>(null);
const bookDataUrl = ref<string | null>(null);
const bookTitle = ref<string>("");
const location = ref<string | null>(null);
const firstRenderDone = ref<boolean>(false);
const showToc = ref<boolean>(true);
const epubRef = ref<InstanceType<typeof EpubView> | null>(null);
const currentHref = ref<string | number | null>(null);

// TOC related state
const bookState = reactive({
  toc: [] as Array<ExtendedNavItem>,
  expandedToc: false,
});
const { toc, expandedToc } = toRefs(bookState);

// Styles and rendition
const {
  textColor, backgroundColor, accentColor,
  fontFamily, fontSize, stylesModalOpen,
  toggleStylesModal, rendition, setRendition,
} = useStyles();

// Annotations composable
const {
  savedAnnotations,
  pendingAnnotation,
  showAnnotationModal,
  showAnnotationsPanel,
  annotationName,
  annotationNote,
  editingAnnotation,
  hasTextSelection,
  loadAnnotations,
  applyAnnotationsToView,
  toggleSelectionBubble,
  handleAnnotationSave,
  closeAnnotationModal,
  goToAnnotation,
  editAnnotation,
  deleteAnnotation,
  toggleAnnotationsPanel,
  createAnnotationFromSelection,
} = useAnnotations(rendition, currentHref, accentColor);

const BookProgressManager = {
  saveProgress(bookId: string, cfi: string, extraData = {}) {
    try {
      const progressKey = `book-progress-${bookId}`;
      const data = {
        cfi,
        timestamp: Date.now(),
        ...extraData
      };
      localStorage.setItem(progressKey, JSON.stringify(data));
      console.log(`Progress saved for book ${bookId}:`, data);
      return true;
    } catch (error) {
      console.error('Error saving book progress:', error);
      return false;
    }
  },

  loadProgress(bookId: string) {
    try {
      const progressKey = `book-progress-${bookId}`;
      const data = localStorage.getItem(progressKey);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return parsed;
    } catch (error) {
      console.error('Error loading book progress:', error);
      return null;
    }
  },

  clearProgress(bookId: string) {
    const progressKey = `book-progress-${bookId}`;
    localStorage.removeItem(progressKey);
  }
};

const loadBook = async (): Promise<void> => {
  loading.value = true;
  error.value = null;

  try {
    const bookId = route.params.bookId as string;
    if (!bookId) throw new Error("No book ID provided.");

    const book: EpubFile = await loadBookFromIndexedDB(bookId);

    // Load book data
    if (book.data instanceof Blob) {
      bookData.value = await book.data.arrayBuffer();
      const blob = new Blob([bookData.value]);
      bookDataUrl.value = URL.createObjectURL(blob);
    } else if (book.data instanceof ArrayBuffer) {
      bookData.value = book.data;
      const blob = new Blob([bookData.value]);
      bookDataUrl.value = URL.createObjectURL(blob);
    } else {
      throw new Error("Book data is in an unsupported format");
    }

    // Load progress after book data is ready
    const progress = BookProgressManager.loadProgress(bookId);
    if (progress && progress.cfi) {
      location.value = progress.cfi;
    }

    // Load annotations
    loadAnnotations(bookId);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error loading book:", err);
    error.value = `Failed to load the book. ${errorMsg}`;
  } finally {
    loading.value = false;
  }
};

// Handle location changes
const locationChange = (epubcifi: string): void => {
  // Skip saving the location on the first render
  if (!firstRenderDone.value) {
    firstRenderDone.value = true;
    return;
  }
  
  // Only save valid locations with epubcfi format
  if (epubcifi && epubcifi.includes('epubcfi')) {
    const bookId = route.params.bookId as string;
    
    BookProgressManager.saveProgress(bookId, epubcifi, {
      chapter: currentHref.value?.toString()
    });
    
    location.value = epubcifi;
  }
};

const getRendition = (rendition: Rendition): void => {
  setRendition(rendition);

  rendition.on("relocated", (location: RelocatedEvent) => {
    currentHref.value = location.start.href;
  });

  applyAnnotationsToView();

  let annotationsApplied = true;
  
  rendition.on("rendered", async () => {

  if (!annotationsApplied) {
    try {
      annotationsApplied = true;
    } catch (error) {
      console.error("An error occurred while applying annotations:", error);
    }
  }
  });

  // Get book metadata
  const book: Book = rendition.book;
  book.ready.then(() => {
    const meta = book.packaging?.metadata;
    if (!bookTitle.value && meta?.title) {
      bookTitle.value = meta.title;
      document.title = meta.title;
    }
  });
};

// Wrapper for delete annotation to include bookId
const deleteAnnotationWrapper = (annotationId: string): void => {
  const bookId = route.params.bookId as string;
  deleteAnnotation(annotationId, bookId);
};

// Toggle TOC panel
const toggleToc = (): void => {
  expandedToc.value = !expandedToc.value;
  if (expandedToc.value) {
    window.addEventListener('keydown', handleKeyDown);
  } else {
    window.removeEventListener('keydown', handleKeyDown);
  }
};

// Handle key events
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showAnnotationModal.value) {
      closeAnnotationModal();
    } else if (showAnnotationsPanel.value) {
      showAnnotationsPanel.value = false;
    } else {
      expandedToc.value = false;
    }
  }
};

// Convert navigation items to our format
const convertNavItems = (items: any[]): ExtendedNavItem[] => {
  return items.map((item) => ({
    id: item.id || '',
    href: item.href || '',
    label: item.label || '',
    parent: item.parent,
    expansion: false,
    subitems: Array.isArray(item.subitems) 
      ? convertNavItems(item.subitems) 
      : []
  } as ExtendedNavItem));
};

const onTocChange = (tocData: any[]): void => {
  try {
    toc.value = convertNavItems(tocData);
  } catch (error) {
    console.error('Error processing TOC data:', error);
    toc.value = [];
  }
};

const setLocation = (
  href: string | number,
  close: boolean = true
): void => {
  epubRef.value?.setLocation(href);
  currentHref.value = href;
  expandedToc.value = !close;
};

onMounted(() => {
  loadBook();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (bookDataUrl.value) {
    URL.revokeObjectURL(bookDataUrl.value);
  }
  
  window.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  t,
  loading,
  error,
  bookData,
  bookTitle,
  location,
  locationChange,
  getRendition,
  rendition,
  fontFamily,
  fontSize,
  stylesModalOpen,
  toggleStylesModal,
  textColor,
  backgroundColor,
  accentColor,
  // TOC related
  showToc,
  toc,
  expandedToc,
  toggleToc,
  onTocChange,
  currentHref,
  setLocation,
  epubRef,
  // Annotation related
  savedAnnotations,
  goToAnnotation,
  editAnnotation: editAnnotation,
  deleteAnnotation: deleteAnnotationWrapper,
  toggleAnnotationsPanel,
  toggleSelectionBubble,
  createAnnotationFromSelection
});
</script>

<style scoped>
.reader-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  color: var(--text-color, #000000);
  background-color: var(--background-color, #ffffff);
  position: relative;
}

.slideRight {
  transform: translateX(256px);
}

.slideLeft {
  transform: translateX(-256px);
}

.reader-area {
  position: relative;
  z-index: 9;
  height: 100%;
  width: 100%;
  background-color: var(--background-color);
  transition: transform 0.3s ease-in-out;
}

.toc-button {
  color: var(--accent-color);
  transition: transform ease-in 0.3s;
  background: none;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  height: 32px;
  width: 32px;
  outline: none;
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
  touch-action: manipulation;
}

.toc-button-bar {
  position: absolute;
  width: 60%;
  background: var(--accent-color);
  height: 2px;
  left: 50%;
  margin: -1px -30%;
  top: 50%;
  transition: all 0.3s ease-in-out;
}

.toc-button-expanded > .toc-button-bar:first-child {
  top: 50% !important;
  transform: rotate(45deg);
}

.toc-button-expanded > .toc-button-bar:last-child {
  top: 50% !important;
  transform: rotate(-45deg);
}

.book-title {
  margin: 0 1rem;
  font-size: 1rem;
  color: var(--text-color);
  opacity: 0.7;
  left: 50px;
  overflow: hidden;
  position: absolute;
  right: 50px;
  text-align: center;
  text-overflow: ellipsis;
  top: 10px;
  white-space: nowrap;
  z-index: 5;
  touch-action: manipulation;
}

.reader-view {
  height: 100%;
  overflow: hidden;
  padding-top: 40px; /* Space for header */
}

.loading, .error {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--accent-color);
  height: 100%;
  font-size: 1.2rem;
}

/* Ensure highlight styles are properly applied */
:deep(.epub-view) {
  height: 100%;
}

:deep(.saved-annotation) {
  background-color: var(--accent-color);
  opacity: 0.4;
  cursor: pointer;
}
</style>
