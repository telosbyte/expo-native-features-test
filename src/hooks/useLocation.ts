/**
 * useLocation - Custom hook for GPS location operations
 *
 * @module hooks/useLocation
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { PermissionService } from '@/services/permissions/PermissionService';
import { DatabaseService } from '@/services/database/DatabaseService';
import { LocationRepository } from '@/services/database/LocationRepository';
import { LocationRecord, CreateLocationInput } from '@/types/Location';

/**
 * Location data from GPS
 */
export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp?: number;
}

/**
 * Options for getCurrentLocation
 */
export interface LocationOptions {
  /** GPS accuracy level */
  accuracy?: Location.Accuracy;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Use cached location if available within this age (milliseconds) */
  maximumAge?: number;
}

/**
 * useLocation hook return type
 */
export interface UseLocationReturn {
  /** Permission status: null = checking, true = granted, false = denied */
  hasPermission: boolean | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current location data */
  currentLocation: LocationData | null;
  /** Request location permission */
  requestPermission: () => Promise<boolean>;
  /** Get current GPS location */
  getCurrentLocation: (options?: LocationOptions) => Promise<LocationData | null>;
  /** Save location to database */
  saveLocation: (location: CreateLocationInput) => Promise<LocationRecord>;
  /** Clear current location */
  clearLocation: () => void;
  /** Open device settings */
  openSettings: () => void;
}

/**
 * Custom hook for GPS location operations
 *
 * Handles:
 * - Location permission management
 * - GPS location fetching with timeout
 * - Location saving to database
 * - Error handling
 *
 * @returns {UseLocationReturn} Location operations and state
 *
 * @example
 * ```typescript
 * const {
 *   hasPermission,
 *   isLoading,
 *   error,
 *   currentLocation,
 *   requestPermission,
 *   getCurrentLocation,
 *   saveLocation,
 *   clearLocation
 * } = useLocation();
 *
 * useEffect(() => {
 *   requestPermission();
 * }, []);
 *
 * const handleGetLocation = async () => {
 *   const location = await getCurrentLocation({ timeout: 10000 });
 *   if (location) {
 *     await saveLocation(location);
 *   }
 * };
 * ```
 */
export const useLocation = (): UseLocationReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await PermissionService.requestLocationPermission();

      setHasPermission(result.granted);

      if (!result.granted) {
        setError('위치 권한이 거부되었습니다');
      }

      return result.granted;
    } catch (err) {
      console.error('[useLocation] Permission request failed:', err);
      setError('위치 권한 요청에 실패했습니다');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get current GPS location with timeout
   */
  const getCurrentLocation = useCallback(
    async (options: LocationOptions = {}): Promise<LocationData | null> => {
      if (!hasPermission) {
        setError('위치 권한이 필요합니다');
        return null;
      }

      try {
        setError(null);
        setIsLoading(true);

        // Check if location services are enabled
        const servicesEnabled = await PermissionService.isLocationServicesEnabled();
        if (!servicesEnabled) {
          setError('위치 서비스가 비활성화되어 있습니다');
          return null;
        }

        const { timeout = 10000, accuracy = Location.Accuracy.High } = options;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error('TIMEOUT'));
          }, timeout);
        });

        // Create location fetch promise
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy,
        });

        // Race between location fetch and timeout
        const position = await Promise.race([locationPromise, timeoutPromise]);

        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? null,
          accuracy: position.coords.accuracy ?? 0,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
          timestamp: position.timestamp,
        };

        setCurrentLocation(locationData);
        return locationData;
      } catch (err: any) {
        console.error('[useLocation] Failed to get location:', err);

        if (err.message === 'TIMEOUT') {
          setError('위치 조회 시간이 초과되었습니다. 다시 시도해주세요');
        } else {
          setError('위치를 찾을 수 없습니다');
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [hasPermission]
  );

  /**
   * Save location to database
   */
  const saveLocation = useCallback(
    async (location: CreateLocationInput): Promise<LocationRecord> => {
      try {
        setError(null);
        setIsLoading(true);

        const db = DatabaseService.getInstance().getDatabase();
        const repository = new LocationRepository(db);

        const savedLocation = await repository.save(location);

        // Clear current location after save
        setCurrentLocation(null);

        return savedLocation;
      } catch (err) {
        console.error('[useLocation] Failed to save location:', err);
        setError('위치 저장에 실패했습니다');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear current location
   */
  const clearLocation = useCallback(() => {
    setCurrentLocation(null);
    setError(null);
  }, []);

  /**
   * Open device settings
   */
  const openSettings = useCallback(() => {
    PermissionService.openSettings();
  }, []);

  return {
    hasPermission,
    isLoading,
    error,
    currentLocation,
    requestPermission,
    getCurrentLocation,
    saveLocation,
    clearLocation,
    openSettings,
  };
};
