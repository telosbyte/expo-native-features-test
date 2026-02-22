/**
 * CameraScreen - Camera photo capture screen
 *
 * @module app/(tabs)/camera
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSpacing, normalizeFont } from '@/src/utils/responsive';
import { CameraView } from 'expo-camera';
import { router } from 'expo-router';
import { useCamera, CapturedPhoto } from '@/hooks/useCamera';
import { Button } from '@/src/components/Button';
import { LoadingIndicator } from '@/src/components/LoadingIndicator';
import { ErrorMessage } from '@/src/components/ErrorMessage';

/**
 * Camera screen component for capturing photos
 *
 * Features:
 * - Camera permission handling
 * - Photo capture
 * - Photo preview modal
 * - Save/cancel flow
 * - Navigation to photo list
 */
export default function CameraScreen() {
  const {
    hasPermission,
    isLoading,
    error,
    requestPermission,
    capturePhoto,
    savePhoto,
    openSettings,
    setCameraRef,
  } = useCamera();

  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  /**
   * Handle photo capture
   */
  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      setCapturedPhoto(photo);
      setShowPreview(true);
    }
  };

  /**
   * Handle save photo
   */
  const handleSave = async () => {
    if (!capturedPhoto) return;

    try {
      await savePhoto(capturedPhoto.uri, {
        width: capturedPhoto.width,
        height: capturedPhoto.height,
      });

      setShowPreview(false);
      setCapturedPhoto(null);

      Alert.alert('성공', '사진이 저장되었습니다', [
        {
          text: '확인',
          onPress: () => {},
        },
        {
          text: '사진 목록 보기',
          onPress: () => router.push('/photoList'),
        },
      ]);
    } catch (err) {
      Alert.alert('오류', '사진 저장에 실패했습니다');
    }
  };

  /**
   * Handle cancel preview
   */
  const handleCancel = () => {
    setShowPreview(false);
    setCapturedPhoto(null);
  };

  /**
   * Render permission checking state
   */
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingIndicator
          message="권한 확인 중..."
          fullScreen
          accessibilityLabel="카메라 권한 확인 중"
        />
      </SafeAreaView>
    );
  }

  /**
   * Render permission denied state
   */
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionDenied}>
          <Text style={styles.permissionTitle}>카메라 권한이 필요합니다</Text>
          <Text style={styles.permissionMessage}>
            사진을 촬영하려면 카메라 접근 권한이 필요합니다.{'\n'}
            설정에서 권한을 허용해주세요.
          </Text>
          <Button
            title="설정 열기"
            onPress={openSettings}
            variant="primary"
            style={styles.settingsButton}
            accessibilityLabel="카메라 권한 설정 열기"
          />
          <Button
            title="다시 시도"
            onPress={requestPermission}
            variant="secondary"
            style={styles.retryButton}
            accessibilityLabel="카메라 권한 다시 요청"
          />
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render camera view
   */
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={setCameraRef}
          style={styles.camera}
          facing="back"
          testID="camera-view"
        />

        <View style={styles.controls}>
          {error && (
            <ErrorMessage
              message={error}
              style={styles.errorMessage}
              accessibilityLabel={`오류: ${error}`}
            />
          )}

          <Button
            title="사진 촬영"
            onPress={handleCapture}
            variant="primary"
            size="large"
            loading={isLoading}
            disabled={isLoading}
            style={styles.captureButton}
            accessibilityLabel="사진 촬영하기"
            accessibilityHint="카메라로 사진을 촬영합니다"
          />

          <TouchableOpacity
            onPress={() => router.push('/photoList')}
            style={styles.viewPhotosButton}
            accessibilityLabel="저장된 사진 목록 보기"
            accessibilityRole="button"
          >
            <Text style={styles.viewPhotosText}>사진 목록 보기</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>사진 미리보기</Text>

            {capturedPhoto && (
              <Image
                source={{ uri: capturedPhoto.uri }}
                style={styles.previewImage}
                resizeMode="contain"
                testID="photo-preview"
                accessibilityLabel="촬영된 사진 미리보기"
              />
            )}

            <View style={styles.previewActions}>
              <Button
                title="저장"
                onPress={handleSave}
                variant="primary"
                size="large"
                loading={isLoading}
                disabled={isLoading}
                style={styles.saveButton}
                accessibilityLabel="사진 저장"
                accessibilityHint="사진을 데이터베이스에 저장합니다"
              />
              <Button
                title="취소"
                onPress={handleCancel}
                variant="secondary"
                size="large"
                disabled={isLoading}
                style={styles.cancelButton}
                accessibilityLabel="사진 촬영 취소"
                accessibilityHint="사진을 저장하지 않고 카메라로 돌아갑니다"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorMessage: {
    marginBottom: 16,
  },
  captureButton: {
    marginBottom: 12,
  },
  viewPhotosButton: {
    padding: 12,
    alignItems: 'center',
  },
  viewPhotosText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  settingsButton: {
    marginBottom: 12,
    minWidth: 200,
  },
  retryButton: {
    minWidth: 200,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewContainer: {
    flex: 1,
    padding: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,  // 비율 유지
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  previewActions: {
    marginTop: 20,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 0,
  },
});
