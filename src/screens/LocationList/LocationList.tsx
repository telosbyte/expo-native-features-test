/**
 * LocationList - Component for displaying saved location records
 *
 * @module screens/LocationList/LocationList
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '@/services/database/DatabaseService';
import { LocationRepository } from '@/services/database/LocationRepository';
import { LocationRecord } from '@/types/Location';
import { Button } from '@/components/Button';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';
import { getSpacing, normalizeFont, getShadowStyle, wp } from '@/src/utils/responsive';

/**
 * LocationList component props
 */
export interface LocationListProps {
  /** Callback when location is deleted */
  onLocationDeleted?: (id: number) => void;
  /** Callback when location is pressed */
  onLocationPress?: (location: LocationRecord) => void;
}

/**
 * GPS accuracy level labels
 */
const getAccuracyLabel = (accuracy: number | undefined): string => {
  if (!accuracy) return '알 수 없음';
  if (accuracy <= 10) return '매우 정확';
  if (accuracy <= 50) return '정확';
  if (accuracy <= 100) return '보통';
  if (accuracy <= 500) return '부정확';
  return '매우 부정확';
};

/**
 * GPS accuracy level color
 */
const getAccuracyColor = (accuracy: number | undefined): string => {
  if (!accuracy) return '#999999';
  if (accuracy <= 10) return '#4CAF50'; // Green
  if (accuracy <= 50) return '#8BC34A'; // Light green
  if (accuracy <= 100) return '#FFC107'; // Amber
  if (accuracy <= 500) return '#FF9800'; // Orange
  return '#F44336'; // Red
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * LocationList component for displaying saved location records
 *
 * Features:
 * - List of location records
 * - Location metadata display (coordinates, accuracy, date)
 * - Delete functionality with confirmation
 * - Empty state
 * - Pull to refresh
 * - Accuracy indicator
 *
 * @example
 * ```tsx
 * <LocationList
 *   onLocationDeleted={(id) => console.log('Deleted:', id)}
 *   onLocationPress={(location) => console.log('Pressed:', location)}
 * />
 * ```
 */
export const LocationList: React.FC<LocationListProps> = ({
  onLocationDeleted,
  onLocationPress,
}) => {
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load locations from database
   */
  const loadLocations = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const db = DatabaseService.getInstance().getDatabase();
      const repository = new LocationRepository(db);

      const loadedLocations = await repository.findAll({
        orderBy: 'created_at',
        order: 'DESC',
        limit: 50,
      });

      setLocations(loadedLocations);
    } catch (err) {
      console.error('[LocationList] Failed to load locations:', err);
      setError('위치 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Load locations on mount
   */
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadLocations(true);
  }, [loadLocations]);

  /**
   * Handle delete location
   */
  const handleDelete = useCallback(
    async (location: LocationRecord) => {
      Alert.alert(
        '위치 삭제',
        '이 위치 기록을 삭제하시겠습니까?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                const db = DatabaseService.getInstance().getDatabase();
                const repository = new LocationRepository(db);

                const deleted = await repository.delete(location.id);

                if (deleted) {
                  setLocations((prev) => prev.filter((l) => l.id !== location.id));
                  onLocationDeleted?.(location.id);
                } else {
                  Alert.alert('오류', '위치 삭제에 실패했습니다');
                }
              } catch (err) {
                console.error('[LocationList] Failed to delete location:', err);
                Alert.alert('오류', '위치 삭제 중 오류가 발생했습니다');
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [onLocationDeleted]
  );

  /**
   * Render location item
   */
  const renderLocationItem = useCallback(
    ({ item }: { item: LocationRecord }) => (
      <TouchableOpacity
        style={styles.locationItem}
        onPress={() => onLocationPress?.(item)}
        accessibilityLabel={`위치 기록: 위도 ${item.latitude.toFixed(
          4
        )}, 경도 ${item.longitude.toFixed(4)}`}
        accessibilityRole="button"
      >
        <View style={styles.locationHeader}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={24} color="#007AFF" />
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.coordinates}>
              {item.latitude.toFixed(6)}°, {item.longitude.toFixed(6)}°
            </Text>
            <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteButton}
            accessibilityLabel="위치 삭제"
            accessibilityRole="button"
            accessibilityHint="이 위치 기록을 삭제합니다"
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>

        <View style={styles.locationDetails}>
          {item.accuracy !== undefined && (
            <View style={styles.detailItem}>
              <Ionicons
                name="radio-outline"
                size={16}
                color={getAccuracyColor(item.accuracy)}
              />
              <Text
                style={[
                  styles.detailText,
                  { color: getAccuracyColor(item.accuracy) },
                ]}
              >
                {getAccuracyLabel(item.accuracy)} ({item.accuracy.toFixed(1)}m)
              </Text>
            </View>
          )}

          {item.altitude !== undefined && item.altitude !== null && (
            <View style={styles.detailItem}>
              <Ionicons name="trending-up-outline" size={16} color="#666" />
              <Text style={styles.detailText}>고도: {item.altitude.toFixed(1)}m</Text>
            </View>
          )}

          {item.speed !== undefined && item.speed !== null && item.speed > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                속도: {(item.speed * 3.6).toFixed(1)} km/h
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [handleDelete, onLocationPress]
  );

  /**
   * Render empty state
   */
  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons name="location-outline" size={64} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>저장된 위치가 없습니다</Text>
        <Text style={styles.emptyMessage}>
          위치 탭에서 현재 위치를 조회하고 저장해보세요.
        </Text>
      </View>
    ),
    []
  );

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingIndicator
          message="위치 목록 불러오는 중..."
          fullScreen
          accessibilityLabel="위치 목록 로딩 중"
        />
      </View>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} style={styles.errorMessage} />
        <Button
          title="다시 시도"
          onPress={() => loadLocations()}
          variant="primary"
          style={styles.retryButton}
          accessibilityLabel="위치 목록 다시 불러오기"
        />
      </View>
    );
  }

  /**
   * Render location list
   */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>저장된 위치 ({locations.length})</Text>
      </View>

      <FlatList
        data={locations}
        renderItem={renderLocationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            title="새로고침..."
          />
        }
        accessibilityLabel="위치 목록"
      />
    </View>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: normalizeFont(18),
    fontWeight: 'bold',
    color: '#000000',
  },
  listContent: {
    padding: spacing.sm,
  },
  locationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...getShadowStyle(3),
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  locationInfo: {
    flex: 1,
  },
  coordinates: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
    color: '#000000',
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: normalizeFont(14),
    color: '#666666',
  },
  deleteButton: {
    padding: spacing.xs,
  },
  locationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: normalizeFont(14),
    color: '#666666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
    color: '#999999',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyMessage: {
    fontSize: normalizeFont(16),
    color: '#CCCCCC',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorMessage: {
    margin: spacing.sm,
  },
  retryButton: {
    marginHorizontal: spacing.sm,
  },
});
