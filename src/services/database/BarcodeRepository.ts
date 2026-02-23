/**
 * BarcodeRepository - Data access layer for Barcode entity
 *
 * @module services/database/BarcodeRepository
 */

import * as SQLite from 'expo-sqlite';
import { ScannedBarcode, CreateBarcodeInput, BarcodeType } from '@/types/Barcode';

/**
 * Query options for findAll method
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Field to order by */
  orderBy?: 'scanned_at' | 'type';
  /** Sort order */
  order?: 'ASC' | 'DESC';
  /** Filter by barcode type */
  typeFilter?: BarcodeType;
}

/**
 * Repository for managing ScannedBarcode entities in SQLite database
 *
 * Provides CRUD operations and query methods for barcodes
 *
 * @example
 * ```typescript
 * const db = DatabaseService.getInstance().getDatabase();
 * const repo = new BarcodeRepository(db);
 *
 * const barcode = await repo.save({
 *   type: 'QR',
 *   data: 'https://example.com'
 * });
 * ```
 */
export class BarcodeRepository {
  /**
   * Creates a new BarcodeRepository instance
   *
   * @param {SQLite.SQLiteDatabase} db - Database instance
   */
  constructor(private db: SQLite.SQLiteDatabase) {}

  /**
   * Save a new barcode to the database
   *
   * @param {CreateBarcodeInput} input - Barcode data to save
   * @returns {Promise<ScannedBarcode>} The saved barcode with generated id
   * @throws {Error} If insert fails or barcode cannot be retrieved
   */
  async save(input: CreateBarcodeInput): Promise<ScannedBarcode> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO barcodes (type, data, raw_value) VALUES (?, ?, ?)`,
        [input.type, input.data, input.raw_value ?? null]
      );

      const inserted = await this.db.getFirstAsync<ScannedBarcode>(
        `SELECT * FROM barcodes WHERE id = ?`,
        [result.lastInsertRowId]
      );

      if (!inserted) {
        throw new Error('Failed to retrieve inserted barcode');
      }

      return inserted;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to save barcode:', error);
      throw error;
    }
  }

  /**
   * Find all barcodes with optional pagination and ordering
   *
   * @param {QueryOptions} options - Query options
   * @returns {Promise<ScannedBarcode[]>} Array of barcodes
   */
  async findAll(options: QueryOptions = {}): Promise<ScannedBarcode[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'scanned_at',
      order = 'DESC',
      typeFilter,
    } = options;

    try {
      let query = `SELECT * FROM barcodes`;
      const params: any[] = [];

      if (typeFilter) {
        query += ` WHERE type = ?`;
        params.push(typeFilter);
      }

      query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const barcodes = await this.db.getAllAsync<ScannedBarcode>(query, params);

      return barcodes;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to find all barcodes:', error);
      throw error;
    }
  }

  /**
   * Find a barcode by ID
   *
   * @param {number} id - Barcode ID
   * @returns {Promise<ScannedBarcode | null>} Barcode if found, null otherwise
   */
  async findById(id: number): Promise<ScannedBarcode | null> {
    try {
      const barcode = await this.db.getFirstAsync<ScannedBarcode>(
        `SELECT * FROM barcodes WHERE id = ?`,
        [id]
      );

      return barcode || null;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to find barcode by id:', error);
      throw error;
    }
  }

  /**
   * Find barcodes by type
   *
   * @param {BarcodeType} type - Barcode type
   * @returns {Promise<ScannedBarcode[]>} Array of barcodes
   */
  async findByType(type: BarcodeType): Promise<ScannedBarcode[]> {
    try {
      const barcodes = await this.db.getAllAsync<ScannedBarcode>(
        `SELECT * FROM barcodes WHERE type = ? ORDER BY scanned_at DESC`,
        [type]
      );

      return barcodes;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to find barcodes by type:', error);
      throw error;
    }
  }

  /**
   * Find barcodes by data
   *
   * @param {string} data - Barcode data
   * @returns {Promise<ScannedBarcode[]>} Array of barcodes
   */
  async findByData(data: string): Promise<ScannedBarcode[]> {
    try {
      const barcodes = await this.db.getAllAsync<ScannedBarcode>(
        `SELECT * FROM barcodes WHERE data = ? ORDER BY scanned_at DESC`,
        [data]
      );

      return barcodes;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to find barcodes by data:', error);
      throw error;
    }
  }

  /**
   * Get total count of barcodes
   *
   * @returns {Promise<number>} Total number of barcodes
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM barcodes`
      );

      return result?.count || 0;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to count barcodes:', error);
      return 0;
    }
  }

  /**
   * Get count of barcodes grouped by type
   *
   * @returns {Promise<Record<BarcodeType, number>>} Count by barcode type
   */
  async countByType(): Promise<Record<BarcodeType, number>> {
    try {
      const results = await this.db.getAllAsync<{ type: BarcodeType; count: number }>(
        `SELECT type, COUNT(*) as count FROM barcodes GROUP BY type`
      );

      return results.reduce((acc, row) => {
        acc[row.type] = row.count;
        return acc;
      }, {} as Record<BarcodeType, number>);
    } catch (error) {
      console.error('[BarcodeRepository] Failed to count by type:', error);
      return {} as Record<BarcodeType, number>;
    }
  }

  /**
   * Delete a barcode by ID
   *
   * @param {number} id - Barcode ID
   * @returns {Promise<boolean>} True if barcode was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.runAsync(
        `DELETE FROM barcodes WHERE id = ?`,
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to delete barcode:', error);
      throw error;
    }
  }

  /**
   * Delete all barcodes
   *
   * @returns {Promise<number>} Number of barcodes deleted
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await this.db.runAsync(`DELETE FROM barcodes`);
      return result.changes;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to delete all barcodes:', error);
      throw error;
    }
  }

  /**
   * Delete duplicate barcodes (keep only the most recent scan for each unique data)
   *
   * @returns {Promise<number>} Number of duplicate barcodes deleted
   */
  async deleteDuplicates(): Promise<number> {
    try {
      const result = await this.db.runAsync(`
        DELETE FROM barcodes
        WHERE id NOT IN (
          SELECT MAX(id)
          FROM barcodes
          GROUP BY data
        )
      `);

      return result.changes;
    } catch (error) {
      console.error('[BarcodeRepository] Failed to delete duplicates:', error);
      throw error;
    }
  }
}
