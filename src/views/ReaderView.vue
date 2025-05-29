<!-- ReaderView.vue -->
<template>
  <div class="reader-container">
      <div 
        class="reader-area" 
        :class="{ 
          slideRight: expandedToc, 
          slideLeft: stylesModalOpen 
        }"
      >
      <!-- <button class="back-btn" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button> -->
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

      <StylesButton 
        :is-open="stylesModalOpen" 
        @toggle="toggleStylesModal" 
      />

      <div v-if="loading" class="loading">
        {{ t("reader.loading") }}
      </div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
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
      <!-- TOC Background Overlay -->
      <div v-if="expandedToc" class="toc-background" @click="toggleToc"></div>
    </div>

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
  ref,
  reactive,
  onMounted,
  onUnmounted,
  toRefs,
  h,
  getCurrentInstance,
  Transition,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../i18n/usei18n";
import StylesModal from "../components/StylesModal.vue";
import StylesButton from '../components/StylesButton.vue'
import { useStyles } from "../composables/useStyles";
import { loadBookFromIndexedDB, formatFilename } from "../utils/utils";
import type { RenditionTheme } from "../types/styles";
import EpubView from "../components/EpubView.vue";
import { type EpubFile } from "../types/epubFile";

// NavItem interface
interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems: Array<NavItem>;
  parent?: string;
  expansion: boolean;
}

// TocComponent definition - Using setup function within script setup
const TocComponent = (props: {
  toc: Array<NavItem>;
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
            // Expansion indicator
            item.subitems &&
              item.subitems.length > 0 &&
              renderH("div", {
                class: `${item.expansion ? "open" : ""} expansion`,
              }),
          ]
        ),
        // Nested TOC
        item.subitems &&
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

// Setup and state management
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const loading = ref<boolean>(true);
const error = ref<string | null>(null);
const bookData = ref<ArrayBuffer | null>(null);
const bookDataUrl = ref<string | null>(null); // Add this to store URL for comparison
const bookTitle = ref<string>("");
const location = ref<string | null>(null);
const firstRenderDone = ref<boolean>(false);
const showToc = ref<boolean>(true);
const epubRef = ref<InstanceType<typeof EpubView> | null>(null); // Add null type for initialization
const currentHref = ref<string | number | null>(null);

// TOC related state
const bookState = reactive({
  toc: [] as Array<NavItem>,
  expandedToc: false,
});
const { toc, expandedToc } = toRefs(bookState);

const {
  textColor,
  backgroundColor,
  accentColor,
  fontFamily,
  fontSize,
  stylesModalOpen,
  toggleStylesModal,
  rendition,
  setRendition,
} = useStyles();

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
      // Create object URL for XHR comparison
      const blob = new Blob([bookData.value]);
      bookDataUrl.value = URL.createObjectURL(blob);
    } else if (book.data instanceof ArrayBuffer) {
      bookData.value = book.data;
      // Create object URL for XHR comparison
      const blob = new Blob([bookData.value]);
      bookDataUrl.value = URL.createObjectURL(blob);
    } else {
      throw new Error("Book data is in an unsupported format");
    }
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

const getRendition = (renditionObj: any): void => {
  setRendition(renditionObj as RenditionTheme);

  // Track current location for TOC highlighting
  renditionObj.on("relocated", (location: { start: { href: string } }) => {
    currentHref.value = location.start.href;
  });

  // Get book metadata
  const book = renditionObj.book;
  book.ready.then(() => {
    const meta = book.package.metadata;
    if (!bookTitle.value && meta.title) {
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
    expandedToc.value = false;
  }
};

const onTocChange = (tocData: any[]): void => {
  // Convert epubjs NavItem to our NavItem with expansion property
  toc.value = tocData.map((i) => ({ 
    ...i, 
    expansion: false,
    // Ensure subitems is always an array
    subitems: Array.isArray(i.subitems) ? i.subitems.map((s: any) => ({ ...s, expansion: false })) : []
  }));
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
  // You could emit a progress event here if needed
  // emit('progress', Math.floor((e.loaded / e.total) * 100));
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
});

onUnmounted(() => {
  // Clean up object URL to prevent memory leaks
  if (bookDataUrl.value) {
    URL.revokeObjectURL(bookDataUrl.value);
  }
  
  XMLHttpRequest.prototype.open = originalOpen;
  if (expandedToc.value) {
    window.removeEventListener('keydown', handleKeyDown);
  }
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
});
</script>
<style>
.toc-area {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 0 !important;
  width: 256px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 6px 0;
  background-color: var(--background-color) !important;
  border-right: 1px solid var(--divider-color) !important;
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
  border-bottom: 1px solid var(--divider-color) !important;
  color: var(--text-color) !important;
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
  border-left: 3px solid var(--accent-color) !important;
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
</style>

<style scoped>
.container {
  overflow: hidden;
  position: relative;
  height: 100%;
}
.slideRight {
  transform: translateX(256px);
}
.slideLeft {
  transform: translateX(-256px);
}
.reader-area {
  position: relative;
  z-index: 999;
  height: 100%;
  width: 100%;
  background-color: var(--background-color) !important;
  transition: all 0.3s ease-in-out;
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
}
.toc-button {
  left: 6px;
}

.toc-button-bar {
  position: absolute;
  width: 60%;
  background: var(--accent-color) !important;
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
/* loading */
.loading-view {
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  color: var(--accent-color);
  text-align: center;
  margin-top: -0.5em;
}
.reader-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  color: var(--text-color, #000000);
  background-color: var(--background-color, #ffffff);
}
.book-title {
  margin: 0 1rem;
  font-size: 1rem;
  color: var(--text-color, #000000);
  opacity: 0.7;
  left: 50px;
  overflow: hidden;
  position: absolute;
  right: 50px;
  text-align: center;
  text-overflow: ellipsis;
  top: 10px;
  white-space: nowrap;
}
.reader-view {
  transition: all 0.3s ease-in-out;
  overflow: hidden;
}
.loading,
.error {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--accent-color);
  height: 100%;
}
</style>
