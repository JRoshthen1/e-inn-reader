// src/utils/listeners/selectListener.js

/**
 * Enhanced selection listener with touch support
 * @param {Document} document - The document object to add event
 * @param {Object} rendition - The EPUBJS rendition
 * @param {Function} fn - The listener function
 */
export default function selectListener(document, rendition, fn) {
  // Track touch selection state
  let touchStarted = false;
  let touchSelection = false;
  let touchStartTime = 0;
  const LONG_PRESS_DURATION = 500; // ms
  const TOUCH_MOVE_THRESHOLD = 10; // pixels
  let startX = 0;
  let startY = 0;

  // Check if we're on a mobile device
  const isMobileDevice = () => {
    return (('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0));
  };
  
  // Check if we're on iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // Clear selection handler
  const clearSelection = () => {
    if (document.getSelection) {
      document.getSelection().removeAllRanges();
    }
    fn('cleared');
  };

  // Process text selection
  const processSelection = (e) => {
    if (e.ignore) return;
    e.ignore = true;

    const selection = document.getSelection();
    const text = selection.toString();

    if (text === '') return;
    
    try {
      const range = selection.getRangeAt(0);
      const [contents] = rendition.getContents();
      const cfiRange = contents.cfiFromRange(range);

      const SelectionReact = range.getBoundingClientRect();
      const viewRect = rendition.manager.container.getBoundingClientRect();

      let react = {
        left: `${
          viewRect.x + SelectionReact.x - (rendition.manager.scrollLeft || 0)
        }px`,
        top: `${viewRect.y + SelectionReact.y}px`,
        width: `${SelectionReact.width}px`,
        height: `${SelectionReact.height}px`,
      };
      
      fn('selected', react, text, cfiRange);
    } catch (error) {
      console.error('Error processing selection:', error);
    }
  };

  // Mouse events for desktop
  document.addEventListener('mousedown', clearSelection);

  document.addEventListener('mouseup', (e) => {
    processSelection(e);
  });

  // Only add touch events if we're on a touch device
  if (isMobileDevice()) {
    // Touch events for mobile
    document.addEventListener('touchstart', (e) => {
      touchStarted = true;
      touchSelection = false;
      touchStartTime = Date.now();
      
      // Store start position for determining if it's a tap or selection attempt
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!touchStarted) return;
      
      // Check if this might be a selection attempt (not just a tap)
      if (e.touches && e.touches[0]) {
        const moveX = Math.abs(e.touches[0].clientX - startX);
        const moveY = Math.abs(e.touches[0].clientY - startY);
        
        // If user has moved finger more than threshold, might be trying to select
        if (moveX > TOUCH_MOVE_THRESHOLD || moveY > TOUCH_MOVE_THRESHOLD) {
          touchSelection = true;
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!touchStarted) return;
      touchStarted = false;
      
      const touchDuration = Date.now() - touchStartTime;
      
      // Check if it was a long press or a deliberate selection movement
      if (touchDuration > LONG_PRESS_DURATION || touchSelection) {
        // Delay processing to allow the browser to complete the selection
        setTimeout(() => {
          processSelection(e);
        }, 50);
      } else {
        // It was a quick tap, clear selection
        clearSelection();
      }
    });

    // Handle context menu long press on mobile 
    document.addEventListener('contextmenu', (e) => {
      // This event fires on long-press on many mobile browsers
      // Prevent the default context menu
      if (isMobileDevice()) {
        e.preventDefault();
      }
      
      // Delay to let the browser create the selection
      setTimeout(() => {
        processSelection(e);
      }, 50);
    });
    
    // Add specific handling for iOS
    if (isIOS()) {
      // iOS sometimes needs additional help with text selection
      document.addEventListener('selectionchange', () => {
        // Only process if we're in a touch selection operation
        if (touchSelection || (Date.now() - touchStartTime) > LONG_PRESS_DURATION) {
          // Delay to let selection complete
          setTimeout(() => {
            const selection = document.getSelection();
            if (selection && selection.toString().length > 0) {
              const e = { ignore: false };
              processSelection(e);
            }
          }, 100);
        }
      });
    }
  }
}