// src/types/annotations.ts
import type Contents from 'epubjs/types/contents';

export interface Annotation {
  id: string;
  bookId: string;
  cfiRange: string;
  text: string;
  name: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  chapter?: string;
}

export interface PendingAnnotation {
  cfiRange: string;
  text: string;
  contents: Contents;
}

export interface AnnotationFormData {
  name: string;
  note: string;
}