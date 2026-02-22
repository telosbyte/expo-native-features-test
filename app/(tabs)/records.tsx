import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSpacing, normalizeFont, getShadowStyle } from '@/src/utils/responsive';
import { DatabaseService } from '@/src/services/database/DatabaseService';
import { PhotoRepository } from '@/src/services/database/PhotoRepository';
import { FileRepository } from '@/src/services/database/FileRepository';
import { LocationRepository } from '@/src/services/database/LocationRepository';
import { BarcodeRepository } from '@/src/services/database/BarcodeRepository';

type RecordCounts = {
  photos: number;
  files: number;
  locations: number;
  barcodes: number;
  total: number;
};

const RECORD_WARNING_THRESHOLD = 80;
const RECORD_LIMIT = 100;

export default function RecordsScreen() {
  const [counts, setCounts] = useState<RecordCounts>({
    photos: 0,
    files: 0,
    locations: 0,
    barcodes: 0,
    total: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance().getDatabase();

      const photoRepo = new PhotoRepository(db);
      const fileRepo = new FileRepository(db);
      const locationRepo = new LocationRepository(db);
      const barcodeRepo = new BarcodeRepository(db);

      const [photosCount, filesCount, locationsCount, barcodesCount] = await Promise.all([
        photoRepo.count(),
        fileRepo.count(),
        locationRepo.count(),
        barcodeRepo.count(),
      ]);

      const total = photosCount + filesCount + locationsCount + barcodesCount;

      setCounts({
        photos: photosCount,
        files: filesCount,
        locations: locationsCount,
        barcodes: barcodesCount,
        total,
      });
    } catch (error) {
      console.error('[RecordsScreen] Failed to load counts:', error);
      Alert.alert('Error', 'Failed to load record counts');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCounts();
    setRefreshing(false);
  }, [loadCounts]);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts])
  );

  const handleDeleteAll = useCallback((type: 'photos' | 'files' | 'locations' | 'barcodes') => {
    const typeLabels = {
      photos: 'Photos',
      files: 'Files',
      locations: 'Locations',
      barcodes: 'Barcodes',
    };

    Alert.alert(
      `Delete All ${typeLabels[type]}`,
      `Are you sure you want to delete all ${counts[type]} ${type}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = DatabaseService.getInstance().getDatabase();
              let deleted = 0;

              switch (type) {
                case 'photos':
                  deleted = await new PhotoRepository(db).deleteAll();
                  break;
                case 'files':
                  deleted = await new FileRepository(db).deleteAll();
                  break;
                case 'locations':
                  deleted = await new LocationRepository(db).deleteAll();
                  break;
                case 'barcodes':
                  deleted = await new BarcodeRepository(db).deleteAll();
                  break;
              }

              Alert.alert('Success', `Deleted ${deleted} ${type}`);
              await loadCounts();
            } catch (error) {
              console.error(`[RecordsScreen] Failed to delete all ${type}:`, error);
              Alert.alert('Error', `Failed to delete ${type}`);
            }
          },
        },
      ]
    );
  }, [counts, loadCounts]);

  const handleCleanupSuggestion = useCallback(() => {
    Alert.alert(
      'Auto-Cleanup Suggestion',
      'Your app has exceeded 100 records. Consider cleaning up old data to improve performance:\n\n' +
      '• Delete old photos\n' +
      '• Remove unnecessary files\n' +
      '• Clear location history\n' +
      '• Clean up duplicate barcodes\n\n' +
      'Would you like to delete the oldest records automatically?',
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'View Details',
          onPress: () => {
            Alert.alert(
              'Cleanup Options',
              `Current records:\n\n` +
              `Photos: ${counts.photos}\n` +
              `Files: ${counts.files}\n` +
              `Locations: ${counts.locations}\n` +
              `Barcodes: ${counts.barcodes}\n\n` +
              'Use the "Delete All" buttons below to clean up specific categories.'
            );
          },
        },
      ]
    );
  }, [counts]);

  const getWarningColor = () => {
    if (counts.total >= RECORD_LIMIT) return '#DC2626';
    if (counts.total >= RECORD_WARNING_THRESHOLD) return '#F59E0B';
    return '#10B981';
  };

  const getWarningMessage = () => {
    if (counts.total >= RECORD_LIMIT) {
      return `⚠️ Record limit exceeded! (${counts.total}/${RECORD_LIMIT})`;
    }
    if (counts.total >= RECORD_WARNING_THRESHOLD) {
      return `⚠️ Approaching limit (${counts.total}/${RECORD_LIMIT})`;
    }
    return `✓ Records: ${counts.total}/${RECORD_LIMIT}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Total Count Header */}
      <View style={[styles.totalCard, { borderLeftColor: getWarningColor() }]}>
        <Text style={styles.totalTitle}>Total Records</Text>
        <Text style={[styles.totalCount, { color: getWarningColor() }]}>
          {counts.total}
        </Text>
        <Text style={[styles.warningText, { color: getWarningColor() }]}>
          {getWarningMessage()}
        </Text>
      </View>

      {/* Auto-Cleanup Suggestion */}
      {counts.total >= RECORD_LIMIT && (
        <TouchableOpacity
          style={styles.cleanupSuggestion}
          onPress={handleCleanupSuggestion}
          accessibilityLabel="Auto-cleanup suggestion"
          accessibilityHint="Tap to view cleanup options"
        >
          <Text style={styles.cleanupIcon}>🧹</Text>
          <View style={styles.cleanupTextContainer}>
            <Text style={styles.cleanupTitle}>Storage Cleanup Recommended</Text>
            <Text style={styles.cleanupSubtitle}>
              Tap to optimize storage and improve performance
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Summary Cards */}
      <Text style={styles.sectionTitle}>Record Summary</Text>

      <View style={styles.cardsContainer}>
        {/* Photos Card */}
        <View style={[styles.card, styles.photoCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📷</Text>
            <Text style={styles.cardTitle}>Photos</Text>
          </View>
          <Text style={styles.cardCount}>{counts.photos}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, counts.photos === 0 && styles.deleteButtonDisabled]}
            onPress={() => handleDeleteAll('photos')}
            disabled={counts.photos === 0}
            accessibilityLabel="Delete all photos"
            accessibilityHint={`Delete all ${counts.photos} photos`}
          >
            <Text style={styles.deleteButtonText}>Delete All</Text>
          </TouchableOpacity>
        </View>

        {/* Files Card */}
        <View style={[styles.card, styles.fileCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📄</Text>
            <Text style={styles.cardTitle}>Files</Text>
          </View>
          <Text style={styles.cardCount}>{counts.files}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, counts.files === 0 && styles.deleteButtonDisabled]}
            onPress={() => handleDeleteAll('files')}
            disabled={counts.files === 0}
            accessibilityLabel="Delete all files"
            accessibilityHint={`Delete all ${counts.files} files`}
          >
            <Text style={styles.deleteButtonText}>Delete All</Text>
          </TouchableOpacity>
        </View>

        {/* Locations Card */}
        <View style={[styles.card, styles.locationCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📍</Text>
            <Text style={styles.cardTitle}>Locations</Text>
          </View>
          <Text style={styles.cardCount}>{counts.locations}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, counts.locations === 0 && styles.deleteButtonDisabled]}
            onPress={() => handleDeleteAll('locations')}
            disabled={counts.locations === 0}
            accessibilityLabel="Delete all locations"
            accessibilityHint={`Delete all ${counts.locations} locations`}
          >
            <Text style={styles.deleteButtonText}>Delete All</Text>
          </TouchableOpacity>
        </View>

        {/* Barcodes Card */}
        <View style={[styles.card, styles.barcodeCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔖</Text>
            <Text style={styles.cardTitle}>Barcodes</Text>
          </View>
          <Text style={styles.cardCount}>{counts.barcodes}</Text>
          <TouchableOpacity
            style={[styles.deleteButton, counts.barcodes === 0 && styles.deleteButtonDisabled]}
            onPress={() => handleDeleteAll('barcodes')}
            disabled={counts.barcodes === 0}
            accessibilityLabel="Delete all barcodes"
            accessibilityHint={`Delete all ${counts.barcodes} barcodes`}
          >
            <Text style={styles.deleteButtonText}>Delete All</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Records</Text>
        <Text style={styles.infoText}>
          This screen shows the total count of all saved records across different categories.
          {'\n\n'}
          • Photos: Images captured with the camera{'\n'}
          • Files: Documents and images selected from device{'\n'}
          • Locations: GPS coordinates saved from location tracking{'\n'}
          • Barcodes: QR codes and barcodes scanned with the camera{'\n\n'}
          Keep your records below {RECORD_LIMIT} for optimal performance.
        </Text>
      </View>
    </ScrollView>
  );
}

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: spacing.sm,
    paddingBottom: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: normalizeFont(16),
    color: '#6B7280',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    ...getShadowStyle(2),
  },
  totalTitle: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalCount: {
    fontSize: normalizeFont(48),
    fontWeight: 'bold',
    marginVertical: spacing.xs,
  },
  warningText: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
  },
  cleanupSuggestion: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  cleanupIcon: {
    fontSize: normalizeFont(32),
    marginRight: spacing.sm,
  },
  cleanupTextContainer: {
    flex: 1,
  },
  cleanupTitle: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
    color: '#92400E',
    marginBottom: spacing.xs,
  },
  cleanupSubtitle: {
    fontSize: normalizeFont(14),
    color: '#78350F',
  },
  sectionTitle: {
    fontSize: normalizeFont(20),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.sm,
  },
  card: {
    width: '50%',
    padding: spacing.xs,
  },
  photoCard: {},
  fileCard: {},
  locationCard: {},
  barcodeCard: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardIcon: {
    fontSize: normalizeFont(24),
    marginRight: spacing.xs,
  },
  cardTitle: {
    fontSize: normalizeFont(16),
    fontWeight: '600',
    color: '#374151',
  },
  cardCount: {
    fontSize: normalizeFont(36),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: normalizeFont(14),
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.sm,
    marginTop: spacing.xs,
    ...getShadowStyle(2),
  },
  infoTitle: {
    fontSize: normalizeFont(18),
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: normalizeFont(14),
    color: '#6B7280',
    lineHeight: normalizeFont(20),
  },
});
