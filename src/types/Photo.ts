/**
 * Photo entity types for camera capture functionality
 *
 * @module types/Photo
 */

/**
 * Photo entity representing a captured photo stored in the database
 */
export interface Photo {
  /** Unique identifier */
  id: number;
  /** File URI (e.g., file:///path/to/image.jpg) */
  uri: string;
  /** ISO 8601 timestamp when photo was captured */
  created_at: string;
  /** File size in bytes */
  file_size?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/**
 * Input type for creating a new photo record
 */
export interface CreatePhotoInput {
  /** File URI (e.g., file:///path/to/image.jpg) */
  uri: string;
  /** File size in bytes */
  file_size?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/**
 * Metadata extracted from captured photo
 */
export interface PhotoMetadata {
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** File size in bytes */
  file_size?: number;
}
