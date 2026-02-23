/**
 * LocationRepository - Data access layer for Location entity
 *
 * @module services/database/LocationRepository
 */

import * as SQLite from 'expo-sqlite';
import { LocationRecord, CreateLocationInput } from '@/types/Location';

/**
 * Query options for findAll method
 */
export interface QueryOptions {
  /** Maximum number of records to return */
  limit?: number;
  /** Number of records to skip */
  offset?: number;
  /** Field to order by */
  orderBy?: 'created_at' | 'accuracy';
  /** Sort order */
  order?: 'ASC' | 'DESC';
  /** Filter by minimum accuracy threshold (meters) */
  minAccuracy?: number;
}

/**
 * Repository for managing LocationRecord entities in SQLite database
 *
 * Provides CRUD operations and query methods for GPS location records
 *
 * @example
 * ```typescript
 * const db = DatabaseService.getInstance().getDatabase();
 * const repo = new LocationRepository(db);
 *
 * const location = await repo.save({
 *   latitude: 37.5665,
 *   longitude: 126.978,
 *   accuracy: 10
 * });
 * ```
 */
export class LocationRepository {
  /**
   * Creates a new LocationRepository instance
   *
   * @param {SQLite.SQLiteDatabase} db - Database instance
   */
  constructor(private db: SQLite.SQLiteDatabase) {}

  /**
   * Save a new location record to the database
   *
   * @param {CreateLocationInput} input - Location data to save
   * @returns {Promise<LocationRecord>} The saved location with generated id
   * @throws {Error} If insert fails or location cannot be retrieved
   */
  async save(input: CreateLocationInput): Promise<LocationRecord> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO locations (latitude, longitude, altitude, accuracy, heading, speed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.latitude,
          input.longitude,
          input.altitude ?? null,
          input.accuracy ?? null,
          input.heading ?? null,
          input.speed ?? null,
        ]
      );

      const inserted = await this.db.getFirstAsync<LocationRecord>(
        `SELECT * FROM locations WHERE id = ?`,
        [result.lastInsertRowId]
      );

      if (!inserted) {
        throw new Error('Failed to retrieve inserted location');
      }

      return inserted;
    } catch (error) {
      console.error('[LocationRepository] Failed to save location:', error);
      throw error;
    }
  }

  /**
   * Find all location records with optional pagination, ordering, and filtering
   *
   * @param {QueryOptions} options - Query options
   * @returns {Promise<LocationRecord[]>} Array of location records
   */
  async findAll(options: QueryOptions = {}): Promise<LocationRecord[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC',
      minAccuracy,
    } = options;

    try {
      let query = `SELECT * FROM locations`;
      const params: any[] = [];

      // Apply accuracy filter if specified
      if (minAccuracy !== undefined) {
        query += ` WHERE accuracy <= ?`;
        params.push(minAccuracy);
      }

      // Add ordering
      query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const locations = await this.db.getAllAsync<LocationRecord>(query, params);

      return locations;
    } catch (error) {
      console.error('[LocationRepository] Failed to find all locations:', error);
      throw error;
    }
  }

  /**
   * Find a location record by ID
   *
   * @param {number} id - Location ID
   * @returns {Promise<LocationRecord | null>} Location if found, null otherwise
   */
  async findById(id: number): Promise<LocationRecord | null> {
    try {
      const location = await this.db.getFirstAsync<LocationRecord>(
        `SELECT * FROM locations WHERE id = ?`,
        [id]
      );

      return location || null;
    } catch (error) {
      console.error('[LocationRepository] Failed to find location by id:', error);
      throw error;
    }
  }

  /**
   * Find recent location records ordered by creation date
   *
   * @param {number} limit - Maximum number of records to return (default: 10)
   * @returns {Promise<LocationRecord[]>} Array of recent location records
   */
  async findRecent(limit: number = 10): Promise<LocationRecord[]> {
    try {
      const locations = await this.db.getAllAsync<LocationRecord>(
        `SELECT * FROM locations ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );

      return locations;
    } catch (error) {
      console.error('[LocationRepository] Failed to find recent locations:', error);
      throw error;
    }
  }

  /**
   * Get total count of location records
   *
   * @returns {Promise<number>} Total number of location records
   */
  async count(): Promise<number> {
    try {
      const result = await this.db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM locations`
      );

      return result?.count || 0;
    } catch (error) {
      console.error('[LocationRepository] Failed to count locations:', error);
      return 0;
    }
  }

  /**
   * Delete a location record by ID
   *
   * @param {number} id - Location ID
   * @returns {Promise<boolean>} True if location was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    try {
      const result = await this.db.runAsync(
        `DELETE FROM locations WHERE id = ?`,
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[LocationRepository] Failed to delete location:', error);
      throw error;
    }
  }

  /**
   * Delete all location records
   *
   * @returns {Promise<number>} Number of locations deleted
   */
  async deleteAll(): Promise<number> {
    try {
      const result = await this.db.runAsync(`DELETE FROM locations`);
      return result.changes;
    } catch (error) {
      console.error('[LocationRepository] Failed to delete all locations:', error);
      throw error;
    }
  }

  /**
   * Delete location records older than specified days
   *
   * @param {number} days - Number of days to keep
   * @returns {Promise<number>} Number of locations deleted
   */
  async deleteOlderThan(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await this.db.runAsync(
        `DELETE FROM locations WHERE created_at < ?`,
        [cutoffDate.toISOString()]
      );

      return result.changes;
    } catch (error) {
      console.error('[LocationRepository] Failed to delete old locations:', error);
      throw error;
    }
  }
}
