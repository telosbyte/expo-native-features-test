/**
 * useBarcodeScanner - Custom hook for barcode scanning operations
 *
 * @module hooks/useBarcodeScanner
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { PermissionService } from '@/services/permissions/PermissionService';
import { DatabaseService } from '@/services/database/DatabaseService';
import { BarcodeRepository } from '@/services/database/BarcodeRepository';
import { ScannedBarcode, BarcodeType } from '@/types/Barcode';

/**
 * Barcode scan event from camera
 */
export interface BarcodeScanEvent {
  type: BarcodeType;
  data: string;
}

/**
 * Scanned barcode data with timestamp
 */
export interface ScannedBarcodeData {
  type: BarcodeType;
  data: string;
  timestamp: number;
}

/**
 * useBarcodeScanner hook return type
 */
export interface UseBarcodeScannerReturn {
  /** Permission status: null = checking, true = granted, false = denied */
  hasPermission: boolean | null;
  /** Scanning state */
  isScanning: boolean;
  /** Error message */
  error: string | null;
  /** Scanned barcode data */
  scannedData: ScannedBarcodeData | null;
  /** Show timeout hint */
  showTimeoutHint: boolean;
  /** Request camera permission */
  requestPermission: () => Promise<boolean>;
  /** Start scanning */
  startScanning: () => void;
  /** Stop scanning */
  stopScanning: () => void;
  /** Save barcode to database */
  saveBarcode: (data: ScannedBarcodeData, note?: string) => Promise<ScannedBarcode>;
  /** Open device settings */
  openSettings: () => void;
  /** Clear scanned data */
  clearScannedData: () => void;
  /** Handle barcode scanned event */
  handleBarcodeScanned: (event: BarcodeScanEvent) => void;
}

/**
 * Custom hook for barcode scanning operations
 *
 * Handles:
 * - Camera permission management
 * - Barcode scanning with 2-second debounce
 * - 10-second scan timeout
 * - Barcode saving to database
 *
 * @returns {UseBarcodeScannerReturn} Barcode scanner operations and state
 *
 * @example
 * ```typescript
 * const {
 *   hasPermission,
 *   isScanning,
 *   error,
 *   scannedData,
 *   requestPermission,
 *   startScanning,
 *   stopScanning,
 *   saveBarcode,
 *   handleBarcodeScanned
 * } = useBarcodeScanner();
 *
 * useEffect(() => {
 *   requestPermission();
 * }, []);
 *
 * const handleScan = async () => {
 *   if (scannedData) {
 *     await saveBarcode(scannedData);
 *   }
 * };
 * ```
 */
export const useBarcodeScanner = (): UseBarcodeScannerReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedBarcodeData | null>(null);
  const [showTimeoutHint, setShowTimeoutHint] = useState<boolean>(false);

  const lastScanTime = useRef<number>(0);
  const lastScannedData = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce interval: 2 seconds
  const DEBOUNCE_INTERVAL = 2000;
  // Scan timeout: 10 seconds
  const SCAN_TIMEOUT = 10000;

  /**
   * Request camera permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      const result = await PermissionService.requestCameraPermission();

      setHasPermission(result.granted);

      if (!result.granted) {
        setError('카메라 권한이 거부되었습니다');
      }

      return result.granted;
    } catch (err) {
      console.error('[useBarcodeScanner] Permission request failed:', err);
      setError('카메라 권한 요청에 실패했습니다');
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Start scanning
   */
  const startScanning = useCallback((): void => {
    if (!hasPermission) {
      setError('카메라 권한이 필요합니다');
      return;
    }

    setError(null);
    setIsScanning(true);
    setShowTimeoutHint(false);

    // Start timeout timer
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    scanTimeoutRef.current = setTimeout(() => {
      setShowTimeoutHint(true);
    }, SCAN_TIMEOUT);
  }, [hasPermission]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback((): void => {
    setIsScanning(false);
    setShowTimeoutHint(false);

    // Clear timeout timer
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle barcode scanned event with debounce
   */
  const handleBarcodeScanned = useCallback((event: BarcodeScanEvent): void => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime.current;

    // Debounce: ignore if same barcode scanned within interval
    if (
      timeSinceLastScan < DEBOUNCE_INTERVAL &&
      event.data === lastScannedData.current
    ) {
      return;
    }

    lastScanTime.current = now;
    lastScannedData.current = event.data;

    setScannedData({
      type: event.type,
      data: event.data,
      timestamp: now,
    });

    // Stop scanning after successful scan
    setIsScanning(false);
    setShowTimeoutHint(false);

    // Clear timeout timer
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  /**
   * Save barcode to database
   */
  const saveBarcode = useCallback(
    async (data: ScannedBarcodeData, note?: string): Promise<ScannedBarcode> => {
      try {
        setError(null);

        const db = DatabaseService.getInstance().getDatabase();
        const repository = new BarcodeRepository(db);

        const barcode = await repository.save({
          type: data.type,
          data: data.data,
          raw_value: note || null,
        });

        return barcode;
      } catch (err) {
        console.error('[useBarcodeScanner] Barcode save failed:', err);
        setError('바코드 저장에 실패했습니다');
        throw err;
      }
    },
    []
  );

  /**
   * Open device settings
   */
  const openSettings = useCallback(() => {
    PermissionService.openSettings();
  }, []);

  /**
   * Clear scanned data
   */
  const clearScannedData = useCallback(() => {
    setScannedData(null);
    setError(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasPermission,
    isScanning,
    error,
    scannedData,
    showTimeoutHint,
    requestPermission,
    startScanning,
    stopScanning,
    saveBarcode,
    openSettings,
    clearScannedData,
    handleBarcodeScanned,
  };
};
