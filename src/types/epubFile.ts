// src/types/epubFile.ts
export interface EpubFile {
  id: string;                      // Unique identifier (prefixed with 'local-', 'remote-', or 'import-')
  originalId?: string;             // Original ID from the server, if applicable
  filename: string;                // Filename with extension
  title: string;                   // Display title (typically filename without extension)
  path?: string;                   // File path on the server (if remote)
  size?: number;                   // File size in bytes
  url?: string;                    // URL to download the book (if remote)
  data?: Blob | File | ArrayBuffer;// Actual binary data
  dateAdded?: number;              // Timestamp when added to library
  isLocal?: boolean;               // Flag for books in local storage
  isRemote?: boolean;              // Flag for books from remote API
  isImported?: boolean;            // Flag for books imported from user's filesystem
}