// src/utils/utils.ts
import { ref } from 'vue';
import { type EpubFile } from '../types/epubFile';

/**
 * Constants
 */
export const DB_NAME = 'epubLibrary';
export const DB_VERSION = 1;
export const STORE_NAME = 'books';

/**
 * Initialize IndexedDB
 */
export const initializeDB = (): Promise<IDBDatabase> => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onerror = (event: Event) => {
      console.error('IndexedDB initialization error:', (event.target as IDBOpenDBRequest).error);
      reject(new Error('Could not access local storage. Please check your browser settings.'));
    };
  });
};

/**
 * Format a filename to be more readable
 * Removes file extension and replaces underscores/hyphens with spaces
 */
export const formatFilename = (filename: string): string => {
  if (!filename) return '';
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  // Replace underscores and hyphens with spaces
  const formattedName = nameWithoutExt.replace(/[_-]/g, ' ');
  // Capitalize first letter of each word
  return formattedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Create a toast notification system 
 */
export const createToast = () => {
  const toast = ref<{ message: string | null; type: string }>({ message: null, type: 'info' });
  
  const showToast = (message: string, type = 'info', duration = 3000) => {
    toast.value = { message, type };
    setTimeout(() => {
      toast.value.message = null;
    }, duration);
  };
  
  return { toast, showToast };
};

export const loadBookFromIndexedDB = async (bookId: string): Promise<EpubFile> => {
  try {
    const db = await initializeDB();

    return new Promise<EpubFile>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(bookId);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result as EpubFile);
        } else {
          reject(new Error('Book not found in your library.'));
        }
        db.close();
      };

      request.onerror = (event: Event) => {
        console.error('Error loading book from IndexedDB:', (event.target as IDBRequest).error);
        reject(new Error('Failed to load book from your library.'));
        db.close();
      };
    });
  } catch (err) {
    console.error('Error accessing IndexedDB:', err);
    throw err;
  }
};

/**
 * Check if a book exists in IndexedDB
 */
export const checkBookInIndexedDB = async (book: EpubFile): Promise<boolean> => {
  try {
    const db = await initializeDB();
    
    return new Promise<boolean>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      // Handle both imported books and server books
      if (book.isImported) {
        // For imported books, the ID is already the full unique ID
        const request = store.get(book.id.toString());
        
        request.onsuccess = () => {
          resolve(!!request.result);
          db.close();
        };
        
        request.onerror = () => {
          console.error('Error checking imported book in IndexedDB:', request.error);
          resolve(false);
          db.close();
        };
      } else {
        // For server books, construct the ID
        const uniqueId = `${book.id}-${book.filename}`;
        const request = store.get(uniqueId);
        
        request.onsuccess = () => {
          resolve(!!request.result);
          db.close();
        };
        
        request.onerror = () => {
          console.error('Error checking server book in IndexedDB:', request.error);
          resolve(false);
          db.close();
        };
      }
    });
  } catch (err) {
    console.error('Error accessing IndexedDB:', err);
    return false;
  }
};

/**
 * Format a file size in bytes to a human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format a date to a human-readable string
 */
export const formatDate = (date: Date | number): string => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};
