/**
 * BarcodeList - List of scanned barcodes
 *
 * @module screens/BarcodeList/BarcodeList
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { DatabaseService } from '@/services/database/DatabaseService';
import { BarcodeRepository } from '@/services/database/BarcodeRepository';
import { ScannedBarcode, BarcodeType } from '@/types/Barcode';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { getSpacing, normalizeFont, wp } from '@/src/utils/responsive';

/**
 * BarcodeList props
 */
interface BarcodeListProps {
  onBarcodePress?: (barcode: ScannedBarcode) => void;
}

/**
 * BarcodeList component
 *
 * Displays a list of scanned barcodes with filtering and deletion capabilities
 */
export const BarcodeList: React.FC<BarcodeListProps> = ({ onBarcodePress }) => {
  const [barcodes, setBarcodes] = useState<ScannedBarcode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<BarcodeType | 'ALL'>('ALL');

  const barcodeTypes: Array<BarcodeType | 'ALL'> = [
    'ALL',
    'QR',
    'EAN13',
    'CODE128',
    'EAN8',
    'UPCE',
    'CODE39',
    'ITF14',
    'AZTEC',
    'PDF417',
    'DATAMATRIX',
    'CODE93',
    'CODABAR',
    'UPC_A',
  ];

  /**
   * Load barcodes from database
   */
  const loadBarcodes = useCallback(async () => {
    try {
      setError(null);
      const db = DatabaseService.getInstance().getDatabase();
      const repository = new BarcodeRepository(db);

      const options = selectedType === 'ALL' ? {} : { typeFilter: selectedType };
      const loadedBarcodes = await repository.findAll(options);

      setBarcodes(loadedBarcodes);
    } catch (err) {
      console.error('[BarcodeList] Failed to load barcodes:', err);
      setError('바코드 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadBarcodes();
  }, [loadBarcodes]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadBarcodes();
  }, [loadBarcodes]);

  /**
   * Handle delete barcode with confirmation
   */
  const handleDelete = useCallback((barcode: ScannedBarcode) => {
    Alert.alert(
      '바코드 삭제',
      '이 바코드를 삭제하시겠습니까?',
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
              const repository = new BarcodeRepository(db);

              await repository.delete(barcode.id);
              await loadBarcodes();

              Alert.alert('삭제 완료', '바코드가 삭제되었습니다');
            } catch (err) {
              console.error('[BarcodeList] Failed to delete barcode:', err);
              Alert.alert('삭제 실패', '바코드 삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  }, [loadBarcodes]);

  /**
   * Handle delete all with confirmation
   */
  const handleDeleteAll = useCallback(() => {
    if (barcodes.length === 0) {
      Alert.alert('알림', '삭제할 바코드가 없습니다');
      return;
    }

    Alert.alert(
      '전체 삭제',
      `모든 바코드(${barcodes.length}개)를 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = DatabaseService.getInstance().getDatabase();
              const repository = new BarcodeRepository(db);

              await repository.deleteAll();
              await loadBarcodes();

              Alert.alert('삭제 완료', '모든 바코드가 삭제되었습니다');
            } catch (err) {
              console.error('[BarcodeList] Failed to delete all barcodes:', err);
              Alert.alert('삭제 실패', '바코드 삭제에 실패했습니다');
            }
          },
        },
      ]
    );
  }, [barcodes.length, loadBarcodes]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get barcode type display name
   */
  const getBarcodeTypeName = (type: BarcodeType | 'ALL'): string => {
    if (type === 'ALL') return '전체';

    const typeNames: Record<BarcodeType, string> = {
      QR: 'QR',
      EAN13: 'EAN-13',
      EAN8: 'EAN-8',
      UPCE: 'UPC-E',
      CODE39: 'CODE-39',
      CODE128: 'CODE-128',
      ITF14: 'ITF-14',
      AZTEC: 'AZTEC',
      PDF417: 'PDF417',
      DATAMATRIX: 'DATA MATRIX',
      CODE93: 'CODE-93',
      CODABAR: 'CODABAR',
      UPC_A: 'UPC-A',
    };

    return typeNames[type] || type;
  };

  /**
   * Render barcode item
   */
  const renderBarcodeItem = ({ item }: { item: ScannedBarcode }) => (
    <Card style={styles.barcodeCard}>
      <TouchableOpacity
        onPress={() => onBarcodePress?.(item)}
        accessibilityLabel={`바코드 ${item.type} ${item.data}`}
      >
        <View style={styles.barcodeHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.scanned_at)}
          </Text>
        </View>

        <Text style={styles.barcodeData} numberOfLines={2}>
          {item.data}
        </Text>

        {item.raw_value && (
          <Text style={styles.rawValue} numberOfLines={1}>
            원본: {item.raw_value}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item)}
        accessibilityLabel={`바코드 삭제`}
      >
        <Text style={styles.deleteButtonText}>삭제</Text>
      </TouchableOpacity>
    </Card>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {selectedType === 'ALL'
          ? '스캔한 바코드가 없습니다'
          : `${getBarcodeTypeName(selectedType)} 바코드가 없습니다`}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Type filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={barcodeTypes}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedType === item && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedType(item)}
              accessibilityLabel={`${getBarcodeTypeName(item)} 필터`}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedType === item && styles.filterButtonTextActive,
                ]}
              >
                {getBarcodeTypeName(item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Barcode count and delete all button */}
      <View style={styles.headerContainer}>
        <Text style={styles.countText}>
          총 {barcodes.length}개
        </Text>
        {barcodes.length > 0 && (
          <TouchableOpacity
            onPress={handleDeleteAll}
            accessibilityLabel="전체 삭제"
          >
            <Text style={styles.deleteAllText}>전체 삭제</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {error && <ErrorMessage message={error} />}

      {/* Barcode list */}
      <FlatList
        data={barcodes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBarcodeItem}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterContainer: {
    backgroundColor: '#f5f5f5',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: normalizeFont(14),
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: '#f9f9f9',
  },
  countText: {
    fontSize: normalizeFont(14),
    color: '#666',
  },
  deleteAllText: {
    fontSize: normalizeFont(14),
    color: '#ff3b30',
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.sm,
  },
  barcodeCard: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  barcodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: normalizeFont(12),
    fontWeight: '600',
  },
  timestamp: {
    fontSize: normalizeFont(12),
    color: '#999',
  },
  barcodeData: {
    fontSize: normalizeFont(16),
    color: '#333',
    marginBottom: spacing.xs,
  },
  rawValue: {
    fontSize: normalizeFont(12),
    color: '#999',
    fontStyle: 'italic',
  },
  deleteButton: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: normalizeFont(14),
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: normalizeFont(16),
    color: '#999',
  },
});
