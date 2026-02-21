# Camera API Contract

**Feature**: P1 - 카메라로 사진 촬영 및 저장
**Component**: `useCamera` hook + `CameraScreen`

## Hook Interface: useCamera

### Purpose
카메라 권한 요청, 사진 촬영, 저장 기능을 제공하는 커스텀 훅

### Signature

```typescript
interface UseCameraReturn {
  // State
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  capturePhoto: () => Promise<Photo | null>;
  savePhoto: (uri: string, metadata?: PhotoMetadata) => Promise<Photo>;

  // Helpers
  openSettings: () => void;
}

interface PhotoMetadata {
  width?: number;
  height?: number;
  file_size?: number;
}

function useCamera(): UseCameraReturn;
```

### Usage Example

```typescript
import { useCamera } from '@/hooks/useCamera';

function CameraScreen() {
  const {
    hasPermission,
    isLoading,
    error,
    requestPermission,
    capturePhoto,
    savePhoto,
    openSettings
  } = useCamera();

  useEffect(() => {
    requestPermission();
  }, []);

  const handleCapture = async () => {
    const photo = await capturePhoto();
    if (photo) {
      await savePhoto(photo.uri, {
        width: photo.width,
        height: photo.height,
        file_size: photo.size
      });
    }
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
      <Camera />
      <Button onPress={handleCapture} disabled={isLoading}>
        사진 촬영
      </Button>
      {error && <ErrorMessage message={error} />}
    </View>
  );
}
```

## Component Interface: CameraScreen

### Props

```typescript
interface CameraScreenProps {
  onPhotoSaved?: (photo: Photo) => void;
  onError?: (error: Error) => void;
}
```

### Behavior

#### Permission Flow
1. **Mount**: `requestPermission()` 자동 호출
2. **Granted**: 카메라 UI 표시
3. **Denied**: 권한 안내 메시지 + 설정 이동 버튼

#### Capture Flow
1. User taps "사진 촬영" button
2. `isLoading = true`
3. Call `expo-camera` to capture image
4. Preview captured image
5. User confirms → `savePhoto()`
6. User cancels → discard image
7. `isLoading = false`

#### Error Handling
- Camera unavailable → "카메라를 사용할 수 없습니다"
- Capture failed → "사진 촬영에 실패했습니다. 다시 시도해주세요"
- Save failed → "사진 저장에 실패했습니다"
- Storage full → "저장공간이 부족합니다"

### Screen States

```typescript
type CameraScreenState =
  | 'loading'           // Checking permission
  | 'permission-denied' // No camera permission
  | 'ready'             // Camera ready to capture
  | 'capturing'         // Capture in progress
  | 'preview'           // Showing captured photo
  | 'saving'            // Saving to database
  | 'error';            // Error occurred
```

## Repository Interface: PhotoRepository

### Methods

```typescript
class PhotoRepository {
  // Create
  async save(input: CreatePhotoInput): Promise<Photo>;

  // Read
  async findAll(options?: QueryOptions): Promise<Photo[]>;
  async findById(id: number): Promise<Photo | null>;
  async count(): Promise<number>;

  // Delete
  async delete(id: number): Promise<boolean>;
  async deleteAll(): Promise<number>; // Returns count deleted
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'file_size';
  order?: 'ASC' | 'DESC';
}
```

### Implementation Details

```typescript
// src/services/database/PhotoRepository.ts
import * as SQLite from 'expo-sqlite';
import { Photo, CreatePhotoInput } from '@/types/Photo';

export class PhotoRepository {
  constructor(private db: SQLite.Database) {}

  async save(input: CreatePhotoInput): Promise<Photo> {
    const result = await this.db.runAsync(
      `INSERT INTO photos (uri, file_size, width, height) VALUES (?, ?, ?, ?)`,
      [input.uri, input.file_size || null, input.width || null, input.height || null]
    );

    const inserted = await this.db.getFirstAsync<Photo>(
      `SELECT * FROM photos WHERE id = ?`,
      [result.lastInsertRowId]
    );

    if (!inserted) {
      throw new Error('Failed to retrieve inserted photo');
    }

    return inserted;
  }

  async findAll(options: QueryOptions = {}): Promise<Photo[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC'
    } = options;

    return await this.db.getAllAsync<Photo>(
      `SELECT * FROM photos ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async findById(id: number): Promise<Photo | null> {
    return await this.db.getFirstAsync<Photo>(
      `SELECT * FROM photos WHERE id = ?`,
      [id]
    );
  }

  async count(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM photos`
    );
    return result?.count || 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.runAsync(
      `DELETE FROM photos WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await this.db.runAsync(`DELETE FROM photos`);
    return result.changes;
  }
}
```

## Acceptance Criteria Mapping

| Scenario | Implementation |
|----------|----------------|
| Given 사용자가 앱 메인 화면에 있을 때, When 카메라 촬영 버튼을 누르면, Then 디바이스 카메라가 실행됩니다 | `capturePhoto()` calls `expo-camera` API |
| Given 카메라가 실행된 상태에서, When 사용자가 사진을 촬영하면, Then 촬영한 사진이 표시되고 저장 여부를 확인할 수 있습니다 | `state = 'preview'`, show confirm/cancel buttons |
| Given 사진이 촬영된 상태에서, When 사용자가 저장을 선택하면, Then 사진이 로컬 데이터베이스에 저장되고 사진 목록에 표시됩니다 | `savePhoto()` → `PhotoRepository.save()` → navigate to list |
| Given 카메라 권한이 없는 상태에서, When 카메라 촬영 버튼을 누르면, Then 권한 요청 다이얼로그가 표시됩니다 | `requestPermission()` → `expo-camera` permission API |
| Given 저장된 사진이 있을 때, When 사진 목록 화면을 열면, Then 모든 저장된 사진이 날짜순으로 표시됩니다 | `PhotoRepository.findAll({ orderBy: 'created_at', order: 'DESC' })` |

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/useCamera.test.ts
describe('useCamera', () => {
  it('should request permission on mount', async () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.hasPermission).toBeNull();
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
  });

  it('should capture photo when permission granted', async () => {
    const { result } = renderHook(() => useCamera());
    await waitFor(() => expect(result.current.hasPermission).toBe(true));

    const photo = await result.current.capturePhoto();
    expect(photo).toBeDefined();
    expect(photo?.uri).toMatch(/^file:\/\//);
  });

  it('should save photo to database', async () => {
    const { result } = renderHook(() => useCamera());
    const savedPhoto = await result.current.savePhoto('file:///test.jpg', {
      width: 1920,
      height: 1080
    });

    expect(savedPhoto.id).toBeGreaterThan(0);
    expect(savedPhoto.uri).toBe('file:///test.jpg');
  });
});
```

### Integration Tests

```typescript
// __tests__/screens/CameraScreen.test.tsx
describe('CameraScreen', () => {
  it('should show camera when permission granted', async () => {
    const { getByText } = render(<CameraScreen />);
    await waitFor(() => {
      expect(getByText('사진 촬영')).toBeTruthy();
    });
  });

  it('should show permission denied message when no permission', async () => {
    jest.spyOn(Camera, 'requestCameraPermissionsAsync')
      .mockResolvedValue({ status: 'denied' });

    const { getByText } = render(<CameraScreen />);
    await waitFor(() => {
      expect(getByText('카메라 권한이 필요합니다')).toBeTruthy();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/camera.e2e.ts
describe('Camera Feature', () => {
  it('should capture and save photo', async () => {
    await element(by.id('camera-tab')).tap();
    await element(by.id('capture-button')).tap();
    await waitFor(element(by.id('photo-preview'))).toBeVisible();
    await element(by.id('save-button')).tap();
    await expect(element(by.id('photo-list'))).toBeVisible();
  });
});
```

## Performance Requirements

- **Permission check**: < 100ms
- **Photo capture**: < 1s
- **Photo save**: < 2s (including DB write)
- **List load (20 items)**: < 500ms
- **Memory**: < 50MB during capture

## Platform Differences

### iOS
- Permission prompt shows once, then user must enable in Settings
- Camera UI uses native iOS camera controls
- Photo saved to app sandbox directory

### Android
- Permission can be requested multiple times
- Camera UI uses native Android camera controls
- Photo saved to app's external cache directory
- Requires `CAMERA` permission in AndroidManifest.xml

## Error Codes

```typescript
enum CameraErrorCode {
  PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  CAPTURE_FAILED = 'CAPTURE_FAILED',
  SAVE_FAILED = 'SAVE_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  UNKNOWN = 'CAMERA_UNKNOWN_ERROR'
}
```
