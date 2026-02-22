/**
 * FilePickerScreen - File selection and upload screen
 *
 * @module app/(tabs)/files
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getSpacing, normalizeFont, getShadowStyle, wp } from '@/src/utils/responsive';
import { useFilePicker } from '@/hooks/useFilePicker';
import { Button } from '@/src/components/Button';
import { ErrorMessage } from '@/src/components/ErrorMessage';
import { LoadingIndicator } from '@/src/components/LoadingIndicator';

/**
 * Format file size to human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * File Picker Screen Component
 *
 * Features:
 * - Document selection from file system
 * - Image selection from photo library
 * - File info display (name, size, type)
 * - 10MB file size validation
 * - Korean error messages
 * - Accessibility support
 */
export default function FilePickerScreen() {
  const {
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
  } = useFilePicker();

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  /**
   * Handle document selection
   */
  const handlePickDocument = async () => {
    setSaveSuccess(false);
    await pickDocument({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ],
    });
  };

  /**
   * Handle image selection
   */
  const handlePickImage = async () => {
    setSaveSuccess(false);
    await pickImage({
      allowsEditing: false,
      quality: 0.9,
    });
  };

  /**
   * Handle file save
   */
  const handleSave = async () => {
    if (!selectedFile) return;

    try {
      await saveFile(selectedFile);
      setSaveSuccess(true);

      // Navigate to file list after short delay
      setTimeout(() => {
        router.push('/files/list');
      }, 1000);
    } catch (err) {
      // Error is handled by hook
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    clearSelection();
    setSaveSuccess(false);
  };

  /**
   * Render permission denied view
   */
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>권한이 필요합니다</Text>
          <Text style={styles.errorText}>
            파일을 선택하려면 저장소 접근 권한이 필요합니다
          </Text>
          <Button
            onPress={openSettings}
            accessibilityLabel="설정 열기"
            style={styles.button}
          >
            설정 열기
          </Button>
        </View>
      </View>
    );
  }

  /**
   * Render loading view
   */
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <LoadingIndicator testID="loading-indicator" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>파일 선택</Text>
        <Text style={styles.subtitle}>
          문서 또는 이미지를 선택하여 업로드하세요 (최대 10MB)
        </Text>
      </View>

      {/* File picker buttons */}
      <View style={styles.pickerButtons}>
        <Button
          onPress={handlePickDocument}
          disabled={isLoading}
          accessibilityLabel="문서 선택"
          style={styles.button}
        >
          문서 선택
        </Button>

        <Button
          onPress={handlePickImage}
          disabled={isLoading}
          accessibilityLabel="이미지 선택"
          style={styles.button}
        >
          이미지 선택
        </Button>
      </View>

      {/* File preview */}
      {selectedFile && (
        <View style={styles.preview} testID="file-preview">
          <Text style={styles.previewTitle}>선택된 파일</Text>

          {/* Show image preview for images */}
          {selectedFile.mimeType.startsWith('image/') && (
            <Image
              source={{ uri: selectedFile.uri }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}

          {/* File info */}
          <View style={styles.fileInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>파일명:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {selectedFile.name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>크기:</Text>
              <Text style={styles.infoValue}>{formatFileSize(selectedFile.size)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>타입:</Text>
              <Text style={styles.infoValue}>{selectedFile.mimeType}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <Button
              onPress={handleSave}
              disabled={isLoading}
              accessibilityLabel="파일 저장"
              style={[styles.button, styles.saveButton]}
            >
              {isLoading ? '저장 중...' : '저장'}
            </Button>

            <Button
              onPress={handleCancel}
              disabled={isLoading}
              accessibilityLabel="선택 취소"
              style={[styles.button, styles.cancelButton]}
            >
              취소
            </Button>
          </View>
        </View>
      )}

      {/* Success message */}
      {saveSuccess && (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>파일이 저장되었습니다</Text>
        </View>
      )}

      {/* Error message */}
      {error && <ErrorMessage message={error} />}

      {/* Loading indicator */}
      {isLoading && <LoadingIndicator testID="loading-indicator" />}

      {/* View saved files button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => router.push('/files/list')}
          style={styles.linkButton}
          accessibilityLabel="저장된 파일 보기"
        >
          <Text style={styles.linkText}>저장된 파일 보기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: spacing.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: normalizeFont(28),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: normalizeFont(16),
    color: '#666',
    lineHeight: normalizeFont(22),
  },
  pickerButtons: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    width: '100%',
  },
  preview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...getShadowStyle(3),
  },
  previewTitle: {
    fontSize: normalizeFont(18),
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.sm,
  },
  imagePreview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: '#f0f0f0',
  },
  fileInfo: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
    color: '#666',
    minWidth: wp(20),
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    fontSize: normalizeFont(14),
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
  },
  successMessage: {
    backgroundColor: '#4CAF50',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  successText: {
    color: '#fff',
    fontSize: normalizeFont(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    fontSize: normalizeFont(16),
    color: '#666',
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: normalizeFont(22),
  },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  linkButton: {
    padding: spacing.sm,
  },
  linkText: {
    fontSize: normalizeFont(16),
    color: '#007AFF',
    fontWeight: '600',
  },
});
