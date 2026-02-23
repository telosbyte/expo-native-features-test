/**
 * PermissionService - Service for managing app permissions
 *
 * @module services/permissions/PermissionService
 */

import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';

/**
 * Permission types supported by the app
 */
export type PermissionType = 'camera' | 'location' | 'mediaLibrary';

/**
 * Permission status result
 */
export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

/**
 * Service for managing app permissions across different native features
 *
 * Supports:
 * - Camera permission (for photo capture and barcode scanning)
 * - Location permission (for GPS tracking)
 * - Media library permission (for file/image selection)
 */
export class PermissionService {
  /**
   * Request camera permission
   *
   * @returns {Promise<PermissionStatus>} Permission status after request
   */
  public static async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request camera permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Check camera permission status without requesting
   *
   * @returns {Promise<PermissionStatus>} Current permission status
   */
  public static async checkCameraPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to check camera permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Request foreground location permission
   *
   * @returns {Promise<PermissionStatus>} Permission status after request
   */
  public static async requestLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Check location permission status without requesting
   *
   * @returns {Promise<PermissionStatus>} Current permission status
   */
  public static async checkLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to check location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Request media library permission (for image picker)
   *
   * @returns {Promise<PermissionStatus>} Permission status after request
   */
  public static async requestMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to request media library permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Check media library permission status without requesting
   *
   * @returns {Promise<PermissionStatus>} Current permission status
   */
  public static async checkMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();

      return {
        granted: status === 'granted',
        canAskAgain,
        status: status as 'granted' | 'denied' | 'undetermined',
      };
    } catch (error) {
      console.error('[PermissionService] Failed to check media library permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
    }
  }

  /**
   * Request permission by type
   *
   * @param {PermissionType} type - Permission type to request
   * @returns {Promise<PermissionStatus>} Permission status after request
   */
  public static async requestPermission(type: PermissionType): Promise<PermissionStatus> {
    switch (type) {
      case 'camera':
        return this.requestCameraPermission();
      case 'location':
        return this.requestLocationPermission();
      case 'mediaLibrary':
        return this.requestMediaLibraryPermission();
      default:
        throw new Error(`Unknown permission type: ${type}`);
    }
  }

  /**
   * Check permission status by type
   *
   * @param {PermissionType} type - Permission type to check
   * @returns {Promise<PermissionStatus>} Current permission status
   */
  public static async checkPermission(type: PermissionType): Promise<PermissionStatus> {
    switch (type) {
      case 'camera':
        return this.checkCameraPermission();
      case 'location':
        return this.checkLocationPermission();
      case 'mediaLibrary':
        return this.checkMediaLibraryPermission();
      default:
        throw new Error(`Unknown permission type: ${type}`);
    }
  }

  /**
   * Open device settings page
   *
   * Redirects user to app settings where they can manually enable permissions
   */
  public static openSettings(): void {
    Linking.openSettings();
  }

  /**
   * Check if location services are enabled on the device
   *
   * @returns {Promise<boolean>} True if location services are enabled
   */
  public static async isLocationServicesEnabled(): Promise<boolean> {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('[PermissionService] Failed to check location services:', error);
      return false;
    }
  }

  /**
   * Get platform-specific permission message
   *
   * @param {PermissionType} type - Permission type
   * @returns {string} User-friendly permission explanation
   */
  public static getPermissionMessage(type: PermissionType): string {
    const messages = {
      camera: Platform.select({
        ios: 'Camera access is required to take photos and scan barcodes. Please enable it in Settings > Privacy > Camera.',
        android: 'Camera access is required to take photos and scan barcodes. Please enable it in Settings > Apps > Permissions.',
        default: 'Camera access is required to take photos and scan barcodes.',
      }),
      location: Platform.select({
        ios: 'Location access is required to track your position. Please enable it in Settings > Privacy > Location Services.',
        android: 'Location access is required to track your position. Please enable it in Settings > Apps > Permissions.',
        default: 'Location access is required to track your position.',
      }),
      mediaLibrary: Platform.select({
        ios: 'Photo library access is required to select images. Please enable it in Settings > Privacy > Photos.',
        android: 'Storage access is required to select files. Please enable it in Settings > Apps > Permissions.',
        default: 'Media library access is required to select files.',
      }),
    };

    return messages[type] || 'Permission is required for this feature.';
  }
}
