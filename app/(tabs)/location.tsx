/**
 * LocationScreen - GPS location tracking screen
 *
 * @module app/(tabs)/location
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLocation, LocationData } from '@/hooks/useLocation';
import { getSpacing, normalizeFont, getShadowStyle, wp } from '@/src/utils/responsive';
import { Button } from '@/src/components/Button';
import { LoadingIndicator } from '@/src/components/LoadingIndicator';
import { ErrorMessage } from '@/src/components/ErrorMessage';

/**
 * GPS accuracy level labels
 */
const getAccuracyLabel = (accuracy: number): string => {
  if (accuracy <= 10) return '매우 정확';
  if (accuracy <= 50) return '정확';
  if (accuracy <= 100) return '보통';
  if (accuracy <= 500) return '부정확';
  return '매우 부정확';
};

/**
 * GPS accuracy level color
 */
const getAccuracyColor = (accuracy: number): string => {
  if (accuracy <= 10) return '#4CAF50'; // Green
  if (accuracy <= 50) return '#8BC34A'; // Light green
  if (accuracy <= 100) return '#FFC107'; // Amber
  if (accuracy <= 500) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

/**
 * Location screen component for GPS tracking
 *
 * Features:
 * - Location permission handling
 * - GPS location fetching with 10s timeout
 * - Accuracy indicator
 * - Location save
 * - Navigation to location list
 */
export default function LocationScreen() {
  const {
    hasPermission,
    isLoading,
    error,
    currentLocation,
    requestPermission,
    getCurrentLocation,
    saveLocation,
    clearLocation,
    openSettings,
  } = useLocation();

  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [showWeakSignalWarning, setShowWeakSignalWarning] = useState(false);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Check for weak GPS signal
  useEffect(() => {
    if (currentLocation && currentLocation.accuracy > 500) {
      setShowWeakSignalWarning(true);
    } else {
      setShowWeakSignalWarning(false);
    }
  }, [currentLocation]);

  /**
   * Handle get location with timeout progress
   */
  const handleGetLocation = async () => {
    setTimeoutProgress(0);
    setShowWeakSignalWarning(false);

    // Start timeout countdown
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / timeout) * 100, 100);
      setTimeoutProgress(progress);

      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 100);

    try {
      const location = await getCurrentLocation({ timeout });
      clearInterval(progressInterval);
      setTimeoutProgress(0);
    } catch (err) {
      clearInterval(progressInterval);
      setTimeoutProgress(0);
    }
  };

  /**
   * Handle save location
   */
  const handleSave = async () => {
    if (!currentLocation) return;

    try {
      await saveLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        altitude: currentLocation.altitude ?? undefined,
        heading: currentLocation.heading ?? undefined,
        speed: currentLocation.speed ?? undefined,
      });

      clearLocation();

      Alert.alert('성공', '위치가 저장되었습니다', [
        {
          text: '확인',
          onPress: () => {},
        },
        {
          text: '위치 목록 보기',
          onPress: () => router.push('/locationList'),
        },
      ]);
    } catch (err) {
      Alert.alert('오류', '위치 저장에 실패했습니다');
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    clearLocation();
    setShowWeakSignalWarning(false);
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
          testID="loading-indicator"
          accessibilityLabel="위치 권한 확인 중"
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
          <Ionicons name="location-outline" size={64} color="#999" />
          <Text style={styles.permissionTitle}>위치 권한이 필요합니다</Text>
          <Text style={styles.permissionMessage}>
            현재 위치를 조회하려면 위치 접근 권한이 필요합니다.{'\n'}
            설정에서 권한을 허용해주세요.
          </Text>
          <Button
            title="설정 열기"
            onPress={openSettings}
            variant="primary"
            style={styles.settingsButton}
            accessibilityLabel="위치 권한 설정 열기"
          />
          <Button
            title="다시 시도"
            onPress={requestPermission}
            variant="secondary"
            style={styles.retryButton}
            accessibilityLabel="위치 권한 다시 요청"
          />
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render location view
   */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="location" size={48} color="#007AFF" />
            <Text style={styles.title}>GPS 위치 추적</Text>
            <Text style={styles.subtitle}>현재 위치를 조회하고 저장합니다</Text>
          </View>

          {error && (
            <ErrorMessage
              message={error}
              style={styles.errorMessage}
              accessibilityLabel={`오류: ${error}`}
            />
          )}

          {showWeakSignalWarning && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={24} color="#FF9800" />
              <Text style={styles.warningText}>
                위치 정확도가 낮습니다. 실외로 이동하거나 다시 시도해주세요.
              </Text>
            </View>
          )}

          {isLoading && timeoutProgress > 0 && (
            <View style={styles.progressContainer}>
              <LoadingIndicator
                message="위치 조회 중..."
                testID="loading-indicator"
                accessibilityLabel="위치 조회 중"
              />
              <Text style={styles.progressText}>
                {Math.ceil((10000 - (timeoutProgress / 100) * 10000) / 1000)}초 남음
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${timeoutProgress}%` }]}
                />
              </View>
            </View>
          )}

          {!currentLocation && !isLoading && (
            <Button
              title="현재 위치 조회"
              onPress={handleGetLocation}
              variant="primary"
              size="large"
              loading={isLoading}
              disabled={isLoading}
              style={styles.getLocationButton}
              accessibilityLabel="현재 위치 조회하기"
              accessibilityHint="GPS로 현재 위치를 조회합니다"
            />
          )}

          {currentLocation && !isLoading && (
            <View style={styles.locationContainer} testID="location-preview">
              <Text style={styles.locationTitle}>현재 위치 정보</Text>

              <View style={styles.locationInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>위도:</Text>
                  <Text style={styles.infoValue}>
                    {currentLocation.latitude.toFixed(6)}°
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>경도:</Text>
                  <Text style={styles.infoValue}>
                    {currentLocation.longitude.toFixed(6)}°
                  </Text>
                </View>

                {currentLocation.altitude !== null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>고도:</Text>
                    <Text style={styles.infoValue}>
                      {currentLocation.altitude.toFixed(1)}m
                    </Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>정확도:</Text>
                  <View style={styles.accuracyContainer}>
                    <Text
                      style={[
                        styles.accuracyValue,
                        { color: getAccuracyColor(currentLocation.accuracy) },
                      ]}
                    >
                      {currentLocation.accuracy.toFixed(1)}m
                    </Text>
                    <Text
                      style={[
                        styles.accuracyLabel,
                        { color: getAccuracyColor(currentLocation.accuracy) },
                      ]}
                    >
                      ({getAccuracyLabel(currentLocation.accuracy)})
                    </Text>
                  </View>
                </View>

                {currentLocation.heading !== null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>방향:</Text>
                    <Text style={styles.infoValue}>
                      {currentLocation.heading.toFixed(0)}°
                    </Text>
                  </View>
                )}

                {currentLocation.speed !== null && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>속도:</Text>
                    <Text style={styles.infoValue}>
                      {(currentLocation.speed * 3.6).toFixed(1)} km/h
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                <Button
                  title="저장"
                  onPress={handleSave}
                  variant="primary"
                  size="large"
                  style={styles.saveButton}
                  accessibilityLabel="위치 정보 저장"
                  accessibilityHint="현재 위치를 데이터베이스에 저장합니다"
                />
                <Button
                  title="취소"
                  onPress={handleCancel}
                  variant="secondary"
                  size="large"
                  style={styles.cancelButton}
                  accessibilityLabel="위치 조회 취소"
                  accessibilityHint="위치 정보를 저장하지 않고 초기화합니다"
                />
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => router.push('/locationList')}
            style={styles.viewListButton}
            accessibilityLabel="저장된 위치 목록 보기"
            accessibilityRole="button"
          >
            <Ionicons name="list" size={20} color="#007AFF" />
            <Text style={styles.viewListText}>위치 목록 보기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#000000',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: normalizeFont(14),
    color: '#666666',
    textAlign: 'center',
  },
  errorMessage: {
    marginBottom: spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: normalizeFont(14),
    color: '#E65100',
    marginLeft: spacing.sm,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressText: {
    fontSize: normalizeFont(16),
    color: '#666666',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  getLocationButton: {
    marginBottom: spacing.md,
  },
  locationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...getShadowStyle(3),
  },
  locationTitle: {
    fontSize: normalizeFont(18),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  locationInfo: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: normalizeFont(16),
    color: '#666666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: normalizeFont(16),
    color: '#000000',
    fontWeight: '600',
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyValue: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  accuracyLabel: {
    fontSize: normalizeFont(14),
    fontWeight: '500',
  },
  actions: {
    gap: spacing.sm,
  },
  saveButton: {
    marginBottom: 0,
  },
  cancelButton: {
    marginBottom: 0,
  },
  viewListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    ...getShadowStyle(2),
  },
  viewListText: {
    fontSize: normalizeFont(16),
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  permissionDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  permissionTitle: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#000000',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: normalizeFont(16),
    color: '#666666',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: normalizeFont(24),
  },
  settingsButton: {
    marginBottom: spacing.sm,
    minWidth: wp(50),
  },
  retryButton: {
    minWidth: wp(50),
  },
});
