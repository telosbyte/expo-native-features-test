/**
 * FileList - Display and manage saved files
 *
 * @module screens/FileList/FileList
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { DatabaseService } from '@/services/database/DatabaseService';
import { FileRepository } from '@/services/database/FileRepository';
import { UploadedFile } from '@/types/File';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { ErrorMessage } from '@/components/ErrorMessage';
import { getSpacing, normalizeFont, getShadowStyle, wp } from '@/src/utils/responsive';

/**
 * MIME type filter options
 */
type MimeTypeFilter = 'all' | 'images' | 'documents';

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
 * Format date to Korean locale
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get MIME type filter pattern
 */
const getMimeTypePattern = (filter: MimeTypeFilter): string | undefined => {
  switch (filter) {
    case 'images':
      return 'image/*';
    case 'documents':
      return 'application/*';
    case 'all':
    default:
      return undefined;
  }
};

/**
 * FileList Component Props
 */
export interface FileListProps {
  /** Callback when file is selected */
  onFileSelect?: (file: UploadedFile) => void;
  /** Initial MIME type filter */
  initialFilter?: MimeTypeFilter;
}

/**
 * FileList Component
 *
 * Features:
 * - Display saved files
 * - MIME type filtering (all, images, documents)
 * - File deletion with confirmation
 * - Pull to refresh
 * - Empty state
 */
export const FileList: React.FC<FileListProps> = ({
  onFileSelect,
  initialFilter = 'all',
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<MimeTypeFilter>(initialFilter);

  /**
   * Load files from database
   */
  const loadFiles = useCallback(async () => {
    try {
      setError(null);

      const db = DatabaseService.getInstance().getDatabase();
      const repository = new FileRepository(db);

      const mimeTypeFilter = getMimeTypePattern(filter);
      const loadedFiles = await repository.findAll({
        limit: 100,
        offset: 0,
        orderBy: 'uploaded_at',
        order: 'DESC',
        mimeTypeFilter,
      });

      setFiles(loadedFiles);
    } catch (err) {
      console.error('[FileList] Failed to load files:', err);
      setError('파일 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFiles();
  }, [loadFiles]);

  /**
   * Handle file deletion
   */
  const handleDelete = useCallback(
    async (file: UploadedFile) => {
      Alert.alert(
        '파일 삭제',
        `"${file.name}"을(를) 삭제하시겠습니까?`,
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
                const repository = new FileRepository(db);

                const success = await repository.delete(file.id);

                if (success) {
                  // Remove from local state
                  setFiles((prev) => prev.filter((f) => f.id !== file.id));
                } else {
                  setError('파일 삭제에 실패했습니다');
                }
              } catch (err) {
                console.error('[FileList] Failed to delete file:', err);
                setError('파일 삭제에 실패했습니다');
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    []
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilter: MimeTypeFilter) => {
    setFilter(newFilter);
    setIsLoading(true);
  }, []);

  /**
   * Load files on mount and filter change
   */
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  /**
   * Render file item
   */
  const renderFileItem = useCallback(
    ({ item }: { item: UploadedFile }) => {
      const isImage = item.mime_type?.startsWith('image/');

      return (
        <TouchableOpacity
          style={styles.fileItem}
          onPress={() => onFileSelect?.(item)}
          onLongPress={() => handleDelete(item)}
          accessibilityLabel={`파일: ${item.name}`}
          accessibilityHint="길게 눌러서 삭제"
        >
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>
              {isImage ? '🖼️' : '📄'}
            </Text>
          </View>

          <View style={styles.fileDetails}>
            <Text style={styles.fileName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.fileInfo}>
              {formatFileSize(item.size)} • {item.mime_type || '알 수 없음'}
            </Text>
            <Text style={styles.fileDate}>{formatDate(item.uploaded_at)}</Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
            accessibilityLabel={`${item.name} 삭제`}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [onFileSelect, handleDelete]
  );

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📁</Text>
        <Text style={styles.emptyStateText}>
          {filter === 'all'
            ? '저장된 파일이 없습니다'
            : filter === 'images'
            ? '저장된 이미지가 없습니다'
            : '저장된 문서가 없습니다'}
        </Text>
      </View>
    );
  }, [isLoading, filter]);

  /**
   * Render filter button
   */
  const renderFilterButton = (
    filterType: MimeTypeFilter,
    label: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => handleFilterChange(filterType)}
      accessibilityLabel={`${label} 필터`}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', '전체')}
        {renderFilterButton('images', '이미지')}
        {renderFilterButton('documents', '문서')}
      </View>

      {/* File list */}
      <FlatList
        data={files}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        testID="file-list"
      />

      {/* Error message */}
      {error && <ErrorMessage message={error} />}
    </View>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.sm,
    ...getShadowStyle(2),
  },
  fileIcon: {
    width: wp(12),
    height: wp(12),
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  fileIconText: {
    fontSize: normalizeFont(24),
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.xs,
  },
  fileInfo: {
    fontSize: normalizeFont(13),
    color: '#666',
    marginBottom: 2,
  },
  fileDate: {
    fontSize: normalizeFont(12),
    color: '#999',
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  deleteButtonText: {
    fontSize: normalizeFont(20),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateIcon: {
    fontSize: normalizeFont(64),
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: normalizeFont(16),
    color: '#999',
    textAlign: 'center',
  },
});
