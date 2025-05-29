<template>
  <div class="reader">
    <div class="viewHolder">
      <div ref="viewer" id="viewer" v-show="isLoaded"></div>
      <div v-if="!isLoaded">
        <slot name="loadingView"> </slot>
      </div>
    </div>
      <button
        class="arrow pre"
        @click="prevPage"
        :disabled="location?.atStart"
      >
        ‹
      </button>
      <button
        class="arrow next"
        @click="nextPage"
        :disabled="location?.atEnd"
      >
        ›
      </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRefs, watch, unref } from 'vue'
import ePub from 'epubjs'
import type { Book, Rendition, Contents } from 'epubjs'
import {
  clickListener,
  swipListener,
  wheelListener,
  keyListener,
} from '../utils/listeners/listener'

interface Props {
  url: string | ArrayBuffer
  location?: any // Current Page number | string | Rendition['location']['start']
  tocChanged?: (toc: Book['navigation']['toc']) => void
  getRendition?: (rendition: Rendition) => void
  handleTextSelected?: (cfiRange: string, contents: Contents) => void
  handleKeyPress?: () => void
  epubInitOptions?: Book['settings']
  epubOptions?: Rendition['settings']
}
const props = withDefaults(defineProps<Props>(), {
  epubInitOptions: () => ({}),
  epubOptions: () => ({}),
})

const {
  tocChanged,
  getRendition,
  handleTextSelected,
  handleKeyPress,
  epubInitOptions,
  epubOptions,
} = props
const { url, location } = toRefs(props)

const emit = defineEmits<{
  (e: 'update:location', location: Props['location']): void
}>()

const viewer = ref<HTMLDivElement | null>(null)
const toc = ref<Book['navigation']['toc']>([])
const isLoaded = ref(false)
let book: null | Book = null,
  rendition: null | Rendition = null

 const initBook = async () => {
   if (book) book.destroy()
   if (url.value) {
     try {
       book = ePub(unref(url.value), epubInitOptions)
       
       book!.ready.then(() => {
         return book!.loaded.navigation
       }).then(({ toc: _toc }) => {
         isLoaded.value = true
         toc.value = _toc
         tocChanged && tocChanged(_toc)
         initReader()
       }).catch(error => {
         console.error('Error loading book navigation:', error)
         // try to continue without navigation
         isLoaded.value = true
         initReader()
       })
     } catch (error) {
       console.error('Error initializing book:', error)
     }
   }
 }

const initReader = () => {
  if (!book) return
  
  try {
    rendition = book!.renderTo(viewer.value as HTMLDivElement, {
      width: '100%',
      height: '100%',
      ...epubOptions,
    })
    if (rendition && book) {
      const spine_get = book.spine.get.bind(book.spine)
      book.spine.get = function(target: any) {
        let t = spine_get(target)
        // Handle relative paths
        if (!t && target && typeof target === 'string' && target.startsWith('../')) {
          target = target.substring(3)
          t = spine_get(target)
        }
        // Try to find by href match
        if (!t && typeof target === 'string') {
          let i = 0;
          let spineItem = book!.spine.get(i);
          // Iterate through spine items until we find a match or reach the end
          while (spineItem) {
            if (spineItem.href === target || 
                spineItem.href.endsWith(target)) {
              return spineItem;
            }
            i++;
            spineItem = book!.spine.get(i);
          }
        }
        return t
      }
    }
    
    registerEvents()
    getRendition && getRendition(rendition)
    
    if (typeof location?.value === 'string') {
      rendition.display(location.value).catch(err => {
        console.error('Error displaying location:', err)
        displayFallback()
      })
    } else if (typeof location?.value === 'number') {
      rendition.display(location.value).catch(err => {
        console.error('Error displaying page number:', err)
        displayFallback()
      })
    } else if (toc.value.length > 0 && toc?.value[0]?.href) {
      rendition.display(toc.value[0].href).catch(err => {
        console.error('Error displaying TOC:', err)
        displayFallback()
      })
    } else {
      displayFallback()
    }
  } catch (error) {
    console.error('Error initializing reader:', error)
  }
}

const displayFallback = () => {
  if (!rendition) return
  // Try to display with empty parameter
  rendition.display().catch(err => {
    console.error('Error with default display:', err)
    try {
      // Use the first() method from the Spine class to get the first section
      const firstSection = book?.spine?.first()
      if (firstSection && firstSection.href) {
        rendition!.display(firstSection.href).catch(finalErr => {
          console.error('Final display error:', finalErr)
        })
      }
    } catch (error) {
      console.error('Error accessing spine:', error)
    }
  })
}

const flipPage = (direction: string) => {
  if (direction === 'next') nextPage()
  else if (direction === 'prev') prevPage()
}

const registerEvents = () => {
  if (rendition) {
    rendition.on('rendered', (e: Event, iframe: any) => {
      iframe?.iframe?.contentWindow.focus()
      // clickListener(iframe?.document, rendition as Rendition, flipPage);
      // selectListener(iframe.document, rendition, toggleBuble);
      if (!epubOptions?.flow?.includes('scrolled'))
        wheelListener(iframe.document, flipPage)
      swipListener(iframe.document, flipPage)
      keyListener(iframe.document, flipPage)
    })
    rendition.on('locationChanged', onLocationChange)
    rendition.on('displayError', (err: any) => {
      console.error('Display error:', err)
    })
    if (handleTextSelected) {
      rendition.on('selected', handleTextSelected)
    }
    if (handleKeyPress) {
      rendition.on('selected', handleKeyPress)
    }
  }
}

const onLocationChange = (loc: Rendition['location']) => {
  const newLocation = loc && loc.start
  if (location?.value !== newLocation) {
    emit('update:location', newLocation)
  }
}

watch(url, () => {
  initBook()
})

const nextPage = () => {
  rendition?.next()
}

const prevPage = () => {
  rendition?.prev()
}

const setLocation = (href: number | string) => {
  if (typeof href === 'string') rendition!.display(href)
  if (typeof href === 'number') rendition!.display(href)
}

onMounted(() => {
  initBook()
})

onUnmounted(() => {
  book?.destroy()
})

defineExpose({
  nextPage,
  prevPage,
  setLocation,
})
</script>

<style scoped>
.reader {
  position: absolute;
  inset: 50px 10px 10px 10px;
}

.viewHolder {
  height: 100%;
  width: 100%;
  position: relative;
}

#viewer {
  height: 100%;
}

.arrow {
  width: 30%;
  outline: none;
  border: none;
  background: none;
  position: absolute;
  bottom: -10px;
  margin-top: -32px;
  font-size: 3rem;
  color: var(--accent-color);
  font-family: arial, sans-serif;
  cursor: pointer;
  user-select: none;
  appearance: none;
  font-weight: bold;
}

.arrow:hover {
  color: #777;
}

.arrow:disabled {
  cursor: not-allowed;
  color: #e2e2e2;
}

.prev {
  left: 1px;
}

.next {
  right: 1px;
}

</style>