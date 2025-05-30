/**
 * Unified touch handler that supports both swipe navigation and text selection
 * @param {Document} document - The document to add event listeners to
 * @param {Object} rendition - The EPUBJS rendition
 * @param {function} navigationFn - Function to call for navigation (swipe)
 * @param {function} selectionFn - Function to call for text selection
 */

type epubEvent = TouchEvent & { ignore?: boolean };
type Direction = 'next' | 'prev' | 'up' | 'down';

export default function touchHandler(
  document: Document,
  rendition: any,
  navigationFn: (direction: Direction) => void,
  selectionFn: (type: string, rect?: any, text?: string, cfiRange?: string) => void
) {
  // State tracking
  let touchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    isLongPress: false,
    isSelectionAttempt: false,
    lastTapTime: 0,
    moveCount: 0,
    lastMoveX: 0,
    lastMoveY: 0
  };

  // Constants for gesture detection
  const SWIPE = {
    threshold: 50,        // Min distance for swipe
    restraint: 200,       // Max perpendicular movement
    allowedTime: 500      // Max time for swipe
  };
  
  const SELECTION = {
    longPressDuration: 500, // Time for long press
    moveThreshold: 10,      // Movement to trigger selection mode
    selectionDelay: 50      // Delay to process selection after touch
  };

  // Clear selection
  const clearSelection = () => {
    if (document.getSelection) {
      document.getSelection()?.removeAllRanges();
    }
    selectionFn('cleared');
  };

  // Process text selection
  const processSelection = () => {
    const selection = document.getSelection();
    if (!selection) return;
    
    const text = selection.toString();
    if (text === '') return;
    
    try {
      const range = selection.getRangeAt(0);
      const [contents] = rendition.getContents();
      const cfiRange = contents.cfiFromRange(range);

      const selectionRect = range.getBoundingClientRect();
      const viewRect = rendition.manager.container.getBoundingClientRect();

      const rect = {
        left: `${
          viewRect.x + selectionRect.x - (rendition.manager.scrollLeft || 0)
        }px`,
        top: `${viewRect.y + selectionRect.y}px`,
        width: `${selectionRect.width}px`,
        height: `${selectionRect.height}px`,
      };
      
      selectionFn('selected', rect, text, cfiRange);
    } catch (error) {
      console.error('Error processing selection:', error);
    }
  };

  // Check if device is iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  };

  // Device-specific adjustments
  if (isIOS()) {
    SELECTION.longPressDuration = 400;
    SELECTION.selectionDelay = 100;
  }

  // Touch start event
  document.addEventListener('touchstart', (e: epubEvent) => {
    if (e.ignore) return;
    e.ignore = true;

    // Get initial touch position
    if (e.touches && e.touches[0]) {
      touchState.startX = e.touches[0].pageX;
      touchState.startY = e.touches[0].pageY;
      touchState.lastMoveX = touchState.startX;
      touchState.lastMoveY = touchState.startY;
      touchState.startTime = Date.now();
      touchState.isLongPress = false;
      touchState.isSelectionAttempt = false;
      touchState.moveCount = 0;
      
      // Handle long press with timeout
      const longPressTimeout = setTimeout(() => {
        // If finger hasn't moved much, trigger long press
        const currentX = touchState.lastMoveX;
        const currentY = touchState.lastMoveY;
        const moveX = Math.abs(currentX - touchState.startX);
        const moveY = Math.abs(currentY - touchState.startY);
        
        if (moveX < SELECTION.moveThreshold && moveY < SELECTION.moveThreshold) {
          touchState.isLongPress = true;
        }
      }, SELECTION.longPressDuration);
      
      // Store the timeout in a property to clear it if needed
      (document as any)._longPressTimeout = longPressTimeout;
    }
  }, { passive: true });

  // Touch move event
  document.addEventListener('touchmove', (e: epubEvent) => {
    if (e.ignore) return;
    e.ignore = true;
    
    if (e.touches && e.touches[0]) {
      touchState.lastMoveX = e.touches[0].pageX;
      touchState.lastMoveY = e.touches[0].pageY;
      touchState.moveCount++;
      
      // Calculate movement
      const moveX = Math.abs(touchState.lastMoveX - touchState.startX);
      const moveY = Math.abs(touchState.lastMoveY - touchState.startY);
      
      // Determine if this might be a selection attempt
      if (moveX > SELECTION.moveThreshold || moveY > SELECTION.moveThreshold) {
        // Clear long press timeout if significant movement
        if ((document as any)._longPressTimeout) {
          clearTimeout((document as any)._longPressTimeout);
          (document as any)._longPressTimeout = null;
        }
        
        // If moved a lot horizontally relative to vertically, might be a swipe
        // If moved a lot vertically or in a pattern, might be selection
        if ((moveY > moveX * 1.5) || touchState.moveCount > 5) {
          touchState.isSelectionAttempt = true;
        }
      }
    }
  }, { passive: true });

  // Touch end event
  document.addEventListener('touchend', (e: epubEvent) => {
    if (e.ignore) return;
    e.ignore = true;
    
    // Clear long press timeout if it's still active
    if ((document as any)._longPressTimeout) {
      clearTimeout((document as any)._longPressTimeout);
      (document as any)._longPressTimeout = null;
    }
    
    // Calculate touch stats
    const touchEndTime = Date.now();
    const elapsedTime = touchEndTime - touchState.startTime;
    
    // Get distance traveled
    const distX = e.changedTouches[0].pageX - touchState.startX;
    const distY = e.changedTouches[0].pageY - touchState.startY;
    
    // Handle selection if it was a long press or selection attempt
    if (touchState.isLongPress || touchState.isSelectionAttempt) {
      // Delay slightly to let the browser finish selection
      setTimeout(() => {
        processSelection();
      }, SELECTION.selectionDelay);
      return;
    }
    
    // Handle swipe if it wasn't a selection attempt
    if (elapsedTime <= SWIPE.allowedTime) {
      // Horizontal swipe
      if (Math.abs(distX) >= SWIPE.threshold && Math.abs(distY) <= SWIPE.restraint) {
        // If dist traveled is negative, it indicates right swipe
        navigationFn(distX < 0 ? 'next' : 'prev');
      }
      // Vertical swipe
      else if (Math.abs(distY) >= SWIPE.threshold && Math.abs(distX) <= SWIPE.restraint) {
        // If dist traveled is negative, it indicates up swipe
        navigationFn(distY < 0 ? 'up' : 'down');
      }
      // Tap - convert to click for regular interaction
      else {
        clearSelection();
        
        // Convert tap to click
        document.dispatchEvent(
          new MouseEvent('click', {
            clientX: touchState.startX,
            clientY: touchState.startY,
          })
        );
      }
    }
  }, { passive: false });

  // Handle context menu (long press on many mobile browsers)
  document.addEventListener('contextmenu', (e) => {
    // Only handle on mobile devices
    if ('ontouchstart' in window) {
      e.preventDefault();
      // Delay to let the browser create the selection
      setTimeout(() => {
        processSelection();
      }, SELECTION.selectionDelay);
    }
  });
  
  // Add specific handling for iOS
  if (isIOS()) {
    // iOS sometimes needs additional help with text selection
    document.addEventListener('selectionchange', () => {
      // Only process if it might be from a touch operation
      if (touchState.isLongPress || touchState.isSelectionAttempt) {
        setTimeout(() => {
          const selection = document.getSelection();
          if (selection && selection.toString().length > 0) {
            processSelection();
          }
        }, SELECTION.selectionDelay);
      }
    });
  }

  // Regular mouse events for desktop
  document.addEventListener('mousedown', clearSelection);

  document.addEventListener('mouseup', () => {
    processSelection();
  });
}