import { ref, type Ref, nextTick } from 'vue';
import type { Annotation, PendingAnnotation, AnnotationFormData } from '../types/annotations';
import type Rendition from 'epubjs/types/rendition';

export function useAnnotations(
  rendition: Ref<Rendition | null>,
  currentHref: Ref<string | number | null>,
  accentColor: Ref<string>
) {
  const savedAnnotations = ref<Annotation[]>([]);
  const pendingAnnotation = ref<PendingAnnotation | null>(null);
  const showAnnotationModal = ref<boolean>(false);
  const showAnnotationsPanel = ref<boolean>(false);
  const annotationName = ref<string>('');
  const annotationNote = ref<string>('');
  const editingAnnotation = ref<Annotation | null>(null);
  const currentBookId = ref<string>('');
  const hasTextSelection = ref<boolean>(false);

  // Device detection
  const isMobileDevice = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);

  // Storage key helper
  const getAnnotationStorageKey = (bookId: string): string => {
    return `epub-annotations-${bookId}`;
  };

  // Load annotations from storage
  const loadAnnotations = (bookId: string): void => {
    try {
      currentBookId.value = bookId;
      const storageKey = getAnnotationStorageKey(bookId);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsedAnnotations: Annotation[] = JSON.parse(stored);
        savedAnnotations.value = parsedAnnotations.sort((a, b) => b.createdAt - a.createdAt);
      } else {
        savedAnnotations.value = [];
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      savedAnnotations.value = [];
    }
  };

  const saveAnnotationsToStorage = (bookId: string): void => {
    try {
      const storageKey = getAnnotationStorageKey(bookId);
      localStorage.setItem(storageKey, JSON.stringify(savedAnnotations.value));
    } catch (error) {
      console.error('Error saving annotations:', error);
    }
  };

  const generateAnnotationId = (): string => {
    return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      }, 1000);
    } catch (error) {
      console.error('Error applying annotations:', error);
    }
  };

  // Simple toggle selection bubble
  const toggleSelectionBubble = (type: string, rect: any, text: string, cfiRange: string): void => {
    if (type === 'selected' && text && text.length > 0) {
      hasTextSelection.value = true;
      
      pendingAnnotation.value = {
        cfiRange,
        text,
        contents: rendition.value?.getContents() || null
      };
      
      // Reset form fields
      annotationName.value = '';
      annotationNote.value = '';
      editingAnnotation.value = null;
      
    } else if (type === 'cleared') {
      hasTextSelection.value = false;
      pendingAnnotation.value = null;
    }
  };

  const createAnnotationFromSelection = (): void => {
    console.log('Creating annotation from selection...');
    if (pendingAnnotation.value) {
      showAnnotationModal.value = true;
    } else {
      console.warn('No pending annotation to create');
    }
  };

  // Handle annotation save from modal
  const handleAnnotationSave = (formData?: AnnotationFormData): void => {
    const bookId = currentBookId.value;
    
    if (!pendingAnnotation.value || !bookId || !formData) {
      console.error('Missing data for annotation save:', { 
        pendingAnnotation: !!pendingAnnotation.value, 
        bookId: !!bookId, 
        formData: !!formData 
      });
      return;
    }
    
    try {
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
          console.log('Updated existing annotation');
        }
      } else {
        // Create new annotation
        const annotation: Annotation = {
          id: generateAnnotationId(),
          bookId: bookId,
          cfiRange: pendingAnnotation.value.cfiRange,
          text: pendingAnnotation.value.text,
          name: formData.name,
          note: formData.note || undefined,
          createdAt: now,
          updatedAt: now,
          chapter: currentHref.value?.toString()
        };

        savedAnnotations.value.unshift(annotation);
        console.log('Created new annotation:', annotation.name);
        
        // Apply visual highlight only if it's a real CFI
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
            console.warn('Could not apply highlight immediately:', error);
          }
      }
      
      saveAnnotationsToStorage(bookId);
      closeAnnotationModal();
      
      // Show annotations panel after creating new annotation
      if (!editingAnnotation.value) {
        showAnnotationsPanel.value = true;
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
  };

  const closeAnnotationModal = (): void => {
    showAnnotationModal.value = false;
    pendingAnnotation.value = null;
    annotationName.value = '';
    annotationNote.value = '';
    editingAnnotation.value = null;
    hasTextSelection.value = false;
  };

  const goToAnnotation = (cfiRange: string): void => {
    if (rendition.value) {
      rendition.value.display(cfiRange);
    }
  };

  const editAnnotation = (annotation: Annotation): void => {
    editingAnnotation.value = annotation;
    annotationName.value = annotation.name;
    annotationNote.value = annotation.note || '';
    
    pendingAnnotation.value = {
      cfiRange: annotation.cfiRange,
      text: annotation.text,
      contents: null as any
    };
    
    showAnnotationModal.value = true;
  };

  const deleteAnnotation = (annotationId: string, bookId?: string): void => {
    const actualBookId = bookId || currentBookId.value;
    
    if (confirm('Are you sure you want to delete this annotation?')) {
      const index = savedAnnotations.value.findIndex(a => a.id === annotationId);
      if (index !== -1) {
        const annotation = savedAnnotations.value[index];
        
        try {
          rendition.value?.annotations.remove(annotation.cfiRange, 'saved-annotation');
        } catch (error) {
          console.warn('Could not remove highlight:', error);
        }
        
        savedAnnotations.value.splice(index, 1);
        saveAnnotationsToStorage(actualBookId);
        console.log('Deleted annotation:', annotation.name);
      }
    }
  };

  const toggleAnnotationsPanel = (): void => {
    showAnnotationsPanel.value = !showAnnotationsPanel.value;
  };

  return {
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
    createAnnotationFromSelection,
    handleAnnotationSave,
    closeAnnotationModal,
    goToAnnotation,
    editAnnotation,
    deleteAnnotation,
    toggleAnnotationsPanel,
  };
}