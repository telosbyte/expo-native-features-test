/**
 * FileRepository - Data access layer for UploadedFile entity
 *
 * @module services/database/FileRepository
 */

import * as SQLite from 'expo-sqlite';
import { UploadedFile, CreateFileInput } from '@/types/File';

/**
 * Query options for findAll method
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Field to order by */
  orderBy?: 'uploaded_at' | 'size' | 'name';
  /** Sort order */
  order?: 'ASC' | 'DESC';
  /** MIME type filter (e.g., 'image/*', 'application/pdf') */
  mimeTypeFilter?: string;
}

/**
 * Repository for managing UploadedFile entities in SQLite database
 *
 * Provides CRUD operations and query methods for files
 *
 * @example
 * ```typescript
 * const db = DatabaseService.getInstance().getDatabase();
 * const repo = new FileRepository(db);
 *
 * const file = await repo.save({
 *   name: 'document.pdf',
 *   uri: 'file:///path/to/document.pdf',
 *   mime_type: 'application/pdf',
 *   size: 2048
 * });
 * ```
 */
export class FileRepository {
  /**
   * Creates a new FileRepository instance
   *
   * @param {SQLite.SQLiteDatabase} db - Database instance
   */
  constructor(private db: SQLite.SQLiteDatabase) {}

  /**
   * Save a new file to the database
   *
   * @param {CreateFileInput} input - File data to save
   * @returns {Promise<UploadedFile>} The saved file with generated id
   * @throws {Error} If insert fails or file cannot be retrieved
   */
  async save(input: CreateFileInput): Promise<UploadedFile> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO files (name, uri, mime_type, size) VALUES (?, ?, ?, ?)`,
        [input.name, input.uri, input.mime_type ?? null, input.size]
      );

      const inserted = await this.db.getFirstAsync<UploadedFile>(
        `SELECT * FROM files WHERE id = ?`,
        [result.lastInsertRowId]
      );

      if (!inserted) {
        throw new Error('Failed to retrieve inserted file');
      }

      return inserted;
    } catch (error) {
      console.error('[FileRepository] Failed to save file:', error);
      throw error;
    }
  }

  /**
   * Find all files with optional pagination, ordering, and filtering
   *
   * @param {QueryOptions} options - Query options
   * @returns {Promise<UploadedFile[]>} Array of files
   */
  async findAll(options: QueryOptions = {}): Promise<UploadedFile[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'uploaded_at',
      order = 'DESC',
      mimeTypeFilter,
    } = options;

    try {
      let query = `SELECT * FROM files`;
      const params: any[] = [];

      if (mimeTypeFilter) {
        query += ` WHERE mime_type LIKE ?`;
        // Convert wildcard * to SQL %
        params.push(mimeTypeFilter.replace(/\*/g, '%'));
      }

      query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const files = await this.db.getAllAsync<UploadedFile>(query, params);

      return files;
    } catch (error) {
      console.error('[FileRepository] Failed to find all files:', error);
      throw error;
    }
  }

  /**
   * Find a file by ID
   *
   * @param {number} id - File ID
   * @returns {Promise<UploadedFile | null>} File if found, null otherwise
   */
  async findById(id: number): Promise<UploadedFile | null> {
    try {
      const file = await this.db.getFirstAsync<UploadedFile>(
        `SELECT * FROM files WHERE id = ?`,
        [id]
      );

      return file || null;
    } catch (error) {
      console.error('[FileRepository] Failed to find file by id:', error);
      throw error;
    }
  }

  /**
   * Find files by MIME type pattern
   *
   * @param {string} mimeType - MIME type pattern (e.g., 'image/*', 'application/pdf')
   * @returns {Promise<UploadedFile[]>} Array of matching files
   */
  async findByType(mimeType: string): Promise<UploadedFile[]> {
    try {
      // Convert wildcard * to SQL %
      const pattern = mimeType.replace(/\*/g, '%');

      const files = await this.db.getAllAsync<UploadedFile>(
        `SELECT * FROM files WHERE mime_type LIKE ? ORDER BY uploaded_at DESC`,
        [pattern]
      );

      return files;
    } catch (error) {
      console.error('[FileRepository] Failed to find files by type:', error);
      throw error;
    }
  }

  /**
   * Get total count of files
   *
   * @returns {Promise<number>} Total number of files
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM files`
      );

      return result?.count || 0;
    } catch (error) {
      console.error('[FileRepository] Failed to count files:', error);
      return 0;
    }
  }

  /**
   * Get total size of all files in bytes
   *
   * @returns {Promise<number>} Total size in bytes
   */
  async getTotalSize(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ total: number | null }>(
        `SELECT SUM(size) as total FROM files`
      );

      return result?.total || 0;
    } catch (error) {
      console.error('[FileRepository] Failed to get total size:', error);
      return 0;
    }
  }

  /**
   * Delete a file by ID
   *
   * @param {number} id - File ID
   * @returns {Promise<boolean>} True if file was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.runAsync(
        `DELETE FROM files WHERE id = ?`,
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[FileRepository] Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Delete all files
   *
   * @returns {Promise<number>} Number of files deleted
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await this.db.runAsync(`DELETE FROM files`);
      return result.changes;
    } catch (error) {
      console.error('[FileRepository] Failed to delete all files:', error);
      throw error;
    }
  }
}
