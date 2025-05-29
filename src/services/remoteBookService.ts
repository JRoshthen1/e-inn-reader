// src/services/remoteBookService.ts
import { type EpubFile } from '../types/epubFile';

export class RemoteBookService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Fetch list of available EPUB files from the API
   */
  async fetchEpubList(): Promise<EpubFile[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/epub-library`);
      if (!response.ok) {
        throw new Error(`Failed to fetch library data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return (data.epubs || []).map((book: any) => ({
        ...book,
        id: `remote-${book.id}`,
        isRemote: true,
        isLocal: false,
        isImported: true,
      }));
    } catch (err) {
      console.error('Error fetching EPUB list:', err);
      throw err;
    }
  }
  
  /**
   * Download a remote book
   */
  async downloadBook(book: EpubFile): Promise<Blob> {
    try {
      // Construct URL for the book
      const bookUrl = `${this.apiBaseUrl}/epub/${book.originalId || book.id.replace('remote-', '')}/${book.filename}`;
      
      // Fetch the EPUB file
      const response = await fetch(bookUrl);
      if (!response.ok) {
        throw new Error(`Failed to download the book: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (err) {
      console.error('Error downloading book:', err);
      throw err;
    }
  }
}