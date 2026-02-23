/**
 * Barcode entity types for barcode/QR code scanning functionality
 *
 * @module types/Barcode
 */

/**
 * Supported barcode types
 */
export type BarcodeType =
  | 'QR'
  | 'EAN13'
  | 'EAN8'
  | 'UPCE'
  | 'CODE39'
  | 'CODE128'
  | 'ITF14'
  | 'AZTEC'
  | 'PDF417'
  | 'DATAMATRIX'
  | 'CODE93'
  | 'CODABAR'
  | 'UPC_A';

/**
 * ScannedBarcode entity representing a scanned barcode stored in the database
 */
export interface ScannedBarcode {
  /** Unique identifier */
  id: number;
  /** Barcode type (e.g., QR, EAN13) */
  type: BarcodeType;
  /** Decoded barcode data */
  data: string;
  /** ISO 8601 timestamp when barcode was scanned */
  scanned_at: string;
  /** Raw barcode value (optional additional data) */
  raw_value?: string;
}

/**
 * Input type for creating a new barcode record
 */
export interface CreateBarcodeInput {
  /** Barcode type (e.g., QR, EAN13) */
  type: BarcodeType;
  /** Decoded barcode data */
  data: string;
  /** Raw barcode value (optional additional data) */
  raw_value?: string;
}
