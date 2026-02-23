/**
 * Database schema definition with SQLite table creation and index statements
 *
 * @module services/database/schema
 */

/**
 * SQL statements to initialize the database with all required tables and indexes
 *
 * Features:
 * - WAL (Write-Ahead Logging) mode for better performance
 * - 4 tables: photos, files, locations, barcodes
 * - Optimized indexes for common query patterns
 */
export const initializeDatabaseSchema = `
  -- Enable WAL mode for better concurrent read/write performance
  PRAGMA journal_mode = WAL;

  -- Photos table: stores captured photos from camera
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uri TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    file_size INTEGER,
    width INTEGER,
    height INTEGER
  );

  -- Index for sorting photos by creation date (most recent first)
  CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

  -- Files table: stores metadata for uploaded/selected files
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    uri TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Index for sorting files by upload date (most recent first)
  CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);

  -- Index for filtering files by MIME type (e.g., images, PDFs)
  CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);

  -- Locations table: stores GPS location records
  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    altitude REAL,
    heading REAL,
    speed REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Index for sorting locations by creation date (most recent first)
  CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);

  -- Index for spatial queries (finding locations near coordinates)
  CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

  -- Barcodes table: stores scanned barcode/QR code data
  CREATE TABLE IF NOT EXISTS barcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_value TEXT
  );

  -- Index for sorting barcodes by scan date (most recent first)
  CREATE INDEX IF NOT EXISTS idx_barcodes_scanned_at ON barcodes(scanned_at DESC);

  -- Index for filtering barcodes by type (e.g., QR, EAN13)
  CREATE INDEX IF NOT EXISTS idx_barcodes_type ON barcodes(type);
`;

/**
 * Database version for migration tracking
 */
export const DATABASE_VERSION = 1;

/**
 * Database name
 */
export const DATABASE_NAME = 'native_features.db';
