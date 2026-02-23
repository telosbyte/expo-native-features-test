/**
 * useFilePicker - Custom hook for file picker operations
 *
 * @module hooks/useFilePicker
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { PermissionService } from '@/services/permissions/PermissionService';
import { DatabaseService } from '@/services/database/DatabaseService';
import { FileRepository } from '@/services/database/FileRepository';
import { SelectedFile, UploadedFile } from '@/types/File';

/**
 * File picker options
 */
export interface PickerOptions {
  /** MIME types to filter (e.g., ['application/pdf', 'image/*']) */
  type?: string | string[];
  /** Copy file to cache directory */
  copyToCacheDirectory?: boolean;
  /** Allow multiple file selection */
  multiple?: boolean;
}

/**
 * Image picker options
 */
export interface ImagePickerOptions {
  /** Allow image editing */
  allowsEditing?: boolean;
  /** Image aspect ratio [width, height] */
  aspect?: [number, number];
  /** Image quality 0-1 */
  quality?: number;
}

/**
 * useFilePicker hook return type
 */
export interface UseFilePickerReturn {
  /** Permission status: null = checking, true = granted, false = denied */
  hasPermission: boolean | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Currently selected file */
  selectedFile: SelectedFile | null;
  /** Request media library permission */
  requestPermission: () => Promise<boolean>;
  /** Pick document from file system */
  pickDocument: (options?: PickerOptions) => Promise<SelectedFile | null>;
  /** Pick image from photo library */
  pickImage: (options?: ImagePickerOptions) => Promise<SelectedFile | null>;
  /** Save selected file to database */
  saveFile: (file: SelectedFile) => Promise<UploadedFile>;
  /** Open device settings */
  openSettings: () => void;
  /** Clear current selection */
  clearSelection: () => void;
}

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Custom hook for file picker operations
 *
 * Handles:
 * - Media library permission management
 * - Document and image picking
 * - File size validation
 * - File saving to database
 *
 * @returns {UseFilePickerReturn} File picker operations and state
 *
 * @example
 * ```typescript
 * const {
 *   hasPermission,
 *   isLoading,
 *   error,
 *   selectedFile,
 *   requestPermission,
 *   pickDocument,
 *   pickImage,
 *   saveFile,
 *   clearSelection
 * } = useFilePicker();
 *
 * useEffect(() => {
 *   requestPermission();
 * }, []);
 *
 * const handlePickDocument = async () => {
 *   const file = await pickDocument({
 *     type: ['application/pdf', 'application/msword']
 *   });
 *   if (file) {
 *     await saveFile(file);
 *   }
 * };
 * ```
 */
export const useFilePicker = (): UseFilePickerReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  /**
   * Request media library permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();

      setHasPermission(result.granted);

      if (!result.granted) {
        setError('파일 접근 권한이 거부되었습니다');
      }

      return result.granted;
    } catch (err) {
      console.error('[useFilePicker] Permission request failed:', err);
      setError('파일 접근 권한 요청에 실패했습니다');
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Pick document from file system
   */
  const pickDocument = useCallback(
    async (options?: PickerOptions): Promise<SelectedFile | null> => {
      try {
        setError(null);
        setIsLoading(true);

        const result = await DocumentPicker.getDocumentAsync({
          type: options?.type ?? '*/*',
          copyToCacheDirectory: options?.copyToCacheDirectory ?? true,
          multiple: options?.multiple ?? false,
        });

        // New API: result.canceled instead of result.type
        if (result.canceled) {
          return null;
        }

        // New API: result.assets array
        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const file: SelectedFile = {
            uri: asset.uri,
            name: asset.name,
            size: asset.size ?? 0,
            mimeType: asset.mimeType ?? 'application/octet-stream',
          };

          // Validate file size before setting
          if (file.size > MAX_FILE_SIZE) {
            setError('파일 크기가 너무 큽니다. 최대 10MB까지 선택 가능합니다');
            return null;
          }

          setSelectedFile(file);
          return file;
        }

        return null;
      } catch (err) {
        console.error('[useFilePicker] Document picker failed:', err);
        setError('파일을 선택할 수 없습니다');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Pick image from photo library
   */
  const pickImage = useCallback(
    async (options?: ImagePickerOptions): Promise<SelectedFile | null> => {
      try {
        setError(null);
        setIsLoading(true);

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: options?.allowsEditing ?? false,
          quality: options?.quality ?? 1,
          aspect: options?.aspect,
        });

        if (result.canceled) {
          return null;
        }

        if (result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const file: SelectedFile = {
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.jpg`,
            size: asset.fileSize ?? 0,
            mimeType: asset.mimeType ?? 'image/jpeg',
          };

          setSelectedFile(file);
          return file;
        }

        return null;
      } catch (err) {
        console.error('[useFilePicker] Image picker failed:', err);
        setError('이미지를 선택할 수 없습니다');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Save file to database with validation
   */
  const saveFile = useCallback(
    async (file: SelectedFile): Promise<UploadedFile> => {
      try {
        setError(null);
        setIsLoading(true);

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new Error('파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다');
        }

        // Save to database
        const db = DatabaseService.getInstance().getDatabase();
        const repository = new FileRepository(db);

        const uploadedFile = await repository.save({
          name: file.name,
          uri: file.uri,
          mime_type: file.mimeType,
          size: file.size,
        });

        // Clear selection after successful save
        setSelectedFile(null);

        return uploadedFile;
      } catch (err) {
        console.error('[useFilePicker] File save failed:', err);
        const errorMessage = err instanceof Error ? err.message : '파일 저장에 실패했습니다';
        setError(errorMessage);
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
   * Clear current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  return {
    hasPermission,
    isLoading,
    error,
    selectedFile,
    requestPermission,
    pickDocument,
    pickImage,
    saveFile,
    openSettings,
    clearSelection,
  };
};
