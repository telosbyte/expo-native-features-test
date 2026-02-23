/**
 * File entity types for document/image picker functionality
 *
 * @module types/File
 */

/**
 * UploadedFile entity representing a selected file stored in the database
 */
export interface UploadedFile {
  /** Unique identifier */
  id: number;
  /** File name with extension */
  name: string;
  /** File URI (e.g., file:///path/to/document.pdf) */
  uri: string;
  /** MIME type (e.g., "application/pdf", "image/jpeg") */
  mime_type?: string;
  /** File size in bytes */
  size: number;
  /** ISO 8601 timestamp when file was uploaded/selected */
  uploaded_at: string;
}

/**
 * Input type for creating a new file record
 */
export interface CreateFileInput {
  /** File name with extension */
  name: string;
  /** File URI (e.g., file:///path/to/document.pdf) */
  uri: string;
  /** MIME type (e.g., "application/pdf", "image/jpeg") */
  mime_type?: string;
  /** File size in bytes */
  size: number;
}

/**
 * Selected file metadata from file picker
 */
export interface SelectedFile {
  /** File URI */
  uri: string;
  /** File name with extension */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Last modified timestamp */
  lastModified?: number;
}
