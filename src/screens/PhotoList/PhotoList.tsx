/**
 * PhotoList - Component for displaying saved photos
 *
 * @module screens/PhotoList/PhotoList
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { DatabaseService } from '@/services/database/DatabaseService';
import { PhotoRepository } from '@/services/database/PhotoRepository';
import { Photo } from '@/types/Photo';
import { Button } from '@/components/Button';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';
import { getSpacing, normalizeFont, getShadowStyle, hp } from '@/src/utils/responsive';

/**
 * PhotoList component props
 */
export interface PhotoListProps {
  /** Callback when photo is deleted */
  onPhotoDeleted?: (id: number) => void;
  /** Callback when photo is pressed */
  onPhotoPress?: (photo: Photo) => void;
}

/**
 * PhotoList component for displaying saved photos in a grid
 *
 * Features:
 * - Grid layout of photos
 * - Photo metadata display (date, size)
 * - Delete functionality
 * - Empty state
 * - Pull to refresh
 * - Pagination support
 *
 * @example
 * ```tsx
 * <PhotoList
 *   onPhotoDeleted={(id) => console.log('Deleted:', id)}
 *   onPhotoPress={(photo) => console.log('Pressed:', photo)}
 * />
 * ```
 */
export const PhotoList: React.FC<PhotoListProps> = ({
  onPhotoDeleted,
  onPhotoPress,
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load photos from database
   */
  const loadPhotos = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const db = DatabaseService.getInstance().getDatabase();
      const repository = new PhotoRepository(db);

      const loadedPhotos = await repository.findAll({
        orderBy: 'created_at',
        order: 'DESC',
        limit: 50,
      });

      setPhotos(loadedPhotos);
    } catch (err) {
      console.error('[PhotoList] Failed to load photos:', err);
      setError('사진 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Load photos on mount
   */
  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadPhotos(true);
  }, [loadPhotos]);

  /**
   * Handle delete photo
   */
  const handleDelete = useCallback(
    async (photo: Photo) => {
      Alert.alert(
        '사진 삭제',
        '이 사진을 삭제하시겠습니까?',
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
                const repository = new PhotoRepository(db);

                const deleted = await repository.delete(photo.id);

                if (deleted) {
                  setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                  onPhotoDeleted?.(photo.id);
                } else {
                  Alert.alert('오류', '사진 삭제에 실패했습니다');
                }
              } catch (err) {
                console.error('[PhotoList] Failed to delete photo:', err);
                Alert.alert('오류', '사진 삭제 중 오류가 발생했습니다');
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [onPhotoDeleted]
  );

  /**
   * Format file size
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '알 수 없음';

    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      if (hours < 1) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes}분 전`;
      }
      return `${hours}시간 전`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}일 전`;
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Render photo item
   */
  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoItem}
      onPress={() => onPhotoPress?.(item)}
      accessibilityLabel={`사진 ${item.id}, ${formatDate(item.created_at)} 촬영`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: item.uri }}
        style={styles.photoImage}
        resizeMode="cover"
        accessibilityLabel="사진 썸네일"
      />
      <View style={styles.photoInfo}>
        <Text style={styles.photoDate} numberOfLines={1}>
          {formatDate(item.created_at)}
        </Text>
        <Text style={styles.photoSize} numberOfLines={1}>
          {formatFileSize(item.file_size)}
        </Text>
        {item.width && item.height && (
          <Text style={styles.photoDimensions} numberOfLines={1}>
            {item.width} × {item.height}
          </Text>
        )}
      </View>
      <Button
        title="삭제"
        onPress={() => handleDelete(item)}
        variant="danger"
        size="small"
        style={styles.deleteButton}
        accessibilityLabel={`사진 ${item.id} 삭제`}
        accessibilityHint="사진을 영구적으로 삭제합니다"
      />
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>저장된 사진이 없습니다</Text>
      <Text style={styles.emptyStateMessage}>
        카메라로 사진을 촬영하여 저장해보세요
      </Text>
    </View>
  );

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingIndicator
          message="사진 목록 불러오는 중..."
          fullScreen
          accessibilityLabel="사진 목록 로딩 중"
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
          onPress={() => loadPhotos()}
          variant="primary"
          style={styles.retryButton}
          accessibilityLabel="사진 목록 다시 불러오기"
        />
      </View>
    );
  }

  /**
   * Render photo list
   */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>사진 목록</Text>
        <Text style={styles.headerSubtitle}>총 {photos.length}장</Text>
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        accessibilityLabel="사진 목록"
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
    padding: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: normalizeFont(14),
    color: '#666666',
  },
  listContent: {
    padding: spacing.xs,
  },
  photoItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...getShadowStyle(2),
  },
  photoImage: {
    width: '100%',
    height: hp(25),
    backgroundColor: '#E5E5EA',
  },
  photoInfo: {
    padding: spacing.sm,
  },
  photoDate: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
    color: '#000000',
    marginBottom: spacing.xs,
  },
  photoSize: {
    fontSize: normalizeFont(12),
    color: '#666666',
    marginBottom: 2,
  },
  photoDimensions: {
    fontSize: normalizeFont(12),
    color: '#666666',
  },
  deleteButton: {
    margin: spacing.sm,
    marginTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateTitle: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: normalizeFont(16),
    color: '#666666',
    textAlign: 'center',
  },
  errorMessage: {
    margin: spacing.md,
  },
  retryButton: {
    marginHorizontal: spacing.md,
  },
});
