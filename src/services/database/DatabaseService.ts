/**
 * DatabaseService - Singleton service for managing SQLite database
 *
 * @module services/database/DatabaseService
 */

import * as SQLite from 'expo-sqlite';
import { initializeDatabaseSchema, DATABASE_NAME, DATABASE_VERSION } from './schema';

/**
 * Singleton service for managing the SQLite database connection and initialization
 *
 * Usage:
 * ```typescript
 * const db = DatabaseService.getInstance();
 * await db.initialize();
 * const database = db.getDatabase();
 * ```
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private database: SQLite.SQLiteDatabase | null = null;
  private isInitialized: boolean = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance of DatabaseService
   *
   * @returns {DatabaseService} The singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Initialize the database by creating tables and indexes
   *
   * This method is idempotent - safe to call multiple times.
   * It will only initialize the database once.
   *
   * @returns {Promise<void>}
   * @throws {Error} If database initialization fails
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.database) {
      console.log('[DatabaseService] Database already initialized');
      return;
    }

    try {
      console.log('[DatabaseService] Initializing database...');

      // Open database connection
      this.database = await SQLite.openDatabaseAsync(DATABASE_NAME);

      // Check current database version
      const versionResult = await this.database.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
      );
      const currentVersion = versionResult?.user_version ?? 0;

      console.log(`[DatabaseService] Current database version: ${currentVersion}`);

      // Run migrations if needed
      if (currentVersion < DATABASE_VERSION) {
        console.log('[DatabaseService] Running migrations...');
        await this.runMigrations(currentVersion);
      }

      this.isInitialized = true;
      console.log('[DatabaseService] Database initialized successfully');
    } catch (error) {
      console.error('[DatabaseService] Database initialization failed:', error);
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  /**
   * Run database migrations
   *
   * @param {number} currentVersion - Current database version
   * @returns {Promise<void>}
   * @private
   */
  private async runMigrations(currentVersion: number): Promise<void> {
    if (!this.database) {
      throw new Error('Database not opened');
    }

    // Migration v0 -> v1: Initial schema
    if (currentVersion === 0) {
      console.log('[DatabaseService] Applying migration v0 -> v1');
      await this.database.execAsync(initializeDatabaseSchema);
      await this.database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }

    // Future migrations can be added here:
    // if (currentVersion === 1) {
    //   console.log('[DatabaseService] Applying migration v1 -> v2');
    //   await this.database.execAsync('ALTER TABLE photos ADD COLUMN location_id INTEGER;');
    //   await this.database.execAsync('PRAGMA user_version = 2');
    // }
  }

  /**
   * Get the database instance
   *
   * @returns {SQLite.SQLiteDatabase} The database instance
   * @throws {Error} If database is not initialized
   */
  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.database || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Check if database is initialized
   *
   * @returns {boolean} True if database is initialized
   */
  public isReady(): boolean {
    return this.isInitialized && this.database !== null;
  }

  /**
   * Close the database connection
   *
   * @returns {Promise<void>}
   */
  public async close(): Promise<void> {
    if (this.database) {
      await this.database.closeAsync();
      this.database = null;
      this.isInitialized = false;
      console.log('[DatabaseService] Database closed');
    }
  }

  /**
   * Reset the singleton instance (primarily for testing)
   *
   * @returns {Promise<void>}
   */
  public static async resetInstance(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.close();
      DatabaseService.instance = null;
    }
  }
}

/**
 * Convenience function to get initialized database
 *
 * @returns {SQLite.SQLiteDatabase} The initialized database instance
 * @throws {Error} If database is not initialized
 */
export const getDatabase = (): SQLite.SQLiteDatabase => {
  return DatabaseService.getInstance().getDatabase();
};
