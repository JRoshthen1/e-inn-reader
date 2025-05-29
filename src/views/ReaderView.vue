<!-- ReaderView.vue (Updated with separated components) -->
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
        @toggle="toggleAnnotationsPanel" 
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
        />
      <!--:epubOptions="{
            flow: 'scrolled',
            manager: 'continuous',
          }" -->
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

    <!-- Annotations Panel (imported component) -->
    <AnnotationsPanel
      :annotations="savedAnnotations"
      :is-visible="showAnnotationsPanel"
      @close="showAnnotationsPanel = false"
      @goto="goToAnnotation"
      @edit="editAnnotation"
      @delete="deleteAnnotation"
    />

    <!-- Annotation Modal (imported component) -->
    <AnnotationModal
      :is-open="showAnnotationModal"
      :selected-text="pendingAnnotation?.text || ''"
      :initial-name="annotationName"
      :initial-note="annotationNote"
      :is-editing="!!editingAnnotation"
      @close="closeAnnotationModal"
      @save="handleAnnotationSave"
    />

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
  ref, reactive, onMounted, onUnmounted, toRefs, h,
  getCurrentInstance, Transition, nextTick
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../i18n/usei18n";
import StylesModal from "../components/StylesModal.vue";
import StylesButton from "../components/StylesButton.vue";
import AnnotationsPanel from "../components/AnnotationsPanel.vue";
import AnnotationModal from "../components/AnnotationModal.vue";
import AnnotationsButton from "../components/AnnotationsButton.vue";
import { useStyles } from "../composables/useStyles";
import { loadBookFromIndexedDB } from "../utils/utils";
import EpubView from "../components/EpubView.vue";
import { type EpubFile } from "../types/epubFile";
import { type Annotation, type PendingAnnotation, type AnnotationFormData } from "../types/annotations";

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

// TocComponent definition
const TocComponent = (props: {
  toc: Array<ExtendedNavItem>;
  current: string | number;
  setLocation: (href: string | number, close?: boolean) => void;
  isSubmenu?: boolean;
}) => {
  const vm = getCurrentInstance();
  const renderH = h.bind(vm);

  return renderH(
    "div",
    null,
    props.toc.map((item, index) => {
      return renderH("div", { key: index }, [
        renderH(
          "button",
          {
            class: [
              "toc-area-button",
              item.href === props.current ? "active" : "",
            ],
            onClick: () => {
              if (item.subitems.length > 0) {
                item.expansion = !item.expansion;
                props.setLocation(item.href, false);
              } else {
                props.setLocation(item.href);
              }
            },
          },
          [
            props.isSubmenu ? " ".repeat(4) + item.label : item.label,
            item.subitems.length > 0 &&
              renderH("div", {
                class: `${item.expansion ? "open" : ""} expansion`,
              }),
          ]
        ),
        // Nested TOC
        item.subitems.length > 0 &&
          renderH(
            Transition,
            { name: "collapse-transition" },
            {
              default: () =>
                renderH(
                  "div",
                  {
                    style: {
                      display: item.expansion ? undefined : "none",
                    },
                  },
                  [
                    renderH(TocComponent, {
                      toc: item.subitems,
                      current: props.current,
                      setLocation: props.setLocation,
                      isSubmenu: true,
                    }),
                  ]
                ),
            }
          ),
      ]);
    })
  );
};

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

// Annotation state
const savedAnnotations = ref<Annotation[]>([]);
const pendingAnnotation = ref<PendingAnnotation | null>(null);
const showAnnotationModal = ref<boolean>(false);
const showAnnotationsPanel = ref<boolean>(false);
const annotationName = ref<string>('');
const annotationNote = ref<string>('');
const editingAnnotation = ref<Annotation | null>(null);

// TOC related state
const bookState = reactive({
  toc: [] as Array<ExtendedNavItem>,
  expandedToc: false,
});
const { toc, expandedToc } = toRefs(bookState);

const {
  textColor, backgroundColor, accentColor,
  fontFamily, fontSize, stylesModalOpen,
  toggleStylesModal, rendition, setRendition,
} = useStyles();

// Toggle annotations panel
const toggleAnnotationsPanel = () => {
  showAnnotationsPanel.value = !showAnnotationsPanel.value;
};

// Annotation storage functions
const getAnnotationStorageKey = (bookId: string): string => {
  return `epub-annotations-${bookId}`;
};

const loadAnnotations = (): void => {
  try {
    const bookId = route.params.bookId as string;
    const storageKey = getAnnotationStorageKey(bookId);
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const parsedAnnotations: Annotation[] = JSON.parse(stored);
      savedAnnotations.value = parsedAnnotations.sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (error) {
    console.error('Error loading annotations:', error);
    savedAnnotations.value = [];
  }
};

const saveAnnotationsToStorage = (): void => {
  try {
    const bookId = route.params.bookId as string;
    const storageKey = getAnnotationStorageKey(bookId);
    localStorage.setItem(storageKey, JSON.stringify(savedAnnotations.value));
  } catch (error) {
    console.error('Error saving annotations:', error);
  }
};

const generateAnnotationId = (): string => {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const loadBook = async (): Promise<void> => {
  loading.value = true;
  error.value = null;

  try {
    const bookId = route.params.bookId as string;
    if (!bookId) throw new Error("No book ID provided.");

    const book: EpubFile = await loadBookFromIndexedDB(bookId);

    const progressKey = `book-progress-${bookId}`;
    const savedLocation = localStorage.getItem(progressKey);
    if (savedLocation) location.value = savedLocation;

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

    loadAnnotations();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Error loading book:", err);
    error.value = `Failed to load the book. ${errorMsg}`;
  } finally {
    loading.value = false;
  }
};

const locationChange = (epubcifi: string): void => {
  if (!firstRenderDone.value) {
    firstRenderDone.value = true;
    return;
  }
  const bookId = route.params.bookId as string;
  localStorage.setItem(`book-progress-${bookId}`, epubcifi);
  location.value = epubcifi;
};

// Apply annotations to view
const applyAnnotationsToView = async (): Promise<void> => {
  if (!rendition.value || savedAnnotations.value.length === 0) return;

  try {
    await nextTick();
    setTimeout(() => {
      savedAnnotations.value.forEach(annotation => {
        try {
          rendition.value?.annotations.highlight(
            annotation.cfiRange,
            { 
              id: annotation.id,
              name: annotation.name,
              note: annotation.note 
            },
            undefined,
            'saved-annotation',
            {
              fill: accentColor.value,
              'fill-opacity': '0.4',
              'mix-blend-mode': 'multiply',
              stroke: accentColor.value,
              'stroke-width': '1px'
            }
          );
        } catch (error) {
          console.warn('Failed to apply annotation:', annotation.id, error);
        }
      });
    }, 500);
  } catch (error) {
    console.error('Error applying annotations:', error);
  }
};

// Handle text selection
const handleSelection = (cfiRange: string, contents: Contents): void => {
  try {
    if (!rendition.value) return;
    
    const range = rendition.value.getRange(cfiRange);
    const selectedText = range.toString().trim();
    
    if (!selectedText || selectedText.length < 3) {
      console.log('Selection too short, ignoring');
      return;
    }
    
    pendingAnnotation.value = {
      cfiRange,
      text: selectedText,
      contents
    };
    
    showAnnotationModal.value = true;
    
    if (contents.window && contents.window.getSelection) {
      contents.window.getSelection()?.removeAllRanges();
    }
  } catch (error) {
    console.error('Error handling selection:', error);
  }
};

// Handle annotation save from modal
const handleAnnotationSave = (formData: AnnotationFormData): void => {
  if (!pendingAnnotation.value) return;
  
  try {
    const bookId = route.params.bookId as string;
    const now = Date.now();

    if (editingAnnotation.value) {
      // Update existing annotation
      const index = savedAnnotations.value.findIndex(a => a.id === editingAnnotation.value!.id);
      if (index !== -1) {
        savedAnnotations.value[index] = {
          ...editingAnnotation.value,
          name: formData.name,
          note: formData.note || undefined,
          updatedAt: now
        };
      }
    } else {
      // Create new annotation
      const annotation: Annotation = {
        id: generateAnnotationId(),
        bookId,
        cfiRange: pendingAnnotation.value.cfiRange,
        text: pendingAnnotation.value.text,
        name: formData.name,
        note: formData.note || undefined,
        createdAt: now,
        updatedAt: now,
        chapter: currentHref.value?.toString()
      };

      savedAnnotations.value.unshift(annotation);
      
      // Add visual highlight
      rendition.value?.annotations.highlight(
        annotation.cfiRange,
        { 
          id: annotation.id,
          name: annotation.name,
          note: annotation.note 
        },
        undefined,
        'saved-annotation',
        {
          fill: accentColor.value,
          'fill-opacity': '0.4',
          'mix-blend-mode': 'multiply',
          stroke: accentColor.value,
          'stroke-width': '1px'
        }
      );
    }
saveAnnotationsToStorage();
    closeAnnotationModal();
    
    // Show the annotations panel after creating a new annotation
    if (!editingAnnotation.value) {
      showAnnotationsPanel.value = true;
    }
  } catch (error) {
    console.error('Error saving annotation:', error);
  }
};

// Close annotation modal
const closeAnnotationModal = (): void => {
  showAnnotationModal.value = false;
  pendingAnnotation.value = null;
  annotationName.value = '';
  annotationNote.value = '';
  editingAnnotation.value = null;
};

// Go to annotation
const goToAnnotation = (cfiRange: string): void => {
  if (rendition.value) {
    rendition.value.display(cfiRange);
  }
};

// Edit annotation
const editAnnotation = (annotation: Annotation): void => {
  editingAnnotation.value = annotation;
  annotationName.value = annotation.name;
  annotationNote.value = annotation.note || '';
  
  // Need to set a dummy pending annotation to make the modal work
  pendingAnnotation.value = {
    cfiRange: annotation.cfiRange,
    text: annotation.text,
    contents: null as any // This is fine as we're just editing
  };
  
  showAnnotationModal.value = true;
};

// Delete annotation
const deleteAnnotation = (annotationId: string): void => {
  if (confirm('Are you sure you want to delete this annotation?')) {
    const index = savedAnnotations.value.findIndex(a => a.id === annotationId);
    if (index !== -1) {
      const annotation = savedAnnotations.value[index];
      
      try {
        rendition.value?.annotations.remove(annotation.cfiRange, 'highlight');
      } catch (error) {
        console.warn('Could not remove highlight:', error);
      }
      
      savedAnnotations.value.splice(index, 1);
      saveAnnotationsToStorage();
    }
  }
};

const getRendition = (renditionObj: Rendition): void => {
  setRendition(renditionObj);

  // Track current location for TOC highlighting
  renditionObj.on("relocated", (location: RelocatedEvent) => {
    currentHref.value = location.start.href;
  });

  // Handle text selection
  renditionObj.on('selected', (cfiRange: string, contents: Contents) => {
    handleSelection(cfiRange, contents);
  });

  // Apply saved annotations when view is displayed
  renditionObj.on('displayed', () => {
    applyAnnotationsToView();
  });

  // Get book metadata
  const book: Book = renditionObj.book;
  book.ready.then(() => {
    const meta = book.packaging?.metadata;
    if (!bookTitle.value && meta?.title) {
      bookTitle.value = meta.title;
      document.title = meta.title;
    }
  });
};

const goBack = (): void => {
  router.push("/");
};

const toggleToc = (): void => {
  expandedToc.value = !expandedToc.value;
  if (expandedToc.value) {
    window.addEventListener('keydown', handleKeyDown);
  } else {
    window.removeEventListener('keydown', handleKeyDown);
  }
};

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

// XHR Progress tracking
const originalOpen = XMLHttpRequest.prototype.open;
const onProgress = (e: ProgressEvent) => {
  // Progress tracking if needed
};

XMLHttpRequest.prototype.open = function (
  method: string,
  requestUrl: string | URL
) {
  if (bookDataUrl.value && requestUrl.toString() === bookDataUrl.value) {
    this.addEventListener("progress", onProgress);
  }
  originalOpen.apply(this, arguments as any);
};

onMounted(() => {
  loadBook();
  
  // Add keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  if (bookDataUrl.value) {
    URL.revokeObjectURL(bookDataUrl.value);
  }
  
  XMLHttpRequest.prototype.open = originalOpen;
  window.removeEventListener('keydown', handleKeyDown);
});

defineExpose({
  t,
  loading,
  error,
  bookData,
  bookTitle,
  location,
  goBack,
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
  TocComponent,
  // Annotation related
  savedAnnotations,
  goToAnnotation,
  editAnnotation,
  deleteAnnotation,
  toggleAnnotationsPanel
});
</script>

<style>
/* TOC area styles */
.toc-area {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 10;
  width: 256px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 0;
  background-color: var(--background-color);
  border-right: 1px solid var(--divider-color);
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
}

.toc-area::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.toc-area::-webkit-scrollbar-thumb:vertical {
  height: 5px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
}

.toc-area .toc-area-button {
  user-select: none;
  appearance: none;
  background: none;
  border: none;
  display: block;
  font-family: sans-serif;
  width: 100%;
  font-size: 0.9em;
  text-align: left;
  padding: 0.9em 1em;
  border-bottom: 1px solid var(--divider-color);
  color: var(--text-color);
  box-sizing: border-box;
  outline: none;
  cursor: pointer;
  position: relative;
}

.toc-area .toc-area-button:hover {
  background: rgba(0, 0, 0, 0.05);
}

.toc-area .toc-area-button:active {
  background: rgba(0, 0, 0, 0.1);
}

.toc-area .active {
  border-left: 3px solid var(--accent-color);
}

.toc-area .toc-area-button .expansion {
  cursor: pointer;
  transform: translateY(-50%);
  top: 50%;
  right: 12px;
  position: absolute;
  width: 10px;
  background-color: #a2a5b4;
  transition: top 0.3s ease-in-out;
}

.toc-area .toc-area-button .expansion::after,
.toc-area .toc-area-button .expansion::before {
  content: "";
  position: absolute;
  width: 6px;
  height: 2px;
  background-color: currentcolor;
  border-radius: 2px;
  transition: transform 0.3s ease-in-out, top 0.3s ease-in-out;
}

.toc-area .toc-area-button .expansion::before {
  transform: rotate(-45deg) translateX(2.5px);
}
.toc-area .toc-area-button .open::before {
  transform: rotate(45deg) translateX(2.5px);
}
.toc-area .toc-area-button .expansion::after {
  transform: rotate(45deg) translateX(-2.5px);
}
.toc-area .toc-area-button .open::after {
  transform: rotate(-45deg) translateX(-2.5px);
}

/* TOC background overlay */
.toc-background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 5;
}
</style>

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