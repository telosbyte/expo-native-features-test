# Barcode Scanner API Contract

**Feature**: P4 - 바코드/QR 코드 스캔
**Component**: `useBarcodeScanner` hook + `BarcodeScannerScreen`

## Hook Interface: useBarcodeScanner

### Purpose
바코드 스캔 권한 요청, 바코드/QR 코드 스캔, 스캔 데이터 저장 기능을 제공하는 커스텀 훅

### Signature

```typescript
interface UseBarcodeScannerReturn {
  // State
  hasPermission: boolean | null;
  isScanning: boolean;
  error: string | null;
  scannedData: ScannedBarcode | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  startScanning: (options?: ScanOptions) => void;
  stopScanning: () => void;
  saveBarcode: (data: ScannedBarcode, note?: string) => Promise<BarcodeRecord>;

  // Helpers
  openSettings: () => void;
  clearScannedData: () => void;
}

interface ScannedBarcode {
  type: BarcodeType;
  data: string;
  bounds?: BarcodeBounds;
  cornerPoints?: Point[];
  timestamp: number;
}

interface ScanOptions {
  barcodeTypes?: BarcodeType[];
  scanInterval?: number; // milliseconds, default 2000 (debounce)
  autoStop?: boolean; // Stop scanning after first successful scan
}

enum BarcodeType {
  QR = 'qr',
  PDF417 = 'pdf417',
  AZTEC = 'aztec',
  EAN13 = 'ean13',
  EAN8 = 'ean8',
  UPC_E = 'upc_e',
  CODE39 = 'code39',
  CODE93 = 'code93',
  CODE128 = 'code128',
  ITF14 = 'itf14',
  CODABAR = 'codabar',
  DATA_MATRIX = 'datamatrix'
}

interface BarcodeBounds {
  origin: Point;
  size: { width: number; height: number };
}

interface Point {
  x: number;
  y: number;
}

function useBarcodeScanner(): UseBarcodeScannerReturn;
```

### Usage Example

```typescript
import { useBarcodeScanner, BarcodeType } from '@/hooks/useBarcodeScanner';

function BarcodeScannerScreen() {
  const {
    hasPermission,
    isScanning,
    error,
    scannedData,
    requestPermission,
    startScanning,
    stopScanning,
    saveBarcode,
    openSettings,
    clearScannedData
  } = useBarcodeScanner();

  useEffect(() => {
    requestPermission();
  }, []);

  const handleStartScan = () => {
    startScanning({
      barcodeTypes: [
        BarcodeType.QR,
        BarcodeType.EAN13,
        BarcodeType.CODE128
      ],
      scanInterval: 2000,
      autoStop: true
    });
  };

  const handleSave = async () => {
    if (!scannedData) return;

    await saveBarcode(scannedData, '스캔한 바코드');
    clearScannedData();
  };

  if (hasPermission === null) {
    return <LoadingIndicator />;
  }

  if (hasPermission === false) {
    return (
      <PermissionDenied
        message="카메라 권한이 필요합니다"
        onOpenSettings={openSettings}
      />
    );
  }

  return (
    <View>
      {isScanning ? (
        <View>
          <Camera
            onBarCodeScanned={handleBarCodeScanned}
            barCodeScannerSettings={{
              barCodeTypes: [BarcodeType.QR, BarcodeType.EAN13]
            }}
          />
          <Button onPress={stopScanning}>
            스캔 중지
          </Button>
        </View>
      ) : scannedData ? (
        <BarcodePreview data={scannedData}>
          <Text>타입: {scannedData.type}</Text>
          <Text>데이터: {scannedData.data}</Text>
          <Button onPress={handleSave}>저장</Button>
          <Button onPress={clearScannedData}>다시 스캔</Button>
        </BarcodePreview>
      ) : (
        <Button onPress={handleStartScan}>
          바코드 스캔 시작
        </Button>
      )}

      {error && <ErrorMessage message={error} />}
    </View>
  );
}
```

## Component Interface: BarcodeScannerScreen

### Props

```typescript
interface BarcodeScannerScreenProps {
  onBarcodeSaved?: (barcode: BarcodeRecord) => void;
  onError?: (error: Error) => void;
  allowedTypes?: BarcodeType[];
  scanTimeout?: number; // milliseconds, show hint after timeout
}
```

### Behavior

#### Permission Flow
1. **Mount**: `requestPermission()` 자동 호출
2. **Granted**: 스캔 시작 버튼 활성화
3. **Denied**: 권한 안내 메시지 + 설정 이동 버튼

#### Scanning Flow
1. User taps "바코드 스캔 시작" button
2. `isScanning = true`
3. Show camera view with scanning overlay
4. Camera starts detecting barcodes
5. Barcode detected → vibrate + sound feedback
6. Apply debounce (2s) to prevent duplicate scans
7. Auto-stop scanning (if enabled)
8. Display scanned data (type + content)
9. User confirms → `saveBarcode()`
10. User cancels → `clearScannedData()`
11. `isScanning = false`

#### Error Handling
- Camera unavailable → "카메라를 사용할 수 없습니다"
- Barcode not recognized → "바코드를 인식할 수 없습니다. 다시 시도해주세요"
- Scan timeout (10s) → "바코드를 다시 시도하라는 안내가 표시됩니다"
- Save failed → "바코드 저장에 실패했습니다"
- Invalid barcode format → "지원하지 않는 바코드 형식입니다"

### Screen States

```typescript
type BarcodeScannerScreenState =
  | 'loading'           // Checking permission
  | 'permission-denied' // No camera permission
  | 'ready'             // Ready to start scanning
  | 'scanning'          // Camera active, scanning for barcodes
  | 'scanned'           // Barcode scanned, showing preview
  | 'saving'            // Saving to database
  | 'timeout'           // No barcode detected within timeout
  | 'error';            // Error occurred
```

## Repository Interface: BarcodeRepository

### Methods

```typescript
class BarcodeRepository {
  // Create
  async save(input: CreateBarcodeInput): Promise<BarcodeRecord>;

  // Read
  async findAll(options?: QueryOptions): Promise<BarcodeRecord[]>;
  async findById(id: number): Promise<BarcodeRecord | null>;
  async findByType(type: BarcodeType): Promise<BarcodeRecord[]>;
  async findByData(data: string): Promise<BarcodeRecord[]>;
  async count(): Promise<number>;
  async countByType(): Promise<Record<BarcodeType, number>>;

  // Delete
  async delete(id: number): Promise<boolean>;
  async deleteAll(): Promise<number>; // Returns count deleted
  async deleteDuplicates(): Promise<number>; // Remove duplicate scans
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'barcode_type';
  order?: 'ASC' | 'DESC';
  typeFilter?: BarcodeType;
}
```

### Implementation Details

```typescript
// src/services/database/BarcodeRepository.ts
import * as SQLite from 'expo-sqlite';
import { BarcodeRecord, CreateBarcodeInput } from '@/types/Barcode';

export class BarcodeRepository {
  constructor(private db: SQLite.Database) {}

  async save(input: CreateBarcodeInput): Promise<BarcodeRecord> {
    const result = await this.db.runAsync(
      `INSERT INTO barcodes (barcode_type, barcode_data, note) VALUES (?, ?, ?)`,
      [input.barcode_type, input.barcode_data, input.note || null]
    );

    const inserted = await this.db.getFirstAsync<BarcodeRecord>(
      `SELECT * FROM barcodes WHERE id = ?`,
      [result.lastInsertRowId]
    );

    if (!inserted) {
      throw new Error('Failed to retrieve inserted barcode');
    }

    return inserted;
  }

  async findAll(options: QueryOptions = {}): Promise<BarcodeRecord[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC',
      typeFilter
    } = options;

    let query = `SELECT * FROM barcodes`;
    const params: any[] = [];

    if (typeFilter) {
      query += ` WHERE barcode_type = ?`;
      params.push(typeFilter);
    }

    query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.getAllAsync<BarcodeRecord>(query, params);
  }

  async findById(id: number): Promise<BarcodeRecord | null> {
    return await this.db.getFirstAsync<BarcodeRecord>(
      `SELECT * FROM barcodes WHERE id = ?`,
      [id]
    );
  }

  async findByType(type: BarcodeType): Promise<BarcodeRecord[]> {
    return await this.db.getAllAsync<BarcodeRecord>(
      `SELECT * FROM barcodes WHERE barcode_type = ? ORDER BY created_at DESC`,
      [type]
    );
  }

  async findByData(data: string): Promise<BarcodeRecord[]> {
    return await this.db.getAllAsync<BarcodeRecord>(
      `SELECT * FROM barcodes WHERE barcode_data = ? ORDER BY created_at DESC`,
      [data]
    );
  }

  async count(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM barcodes`
    );
    return result?.count || 0;
  }

  async countByType(): Promise<Record<BarcodeType, number>> {
    const results = await this.db.getAllAsync<{ barcode_type: BarcodeType; count: number }>(
      `SELECT barcode_type, COUNT(*) as count FROM barcodes GROUP BY barcode_type`
    );

    return results.reduce((acc, row) => {
      acc[row.barcode_type] = row.count;
      return acc;
    }, {} as Record<BarcodeType, number>);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.runAsync(
      `DELETE FROM barcodes WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await this.db.runAsync(`DELETE FROM barcodes`);
    return result.changes;
  }

  async deleteDuplicates(): Promise<number> {
    // Keep only the most recent scan for each unique barcode data
    const result = await this.db.runAsync(`
      DELETE FROM barcodes
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM barcodes
        GROUP BY barcode_data
      )
    `);
    return result.changes;
  }
}
```

## Acceptance Criteria Mapping

| Scenario | Implementation |
|----------|----------------|
| Given 사용자가 메인 화면에 있을 때, When 바코드 스캔 버튼을 누르면, Then 바코드 스캔 전용 카메라 뷰가 실행됩니다 | `startScanning()` activates camera with barcode detection |
| Given 바코드 스캔 카메라가 실행된 상태에서, When 사용자가 바코드/QR 코드를 카메라로 비추면, Then 스캔된 데이터가 자동으로 인식되어 화면에 표시됩니다 | `onBarCodeScanned` event → display `scannedData.type` and `scannedData.data` |
| Given 바코드가 스캔된 상태에서, When 사용자가 저장 버튼을 누르면, Then 바코드 타입과 데이터가 타임스탬프와 함께 데이터베이스에 저장됩니다 | `saveBarcode()` → `BarcodeRepository.save()` with `created_at` |
| Given 카메라 권한이 없는 상태에서, When 바코드 스캔 버튼을 누르면, Then 권한 요청 다이얼로그가 표시됩니다 | `requestPermission()` → `expo-camera` permission API |
| Given 인식할 수 없는 바코드를 스캔할 때, When 10초 이상 바코드가 인식되지 않으면, Then 사용자에게 바코드를 다시 시도하라는 안내가 표시됩니다 | Track `scanStartTime`, show hint after 10s timeout |

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/useBarcodeScanner.test.ts
describe('useBarcodeScanner', () => {
  it('should request permission on mount', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    expect(result.current.hasPermission).toBeNull();
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
  });

  it('should start scanning when permission granted', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    await waitFor(() => expect(result.current.hasPermission).toBe(true));

    act(() => {
      result.current.startScanning({
        barcodeTypes: [BarcodeType.QR],
        autoStop: true
      });
    });

    expect(result.current.isScanning).toBe(true);
  });

  it('should debounce rapid scans', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    const onScan = jest.fn();

    // Simulate rapid barcode scans
    act(() => {
      result.current.startScanning({ scanInterval: 2000 });
    });

    // First scan should work
    // Second scan within 2s should be ignored

    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('should save barcode to database', async () => {
    const { result } = renderHook(() => useBarcodeScanner());
    const barcode = {
      type: BarcodeType.QR,
      data: 'https://example.com',
      timestamp: Date.now()
    };

    const saved = await result.current.saveBarcode(barcode, 'Test QR');
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.barcode_type).toBe(BarcodeType.QR);
    expect(saved.barcode_data).toBe('https://example.com');
  });
});
```

### Integration Tests

```typescript
// __tests__/screens/BarcodeScannerScreen.test.tsx
describe('BarcodeScannerScreen', () => {
  it('should show scan button when permission granted', async () => {
    const { getByText } = render(<BarcodeScannerScreen />);
    await waitFor(() => {
      expect(getByText('바코드 스캔 시작')).toBeTruthy();
    });
  });

  it('should show camera view when scanning', async () => {
    const { getByText, getByTestId } = render(<BarcodeScannerScreen />);

    fireEvent.press(getByText('바코드 스캔 시작'));

    await waitFor(() => {
      expect(getByTestId('camera-view')).toBeTruthy();
      expect(getByText('스캔 중지')).toBeTruthy();
    });
  });

  it('should show preview after successful scan', async () => {
    const { getByText, getByTestId } = render(<BarcodeScannerScreen />);

    fireEvent.press(getByText('바코드 스캔 시작'));

    // Simulate barcode scan
    await waitFor(() => {
      expect(getByTestId('barcode-preview')).toBeTruthy();
      expect(getByText(/타입:/)).toBeTruthy();
      expect(getByText(/데이터:/)).toBeTruthy();
    });
  });

  it('should show timeout hint after 10 seconds', async () => {
    jest.useFakeTimers();
    const { getByText } = render(<BarcodeScannerScreen scanTimeout={10000} />);

    fireEvent.press(getByText('바코드 스캔 시작'));

    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(getByText(/다시 시도/)).toBeTruthy();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/barcode-scanner.e2e.ts
describe('Barcode Scanner Feature', () => {
  it('should scan and save barcode', async () => {
    await element(by.id('barcode-tab')).tap();
    await element(by.id('start-scan-button')).tap();
    await waitFor(element(by.id('camera-view'))).toBeVisible();
    // Simulate barcode in camera view (mocked in E2E)
    await waitFor(element(by.id('barcode-preview'))).toBeVisible();
    await element(by.id('save-button')).tap();
    await expect(element(by.id('barcode-list'))).toBeVisible();
  });
});
```

## Performance Requirements

- **Permission check**: < 100ms
- **Camera initialization**: < 1s
- **Barcode detection**: < 3s (clear barcode)
- **Scan debounce**: 2s between scans
- **Barcode save**: < 500ms (including DB write)
- **List load (20 items)**: < 500ms
- **Memory**: < 50MB during scanning

## Platform Differences

### iOS
- Uses AVFoundation framework for barcode scanning
- Requires `NSCameraUsageDescription` in Info.plist
- Supports all common 1D/2D barcode types
- Hardware-accelerated barcode detection
- Vibration feedback via Haptics

### Android
- Uses Google ML Kit or ZXing library
- Requires `CAMERA` permission in AndroidManifest.xml
- Barcode detection performance varies by device
- Some barcode types may not be supported on older devices
- Vibration feedback via Vibrator service

## Error Codes

```typescript
enum BarcodeScannerErrorCode {
  PERMISSION_DENIED = 'BARCODE_PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  SCAN_FAILED = 'SCAN_FAILED',
  INVALID_BARCODE = 'INVALID_BARCODE',
  TIMEOUT = 'BARCODE_TIMEOUT',
  SAVE_FAILED = 'BARCODE_SAVE_FAILED',
  UNKNOWN = 'BARCODE_UNKNOWN_ERROR'
}
```

## Supported Barcode Types

### 1D Barcodes
- **EAN-13**: European Article Number (retail products)
- **EAN-8**: Short version of EAN-13
- **UPC-E**: Universal Product Code (North America)
- **CODE-39**: Alphanumeric barcode
- **CODE-93**: Improved CODE-39
- **CODE-128**: High-density barcode
- **ITF-14**: Interleaved 2 of 5 (shipping containers)
- **CODABAR**: Used in libraries, blood banks

### 2D Barcodes
- **QR Code**: Quick Response code (URLs, text, vCard)
- **Data Matrix**: Small barcodes on small items
- **PDF417**: Used on driver's licenses, boarding passes
- **Aztec Code**: Used for transport tickets

## Debounce Implementation

### Prevent Duplicate Scans

```typescript
function useDebouncedScan(
  onScan: (data: ScannedBarcode) => void,
  interval: number = 2000
) {
  const lastScanTime = useRef<number>(0);
  const lastScannedData = useRef<string>('');

  const handleScan = useCallback((data: ScannedBarcode) => {
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTime.current;

    // Ignore if same barcode scanned within interval
    if (
      timeSinceLastScan < interval &&
      data.data === lastScannedData.current
    ) {
      return;
    }

    lastScanTime.current = now;
    lastScannedData.current = data.data;
    onScan(data);
  }, [onScan, interval]);

  return handleScan;
}
```

### Visual Feedback

```typescript
function ScanningOverlay({ isScanning, scannedData }) {
  return (
    <View style={styles.overlay}>
      {isScanning && (
        <>
          <View style={styles.scanBox}>
            <AnimatedCorners />
          </View>
          <Text style={styles.hint}>
            바코드를 스캔 영역에 맞춰주세요
          </Text>
        </>
      )}

      {scannedData && (
        <View style={styles.successBadge}>
          <CheckIcon />
          <Text>스캔 완료!</Text>
        </View>
      )}
    </View>
  );
}
```

## Timeout Handling

### Implementation

```typescript
function useBarcodeScanTimeout(timeout: number = 10000) {
  const [showHint, setShowHint] = useState(false);
  const scanStartTime = useRef<number>(0);

  const startTimer = useCallback(() => {
    scanStartTime.current = Date.now();
    setShowHint(false);

    const timer = setTimeout(() => {
      setShowHint(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  const resetTimer = useCallback(() => {
    scanStartTime.current = 0;
    setShowHint(false);
  }, []);

  return { showHint, startTimer, resetTimer };
}
```

### User Feedback

```typescript
function ScanTimeoutHint({ visible, onRetry }) {
  if (!visible) return null;

  return (
    <View style={styles.hintContainer}>
      <InfoIcon />
      <Text style={styles.hintText}>
        바코드가 인식되지 않습니다.{'\n'}
        조명을 확인하거나 바코드를 다시 비춰주세요.
      </Text>
      <Button onPress={onRetry}>다시 시도</Button>
    </View>
  );
}
```
