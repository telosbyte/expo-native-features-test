/**
 * useCamera - Custom hook for camera operations
 *
 * @module hooks/useCamera
 */

import { useState, useCallback, useRef } from 'react';
import { CameraView } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { PermissionService } from '@/services/permissions/PermissionService';
import { DatabaseService } from '@/services/database/DatabaseService';
import { PhotoRepository } from '@/services/database/PhotoRepository';
import { Photo, PhotoMetadata } from '@/types/Photo';

/**
 * Captured photo result
 */
export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

/**
 * useCamera hook return type
 */
export interface UseCameraReturn {
  /** Permission status: null = checking, true = granted, false = denied */
  hasPermission: boolean | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Request camera permission */
  requestPermission: () => Promise<boolean>;
  /** Capture photo from camera */
  capturePhoto: () => Promise<CapturedPhoto | null>;
  /** Save photo to database */
  savePhoto: (uri: string, metadata?: PhotoMetadata) => Promise<Photo>;
  /** Open device settings */
  openSettings: () => void;
  /** Set camera ref for capturing */
  setCameraRef: (ref: CameraView | null) => void;
}

/**
 * Custom hook for camera operations
 *
 * Handles:
 * - Camera permission management
 * - Photo capture
 * - Photo saving to database
 *
 * @returns {UseCameraReturn} Camera operations and state
 *
 * @example
 * ```typescript
 * const {
 *   hasPermission,
 *   isLoading,
 *   error,
 *   requestPermission,
 *   capturePhoto,
 *   savePhoto,
 *   setCameraRef
 * } = useCamera();
 *
 * useEffect(() => {
 *   requestPermission();
 * }, []);
 *
 * const handleCapture = async () => {
 *   const photo = await capturePhoto();
 *   if (photo) {
 *     await savePhoto(photo.uri, { width: photo.width, height: photo.height });
 *   }
 * };
 * ```
 */
export const useCamera = (): UseCameraReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  /**
   * Request camera permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await PermissionService.requestCameraPermission();

      setHasPermission(result.granted);

      if (!result.granted) {
        setError('카메라 권한이 거부되었습니다');
      }

      return result.granted;
    } catch (err) {
      console.error('[useCamera] Permission request failed:', err);
      setError('카메라 권한 요청에 실패했습니다');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Capture photo from camera
   */
  const capturePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (!hasPermission) {
      setError('카메라 권한이 필요합니다');
      return null;
    }

    if (!cameraRef.current) {
      setError('카메라를 사용할 수 없습니다');
      return null;
    }

    try {
      setError(null);
      setIsLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo) {
        setError('사진 촬영에 실패했습니다');
        return null;
      }

      return {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      };
    } catch (err) {
      console.error('[useCamera] Photo capture failed:', err);
      setError('사진 촬영에 실패했습니다');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission]);

  /**
   * Save photo to database with compression
   */
  const savePhoto = useCallback(
    async (uri: string, metadata?: PhotoMetadata): Promise<Photo> => {
      try {
        setError(null);
        setIsLoading(true);

        // Compress image before saving to reduce storage size
        let processedUri = uri;
        let processedWidth = metadata?.width;
        let processedHeight = metadata?.height;

        try {
          const compressed = await ImageManipulator.manipulateAsync(
            uri,
            [
              // Resize to max 1920px width while maintaining aspect ratio
              { resize: { width: 1920 } },
            ],
            {
              compress: 0.8, // 80% quality
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );

          processedUri = compressed.uri;
          processedWidth = compressed.width;
          processedHeight = compressed.height;

          console.log('[useCamera] Image compressed:', {
            original: uri,
            compressed: processedUri,
            width: processedWidth,
            height: processedHeight,
          });
        } catch (compressionError) {
          console.warn('[useCamera] Image compression failed, using original:', compressionError);
          // Continue with original image if compression fails
        }

        // Get file size
        let fileSize = metadata?.file_size;
        if (!fileSize) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(processedUri);
            if (fileInfo.exists && 'size' in fileInfo) {
              fileSize = fileInfo.size;
            }
          } catch (err) {
            console.warn('[useCamera] Failed to get file size:', err);
          }
        }

        // Save to database
        const db = DatabaseService.getInstance().getDatabase();
        const repository = new PhotoRepository(db);

        const photo = await repository.save({
          uri: processedUri,
          file_size: fileSize,
          width: processedWidth,
          height: processedHeight,
        });

        return photo;
      } catch (err) {
        console.error('[useCamera] Photo save failed:', err);
        setError('사진 저장에 실패했습니다');
        throw err;
      } finally {
        setIsLoading(false);
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
   * Set camera ref
   */
  const setCameraRef = useCallback((ref: CameraView | null) => {
    cameraRef.current = ref;
  }, []);

  return {
    hasPermission,
    isLoading,
    error,
    requestPermission,
    capturePhoto,
    savePhoto,
    openSettings,
    setCameraRef,
  };
};
