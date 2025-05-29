// src/services/importBookService.ts
import { type EpubFile } from '../types/epubFile';
import { initializeDB, DB_NAME, STORE_NAME } from '../utils/utils';

export class ImportBookService {
  /**
   * Load books from IndexedDB
   */
  async loadLocalBooks(): Promise<EpubFile[]> {
    try {
      const db = await initializeDB();
      
      return new Promise<EpubFile[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const localBooks = request.result.map((book: EpubFile) => ({
            ...book,
            isLocal: true
          }));
          resolve(localBooks);
          db.close();
        };
        
        request.onerror = (event: Event) => {
          console.error('Error loading local books:', (event.target as IDBRequest).error);
          reject(new Error('Failed to load your local books.'));
          db.close();
        };
      });
    } catch (err) {
      console.error('Error accessing IndexedDB:', err);
      return [];
    }
  }
  
  /**
   * Store a book in IndexedDB
   */
  async storeBook(book: EpubFile, blob?: Blob): Promise<string> {
    try {
      const db = await initializeDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Ensure book has a proper local ID
      let bookId = book.id;
      if (!bookId.startsWith('local-') && !bookId.startsWith('import-')) {
        bookId = `local-${book.originalId || book.id}`;
      }
      
      // Prepare the book data for storage
      const bookData: EpubFile = {
        ...book,
        id: bookId,
        originalId: book.originalId || (book.isRemote ? book.id.replace('remote-', '') : book.id),
        isLocal: true,
        data: blob || book.data,
        dateAdded: book.dateAdded || new Date().getTime()
      };
      
      return new Promise<string>((resolve, reject) => {
        const request = store.put(bookData);
        
        request.onsuccess = () => {
          resolve(bookId);
        };
        
        request.onerror = (event: Event) => {
          console.error('Error storing book in IndexedDB:', (event.target as IDBRequest).error);
          reject(new Error('Failed to save the book locally. Please try again.'));
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (err) {
      console.error('Error storing book:', err);
      throw err;
    }
  }
  
  /**
   * Check if a book exists in IndexedDB
   */
  async bookExistsInDB(book: EpubFile): Promise<boolean> {
    try {
      const db = await initializeDB();
      
      // Try to find by different ID formats
      const possibleIds = [
        book.id,
        `local-${book.originalId || book.id.replace('remote-', '')}`,
        `remote-${book.originalId || book.id}`
      ];
      
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      for (const id of possibleIds) {
        const exists = await new Promise<boolean>((resolve) => {
          const request = store.get(id);
          request.onsuccess = () => {
            resolve(!!request.result);
          };
          request.onerror = () => {
            resolve(false);
          };
        });
        
        if (exists) {
          db.close();
          return true;
        }
      }
      
      db.close();
      return false;
    } catch (err) {
      console.error('Error checking if book exists:', err);
      return false;
    }
  }
  
  /**
   * Delete a book from IndexedDB
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      const db = await initializeDB();
      
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(bookId);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = (event: Event) => {
          console.error('Error deleting book from IndexedDB:', (event.target as IDBRequest).error);
          reject(new Error('Failed to delete the book. Please try again.'));
        };
        
        transaction.oncomplete = () => {
          db.close();
        };
      });
    } catch (err) {
      console.error('Error deleting book:', err);
      throw new Error('Failed to delete the book. Please try again.');
    }
  }
  
  /**
   * Import a local file
   */
  async importLocalFile(file: File): Promise<EpubFile> {
    try {
      // Generate a unique ID for the imported book
      const importId = `import-${Date.now()}-${file.name}`;
      
      // Create book metadata
      const bookData: EpubFile = {
        id: importId,
        originalId: importId,
        filename: file.name,
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        size: file.size,
        data: file,
        dateAdded: new Date().getTime(),
        isRemote: false,
        isLocal: true,
        isImported: true,
      };
      
      // Store the book
      await this.storeBook(bookData);
      
      return bookData;
    } catch (err) {
      console.error('Error importing file:', err);
      throw err;
    }
  }
}