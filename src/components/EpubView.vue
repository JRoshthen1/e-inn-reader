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
import { ref, onMounted, onUnmounted, toRefs, watch, unref, reactive, computed, nextTick } from 'vue'
import ePub from 'epubjs'
import type { Book, Rendition, Contents } from 'epubjs'
import {
  clickListener,
//  swipListener,
  wheelListener,
  keyListener,
  selectListener
} from '../utils/listeners/listener'

interface Props {
  url: string | ArrayBuffer
  location?: any // Current Page number | string | Rendition['location']['start']
  tocChanged?: (toc: Book['navigation']['toc']) => void
  getRendition?: (rendition: Rendition) => void
  handleKeyPress?: () => void
  toggleBubble?: (type: string, rect?: any, text?: string, cfiRange?: string) => void // For custom selection
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
  handleKeyPress,
  toggleBubble,
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

// Create reactive state for tracking loading states
const loadingState = reactive({
  bookInitialized: false,
  bookReady: false,
  renditionCreated: false,
  firstContentDisplayed: false,
  locationApplied: false
})

// Computed property to determine if we're ready to apply location
const readyToApplyLocation = computed(() => {
  return loadingState.bookReady && 
         loadingState.renditionCreated && 
         loadingState.firstContentDisplayed;
})

// Store pending location for restoration
const pendingLocation = ref<string | null>(null)
const isFirstRender = ref(true)

const initBook = async () => {
  if (book) book.destroy()
  
  // Reset loading states
  loadingState.bookInitialized = false
  loadingState.bookReady = false
  loadingState.renditionCreated = false
  loadingState.firstContentDisplayed = false
  loadingState.locationApplied = false
  isFirstRender.value = true
  
  if (url.value) {
    try {
      book = ePub(unref(url.value), epubInitOptions)
      loadingState.bookInitialized = true
      
      // Set pending location if provided in props
      if (location.value && typeof location.value === 'string' && location.value.includes('epubcfi')) {
        //console.log("Storing pending location:", location.value)
        pendingLocation.value = location.value
      }
      
      book.ready.then(() => {
        loadingState.bookReady = true
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
    
    loadingState.renditionCreated = true
    
    if (rendition && book) {
      // Fix spine handling for better navigation
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
          let i = 0
          let spineItem = book!.spine.get(i)
          // Iterate through spine items until we find a match or reach the end
          while (spineItem) {
            if (spineItem.href === target || 
                spineItem.href.endsWith(target)) {
              return spineItem
            }
            i++
            spineItem = book!.spine.get(i)
          }
        }
        return t
      }
    }
    
    registerEvents()
    getRendition && getRendition(rendition)
    
    // Always start with default content
    displayFallback()
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
    rendition.on('rendered', (section, iframe) => {
      // Focus the iframe
      iframe?.iframe?.contentWindow.focus()
      
      // Register interaction listeners
      if (!epubOptions?.flow?.includes('scrolled')) {
        wheelListener(iframe.document, flipPage)
      }
      //swipListener(iframe.document, flipPage)
      keyListener(iframe.document, flipPage)      
      selectListener(iframe.document, rendition, toggleBubble)

      // Mark first content as displayed for location restoration
      if (!loadingState.firstContentDisplayed) {
        loadingState.firstContentDisplayed = true
      }
    })
    
    // Location change tracking
    rendition.on('locationChanged', onLocationChange)
    
    rendition.on('relocated', (location: any) => {
    //  console.log('Book relocated to:', location)
    })
    
    rendition.on('displayError', (err: any) => {
      console.error('Display error:', err)
    })
    
    if (handleKeyPress) {
      rendition.on('keypress', handleKeyPress)
    }
  }
}

// Function to apply saved location
const applyPendingLocation = () => {
  if (!rendition || !pendingLocation.value) return  
  //console.log("Applying pending location:", pendingLocation.value)
  try {
    rendition.display(pendingLocation.value).then(() => {
      //console.log("Location applied successfully")
      loadingState.locationApplied = true
      pendingLocation.value = null
    }).catch(err => {
      console.error('Error displaying location:', err)
      pendingLocation.value = null
    })
  } catch (error) {
    console.error('Error applying location:', error)
    pendingLocation.value = null
  }
}

const onLocationChange = (loc: Rendition['location']) => {
  // Skip the event during the initial location restoration
  if (isFirstRender.value && pendingLocation.value) {
    isFirstRender.value = false
    return
  }
  
  if (!loc || !loc.start) return
  
  const newLocation = loc.start
  //console.log('Location changed to:', newLocation)
  
  if (location?.value !== newLocation) {
    emit('update:location', newLocation)
  }
}

// Watch for changes in readyToApplyLocation
watch(readyToApplyLocation, (isReady) => {
  if (isReady && pendingLocation.value && !loadingState.locationApplied) {
    // Use nextTick to ensure DOM is updated
    nextTick(() => {
      applyPendingLocation()
    })
  }
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

const setExactLocation = (cfi: string) => {
  if (!rendition) return
  
  console.log('Setting exact location:', cfi)
  
  rendition.display(cfi).catch(err => {
    console.error('Error setting exact location:', err)
  })
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
  setExactLocation,
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
  touch-action: manipulation;
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