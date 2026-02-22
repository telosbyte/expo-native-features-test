/**
 * Barcode Scanner Screen
 *
 * Allows users to scan barcodes/QR codes using the camera
 *
 * @module app/(tabs)/barcode
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { wp, getSpacing, normalizeFont } from '@/src/utils/responsive';
import { CameraView, BarcodeScanningResult } from 'expo-camera';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { Button } from '@/src/components/Button';
import { ErrorMessage } from '@/src/components/ErrorMessage';
import { LoadingIndicator } from '@/src/components/LoadingIndicator';
import { BarcodeType } from '@/types/Barcode';
import { router } from 'expo-router';

/**
 * Barcode Scanner Screen Component
 */
export default function BarcodeScannerScreen() {
  const {
    hasPermission,
    isScanning,
    error,
    scannedData,
    showTimeoutHint,
    requestPermission,
    startScanning,
    stopScanning,
    saveBarcode,
    openSettings,
    clearScannedData,
    handleBarcodeScanned,
  } = useBarcodeScanner();

  const [isSaving, setIsSaving] = useState(false);
  const { width } = useWindowDimensions();

  // 스캔 프레임 크기를 화면에 맞춰 동적으로 조정
  const frameSize = Math.min(wp(70), 300);

  // Request permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  /**
   * Handle barcode scanned from camera
   */
  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!result.data) return;

    handleBarcodeScanned({
      type: result.type as BarcodeType,
      data: result.data,
    });
  };

  /**
   * Handle save barcode
   */
  const handleSave = async () => {
    if (!scannedData) return;

    try {
      setIsSaving(true);
      await saveBarcode(scannedData);

      Alert.alert(
        '저장 완료',
        '바코드가 성공적으로 저장되었습니다.',
        [
          {
            text: '목록 보기',
            onPress: () => {
              clearScannedData();
              router.push('/barcode/list');
            },
          },
          {
            text: '다시 스캔',
            onPress: () => {
              clearScannedData();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('저장 실패', '바코드 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle retry scanning
   */
  const handleRetry = () => {
    stopScanning();
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  /**
   * Get barcode type display name in Korean
   */
  const getBarcodeTypeName = (type: BarcodeType): string => {
    const typeNames: Record<BarcodeType, string> = {
      QR: 'QR 코드',
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

  // Loading state
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <LoadingIndicator testID="loading-indicator" />
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>카메라 권한 필요</Text>
          <Text style={styles.message}>
            바코드를 스캔하려면 카메라 권한이 필요합니다.
          </Text>
          {error && <ErrorMessage message={error} />}
          <Button
            onPress={openSettings}
            accessibilityLabel="설정 열기"
          >
            설정 열기
          </Button>
        </View>
      </View>
    );
  }

  // Scanning state
  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={onBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'ean13',
              'ean8',
              'upc_e',
              'code39',
              'code128',
              'itf14',
              'aztec',
              'pdf417',
              'datamatrix',
              'code93',
              'codabar',
              'upc_a',
            ],
          }}
          testID="camera-view"
        >
          {/* Scanning overlay with frame indicator */}
          <View style={styles.overlay} testID="scan-overlay">
            <View style={[styles.scanFrame, { width: frameSize, height: frameSize }]} testID="scan-frame">
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <Text style={styles.scanHint}>
              바코드를 스캔 영역에 맞춰주세요
            </Text>

            {/* Timeout hint */}
            {showTimeoutHint && (
              <View style={styles.timeoutHint}>
                <Text style={styles.timeoutText}>
                  바코드가 인식되지 않습니다.{'\n'}
                  조명을 확인하거나 바코드를 다시 비춰주세요.
                </Text>
                <Button
                  onPress={handleRetry}
                  accessibilityLabel="다시 시도"
                >
                  다시 시도
                </Button>
              </View>
            )}
          </View>
        </CameraView>

        <View style={styles.controlsContainer}>
          <Button
            onPress={stopScanning}
            accessibilityLabel="스캔 중지"
          >
            스캔 중지
          </Button>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <ErrorMessage message={error} />
          </View>
        )}
      </View>
    );
  }

  // Scanned data preview
  if (scannedData) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer} testID="barcode-preview">
          <Text style={styles.title}>스캔 완료</Text>

          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>바코드 타입</Text>
              <Text style={styles.previewValue}>
                {getBarcodeTypeName(scannedData.type)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>데이터</Text>
            </View>
            <ScrollView style={styles.dataScrollView}>
              <Text style={styles.dataValue} selectable>
                {scannedData.data}
              </Text>
            </ScrollView>
          </View>

          <View style={styles.buttonGroup}>
            <Button
              onPress={handleSave}
              accessibilityLabel="바코드 저장"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
            <Button
              onPress={clearScannedData}
              accessibilityLabel="다시 스캔"
              disabled={isSaving}
            >
              다시 스캔
            </Button>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <ErrorMessage message={error} />
          </View>
        )}
      </View>
    );
  }

  // Ready to scan
  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.title}>바코드 스캔</Text>
        <Text style={styles.message}>
          QR 코드 및 다양한 바코드 형식을 스캔할 수 있습니다.
        </Text>

        <View style={styles.supportedTypes}>
          <Text style={styles.supportedTypesTitle}>지원 형식</Text>
          <Text style={styles.supportedTypesList}>
            QR, EAN-13, EAN-8, UPC-E, CODE-39, CODE-128, ITF-14,{'\n'}
            AZTEC, PDF417, DATA MATRIX, CODE-93, CODABAR, UPC-A
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <Button
            onPress={startScanning}
            accessibilityLabel="바코드 스캔 시작"
          >
            바코드 스캔 시작
          </Button>

          <Button
            onPress={() => router.push('/barcode/list')}
            accessibilityLabel="스캔 기록 보기"
          >
            스캔 기록 보기
          </Button>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <ErrorMessage message={error} />
        </View>
      )}
    </View>
  );
}

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: normalizeFont(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  supportedTypes: {
    backgroundColor: '#f5f5f5',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    width: '100%',
  },
  supportedTypesTitle: {
    fontSize: normalizeFont(14),
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: '#333',
  },
  supportedTypesList: {
    fontSize: normalizeFont(12),
    color: '#666',
    lineHeight: normalizeFont(18),
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    // width와 height는 동적으로 설정됨
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: wp(10),
    height: wp(10),
    borderColor: '#fff',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanHint: {
    color: '#fff',
    fontSize: normalizeFont(16),
    marginTop: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  timeoutHint: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeoutText: {
    fontSize: normalizeFont(14),
    color: '#333',
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: normalizeFont(20),
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  previewContainer: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  previewCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewRow: {
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontSize: normalizeFont(14),
    color: '#666',
    marginBottom: spacing.xs / 2,
  },
  previewValue: {
    fontSize: normalizeFont(18),
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: spacing.sm,
  },
  dataScrollView: {
    maxHeight: 200,
  },
  dataValue: {
    fontSize: normalizeFont(16),
    color: '#333',
    lineHeight: normalizeFont(24),
  },
  buttonGroup: {
    gap: spacing.sm,
  },
  errorContainer: {
    padding: spacing.md,
  },
});

// Export for testing
export { BarcodeScannerScreen };
