# Location API Contract

**Feature**: P3 - GPS 위치 정보 확인 및 저장
**Component**: `useLocation` hook + `LocationScreen`

## Hook Interface: useLocation

### Purpose
위치 권한 요청, 현재 GPS 위치 조회, 위치 정보 저장 기능을 제공하는 커스텀 훅

### Signature

```typescript
interface UseLocationReturn {
  // State
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
  currentLocation: LocationData | null;

  // Actions
  requestPermission: (options?: PermissionOptions) => Promise<boolean>;
  getCurrentLocation: (options?: LocationOptions) => Promise<LocationData | null>;
  saveLocation: (location: LocationData, note?: string) => Promise<LocationRecord>;
  watchLocation: (callback: LocationCallback) => LocationSubscription;

  // Helpers
  openSettings: () => void;
  clearLocation: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface LocationOptions {
  accuracy?: LocationAccuracy;
  timeout?: number; // milliseconds, default 10000
  maximumAge?: number; // milliseconds, use cached location if available
}

interface PermissionOptions {
  foregroundOnly?: boolean;
  backgroundAllowed?: boolean;
}

enum LocationAccuracy {
  Lowest = 1,     // ~3000m
  Low = 2,        // ~1000m
  Balanced = 3,   // ~100m
  High = 4,       // ~10m
  Highest = 5,    // Best possible
  BestForNavigation = 6
}

type LocationCallback = (location: LocationData) => void;

interface LocationSubscription {
  remove: () => void;
}

function useLocation(): UseLocationReturn;
```

### Usage Example

```typescript
import { useLocation, LocationAccuracy } from '@/hooks/useLocation';

function LocationScreen() {
  const {
    hasPermission,
    isLoading,
    error,
    currentLocation,
    requestPermission,
    getCurrentLocation,
    saveLocation,
    openSettings,
    clearLocation
  } = useLocation();

  useEffect(() => {
    requestPermission({ foregroundOnly: true });
  }, []);

  const handleGetLocation = async () => {
    const location = await getCurrentLocation({
      accuracy: LocationAccuracy.High,
      timeout: 10000,
      maximumAge: 5000
    });

    if (location) {
      // Location retrieved successfully
    }
  };

  const handleSaveLocation = async () => {
    if (!currentLocation) return;

    await saveLocation(currentLocation, '현재 위치');
    clearLocation();
  };

  if (hasPermission === null) {
    return <LoadingIndicator />;
  }

  if (hasPermission === false) {
    return (
      <PermissionDenied
        message="위치 권한이 필요합니다"
        onOpenSettings={openSettings}
      />
    );
  }

  return (
    <View>
      <Button onPress={handleGetLocation} disabled={isLoading}>
        현재 위치 조회
      </Button>

      {currentLocation && (
        <LocationPreview location={currentLocation}>
          <Text>위도: {currentLocation.latitude.toFixed(6)}</Text>
          <Text>경도: {currentLocation.longitude.toFixed(6)}</Text>
          <Text>정확도: {currentLocation.accuracy.toFixed(1)}m</Text>
          <Button onPress={handleSaveLocation} disabled={isLoading}>
            위치 저장
          </Button>
        </LocationPreview>
      )}

      {error && <ErrorMessage message={error} />}
    </View>
  );
}
```

## Component Interface: LocationScreen

### Props

```typescript
interface LocationScreenProps {
  onLocationSaved?: (location: LocationRecord) => void;
  onError?: (error: Error) => void;
  defaultAccuracy?: LocationAccuracy;
  timeout?: number; // milliseconds
}
```

### Behavior

#### Permission Flow
1. **Mount**: `requestPermission()` 자동 호출
2. **Granted**: 위치 조회 버튼 활성화
3. **Denied**: 권한 안내 메시지 + 설정 이동 버튼

#### Location Fetch Flow
1. User taps "현재 위치 조회" button
2. `isLoading = true`
3. Call `expo-location` to get current position
4. Show loading indicator with timeout countdown
5. Location received → display coordinates + accuracy
6. Timeout (10s) → show error message
7. User confirms → `saveLocation()`
8. User cancels → `clearLocation()`
9. `isLoading = false`

#### Error Handling
- Permission denied → "위치 권한이 필요합니다"
- Location unavailable → "위치를 찾을 수 없습니다. GPS를 켜주세요"
- Timeout → "위치 조회 시간이 초과되었습니다. 다시 시도해주세요"
- Low accuracy → "위치 정확도가 낮습니다. 실외로 이동해주세요"
- Save failed → "위치 저장에 실패했습니다"
- Location services disabled → "위치 서비스가 비활성화되어 있습니다"

### Screen States

```typescript
type LocationScreenState =
  | 'loading'           // Checking permission
  | 'permission-denied' // No location permission
  | 'ready'             // Ready to fetch location
  | 'fetching'          // Fetching GPS location
  | 'fetched'           // Location retrieved, showing preview
  | 'saving'            // Saving to database
  | 'error';            // Error occurred
```

## Repository Interface: LocationRepository

### Methods

```typescript
class LocationRepository {
  // Create
  async save(input: CreateLocationInput): Promise<LocationRecord>;

  // Read
  async findAll(options?: QueryOptions): Promise<LocationRecord[]>;
  async findById(id: number): Promise<LocationRecord | null>;
  async findRecent(limit?: number): Promise<LocationRecord[]>;
  async count(): Promise<number>;

  // Delete
  async delete(id: number): Promise<boolean>;
  async deleteAll(): Promise<number>; // Returns count deleted
  async deleteOlderThan(days: number): Promise<number>;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'accuracy';
  order?: 'ASC' | 'DESC';
  minAccuracy?: number; // Filter by accuracy threshold
}
```

### Implementation Details

```typescript
// src/services/database/LocationRepository.ts
import * as SQLite from 'expo-sqlite';
import { LocationRecord, CreateLocationInput } from '@/types/Location';

export class LocationRepository {
  constructor(private db: SQLite.Database) {}

  async save(input: CreateLocationInput): Promise<LocationRecord> {
    const result = await this.db.runAsync(
      `INSERT INTO locations
       (latitude, longitude, altitude, accuracy, altitude_accuracy, heading, speed, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.latitude,
        input.longitude,
        input.altitude || null,
        input.accuracy,
        input.altitude_accuracy || null,
        input.heading || null,
        input.speed || null,
        input.note || null
      ]
    );

    const inserted = await this.db.getFirstAsync<LocationRecord>(
      `SELECT * FROM locations WHERE id = ?`,
      [result.lastInsertRowId]
    );

    if (!inserted) {
      throw new Error('Failed to retrieve inserted location');
    }

    return inserted;
  }

  async findAll(options: QueryOptions = {}): Promise<LocationRecord[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC',
      minAccuracy
    } = options;

    let query = `SELECT * FROM locations`;
    const params: any[] = [];

    if (minAccuracy !== undefined) {
      query += ` WHERE accuracy <= ?`;
      params.push(minAccuracy);
    }

    query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.getAllAsync<LocationRecord>(query, params);
  }

  async findById(id: number): Promise<LocationRecord | null> {
    return await this.db.getFirstAsync<LocationRecord>(
      `SELECT * FROM locations WHERE id = ?`,
      [id]
    );
  }

  async findRecent(limit: number = 10): Promise<LocationRecord[]> {
    return await this.db.getAllAsync<LocationRecord>(
      `SELECT * FROM locations ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
  }

  async count(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM locations`
    );
    return result?.count || 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.runAsync(
      `DELETE FROM locations WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await this.db.runAsync(`DELETE FROM locations`);
    return result.changes;
  }

  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.db.runAsync(
      `DELETE FROM locations WHERE created_at < ?`,
      [cutoffDate.toISOString()]
    );
    return result.changes;
  }
}
```

## Acceptance Criteria Mapping

| Scenario | Implementation |
|----------|----------------|
| Given 사용자가 메인 화면에 있을 때, When 위치 조회 버튼을 누르면, Then 현재 GPS 위치(위도, 경도)가 화면에 표시됩니다 | `getCurrentLocation()` calls `expo-location` API, displays `latitude` and `longitude` |
| Given 위치가 조회된 상태에서, When 사용자가 저장 버튼을 누르면, Then 위치 정보가 타임스탬프와 함께 데이터베이스에 저장됩니다 | `saveLocation()` → `LocationRepository.save()` with `created_at` timestamp |
| Given 위치 권한이 없는 상태에서, When 위치 조회 버튼을 누르면, Then 위치 권한 요청 다이얼로그가 표시됩니다 | `requestPermission()` → `expo-location` permission API |
| Given GPS 신호를 받을 수 없는 환경에서, When 위치 조회 버튼을 누르면, Then 사용자에게 위치를 찾을 수 없다는 안내 메시지가 표시됩니다 | Timeout after 10s, show error message |
| Given 저장된 위치 기록이 있을 때, When 위치 목록 화면을 열면, Then 모든 저장된 위치가 최신순으로 표시됩니다 | `LocationRepository.findAll({ orderBy: 'created_at', order: 'DESC' })` |

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/useLocation.test.ts
describe('useLocation', () => {
  it('should request permission on mount', async () => {
    const { result } = renderHook(() => useLocation());
    expect(result.current.hasPermission).toBeNull();
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
  });

  it('should get current location when permission granted', async () => {
    const { result } = renderHook(() => useLocation());
    await waitFor(() => expect(result.current.hasPermission).toBe(true));

    const location = await result.current.getCurrentLocation({
      accuracy: LocationAccuracy.High,
      timeout: 5000
    });

    expect(location).toBeDefined();
    expect(location?.latitude).toBeGreaterThan(-90);
    expect(location?.latitude).toBeLessThan(90);
    expect(location?.longitude).toBeGreaterThan(-180);
    expect(location?.longitude).toBeLessThan(180);
  });

  it('should timeout after 10 seconds', async () => {
    const { result } = renderHook(() => useLocation());

    await expect(
      result.current.getCurrentLocation({ timeout: 100 })
    ).rejects.toThrow(/timeout/i);
  });

  it('should save location to database', async () => {
    const { result } = renderHook(() => useLocation());
    const location = {
      latitude: 37.5665,
      longitude: 126.9780,
      altitude: 50,
      accuracy: 10,
      altitudeAccuracy: 5,
      heading: 180,
      speed: 0,
      timestamp: Date.now()
    };

    const saved = await result.current.saveLocation(location, '서울시청');
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.latitude).toBe(37.5665);
  });
});
```

### Integration Tests

```typescript
// __tests__/screens/LocationScreen.test.tsx
describe('LocationScreen', () => {
  it('should show location button when permission granted', async () => {
    const { getByText } = render(<LocationScreen />);
    await waitFor(() => {
      expect(getByText('현재 위치 조회')).toBeTruthy();
    });
  });

  it('should show location preview after fetch', async () => {
    const { getByText, getByTestId } = render(<LocationScreen />);

    fireEvent.press(getByText('현재 위치 조회'));

    await waitFor(() => {
      expect(getByTestId('location-preview')).toBeTruthy();
      expect(getByText(/위도:/)).toBeTruthy();
      expect(getByText(/경도:/)).toBeTruthy();
    });
  });

  it('should show timeout error after 10 seconds', async () => {
    jest.useFakeTimers();
    const { getByText } = render(<LocationScreen />);

    fireEvent.press(getByText('현재 위치 조회'));

    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(getByText(/시간이 초과/)).toBeTruthy();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/location.e2e.ts
describe('Location Feature', () => {
  it('should fetch and save location', async () => {
    await element(by.id('location-tab')).tap();
    await element(by.id('get-location-button')).tap();
    await waitFor(element(by.id('location-preview'))).toBeVisible().withTimeout(10000);
    await element(by.id('save-button')).tap();
    await expect(element(by.id('location-list'))).toBeVisible();
  });
});
```

## Performance Requirements

- **Permission check**: < 100ms
- **Location fetch (high accuracy)**: < 10s (outdoor, clear sky)
- **Location fetch (balanced)**: < 5s
- **Location save**: < 500ms (including DB write)
- **List load (20 items)**: < 500ms
- **Memory**: < 20MB during location fetch

## Platform Differences

### iOS
- Permission levels:
  - `whenInUse`: Location only when app is in use
  - `always`: Background location tracking
- Permission prompt shows once, then requires Settings
- Uses Core Location framework
- Requires `NSLocationWhenInUseUsageDescription` in Info.plist
- Requires `NSLocationAlwaysUsageDescription` for background

### Android
- Permission levels:
  - `ACCESS_FINE_LOCATION`: High accuracy GPS
  - `ACCESS_COARSE_LOCATION`: Network-based (WiFi/Cell)
  - `ACCESS_BACKGROUND_LOCATION`: Background tracking (Android 10+)
- Permission can be requested multiple times
- Uses Google Play Services or Android Location API
- Requires permissions in AndroidManifest.xml
- User must enable Location Services in device settings

## Error Codes

```typescript
enum LocationErrorCode {
  PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  TIMEOUT = 'LOCATION_TIMEOUT',
  LOW_ACCURACY = 'LOCATION_LOW_ACCURACY',
  SERVICES_DISABLED = 'LOCATION_SERVICES_DISABLED',
  SAVE_FAILED = 'LOCATION_SAVE_FAILED',
  UNKNOWN = 'LOCATION_UNKNOWN_ERROR'
}
```

## Accuracy Options

### Accuracy Levels

```typescript
// High Accuracy (GPS)
const highAccuracyOptions: LocationOptions = {
  accuracy: LocationAccuracy.High,
  timeout: 10000,
  maximumAge: 0 // Always fetch fresh location
};

// Balanced (GPS + Network)
const balancedOptions: LocationOptions = {
  accuracy: LocationAccuracy.Balanced,
  timeout: 5000,
  maximumAge: 5000 // Use cached if < 5s old
};

// Low Accuracy (Network only)
const lowAccuracyOptions: LocationOptions = {
  accuracy: LocationAccuracy.Low,
  timeout: 3000,
  maximumAge: 10000 // Use cached if < 10s old
};
```

### Accuracy Thresholds

```typescript
enum AccuracyThreshold {
  Excellent = 10,   // < 10m
  Good = 50,        // < 50m
  Fair = 100,       // < 100m
  Poor = 500        // < 500m
}

function getAccuracyLabel(accuracy: number): string {
  if (accuracy <= AccuracyThreshold.Excellent) return '매우 정확';
  if (accuracy <= AccuracyThreshold.Good) return '정확';
  if (accuracy <= AccuracyThreshold.Fair) return '보통';
  if (accuracy <= AccuracyThreshold.Poor) return '부정확';
  return '매우 부정확';
}
```

## Timeout Handling

### Implementation

```typescript
async function getCurrentLocationWithTimeout(
  options: LocationOptions
): Promise<LocationData> {
  const { timeout = 10000 } = options;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(LocationErrorCode.TIMEOUT));
    }, timeout);
  });

  const locationPromise = Location.getCurrentPositionAsync(options);

  return Promise.race([locationPromise, timeoutPromise]);
}
```

### User Feedback

```typescript
function LocationFetchProgress({ timeout = 10000 }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, timeout - elapsed) / 1000;

  return (
    <View>
      <ActivityIndicator />
      <Text>위치 조회 중... ({remaining.toFixed(0)}초 남음)</Text>
    </View>
  );
}
```
