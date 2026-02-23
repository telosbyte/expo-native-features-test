/**
 * PhotoRepository - Data access layer for Photo entity
 *
 * @module services/database/PhotoRepository
 */

import * as SQLite from 'expo-sqlite';
import { Photo, CreatePhotoInput } from '@/types/Photo';

/**
 * Query options for findAll method
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Field to order by */
  orderBy?: 'created_at' | 'file_size';
  /** Sort order */
  order?: 'ASC' | 'DESC';
}

/**
 * Repository for managing Photo entities in SQLite database
 *
 * Provides CRUD operations and query methods for photos
 *
 * @example
 * ```typescript
 * const db = DatabaseService.getInstance().getDatabase();
 * const repo = new PhotoRepository(db);
 *
 * const photo = await repo.save({
 *   uri: 'file:///path/to/photo.jpg',
 *   width: 1920,
 *   height: 1080
 * });
 * ```
 */
export class PhotoRepository {
  /**
   * Creates a new PhotoRepository instance
   *
   * @param {SQLite.SQLiteDatabase} db - Database instance
   */
  constructor(private db: SQLite.SQLiteDatabase) {}

  /**
   * Save a new photo to the database
   *
   * @param {CreatePhotoInput} input - Photo data to save
   * @returns {Promise<Photo>} The saved photo with generated id
   * @throws {Error} If insert fails or photo cannot be retrieved
   */
  async save(input: CreatePhotoInput): Promise<Photo> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO photos (uri, file_size, width, height) VALUES (?, ?, ?, ?)`,
        [input.uri, input.file_size ?? null, input.width ?? null, input.height ?? null]
      );

      const inserted = await this.db.getFirstAsync<Photo>(
        `SELECT * FROM photos WHERE id = ?`,
        [result.lastInsertRowId]
      );

      if (!inserted) {
        throw new Error('Failed to retrieve inserted photo');
      }

      return inserted;
    } catch (error) {
      console.error('[PhotoRepository] Failed to save photo:', error);
      throw error;
    }
  }

  /**
   * Find all photos with optional pagination and ordering
   *
   * @param {QueryOptions} options - Query options
   * @returns {Promise<Photo[]>} Array of photos
   */
  async findAll(options: QueryOptions = {}): Promise<Photo[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC',
    } = options;

    try {
      const photos = await this.db.getAllAsync<Photo>(
        `SELECT * FROM photos ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`,
        [limit, offset]
      );

      return photos;
    } catch (error) {
      console.error('[PhotoRepository] Failed to find all photos:', error);
      throw error;
    }
  }

  /**
   * Find a photo by ID
   *
   * @param {number} id - Photo ID
   * @returns {Promise<Photo | null>} Photo if found, null otherwise
   */
  async findById(id: number): Promise<Photo | null> {
    try {
      const photo = await this.db.getFirstAsync<Photo>(
        `SELECT * FROM photos WHERE id = ?`,
        [id]
      );

      return photo || null;
    } catch (error) {
      console.error('[PhotoRepository] Failed to find photo by id:', error);
      throw error;
    }
  }

  /**
   * Delete a photo by ID
   *
   * @param {number} id - Photo ID
   * @returns {Promise<boolean>} True if photo was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.runAsync(
        `DELETE FROM photos WHERE id = ?`,
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[PhotoRepository] Failed to delete photo:', error);
      throw error;
    }
  }

  /**
   * Get total count of photos
   *
   * @returns {Promise<number>} Total number of photos
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM photos`
      );

      return result?.count || 0;
    } catch (error) {
      console.error('[PhotoRepository] Failed to count photos:', error);
      return 0;
    }
  }

  /**
   * Delete all photos
   *
   * @returns {Promise<number>} Number of photos deleted
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await this.db.runAsync(`DELETE FROM photos`);
      return result.changes;
    } catch (error) {
      console.error('[PhotoRepository] Failed to delete all photos:', error);
      throw error;
    }
  }
}
