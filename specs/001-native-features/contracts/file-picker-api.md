# File Picker API Contract

**Feature**: P2 - 파일 선택 및 업로드
**Component**: `useFilePicker` hook + `FilePickerScreen`

## Hook Interface: useFilePicker

### Purpose
파일 선택 권한 요청, 문서/이미지 선택, 파일 메타데이터 검증 및 저장 기능을 제공하는 커스텀 훅

### Signature

```typescript
interface UseFilePickerReturn {
  // State
  hasPermission: boolean | null;
  isLoading: boolean;
  error: string | null;
  selectedFile: SelectedFile | null;

  // Actions
  requestPermission: () => Promise<boolean>;
  pickDocument: (options?: PickerOptions) => Promise<SelectedFile | null>;
  pickImage: (options?: ImagePickerOptions) => Promise<SelectedFile | null>;
  saveFile: (file: SelectedFile) => Promise<UploadedFile>;

  // Helpers
  openSettings: () => void;
  clearSelection: () => void;
}

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified?: number;
}

interface PickerOptions {
  type?: string | string[]; // MIME types: 'application/pdf', 'image/*', etc.
  copyToCacheDirectory?: boolean;
  multiple?: boolean;
}

interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number; // 0-1
}

function useFilePicker(): UseFilePickerReturn;
```

### Usage Example

```typescript
import { useFilePicker } from '@/hooks/useFilePicker';

function FilePickerScreen() {
  const {
    hasPermission,
    isLoading,
    error,
    selectedFile,
    requestPermission,
    pickDocument,
    pickImage,
    saveFile,
    openSettings,
    clearSelection
  } = useFilePicker();

  useEffect(() => {
    requestPermission();
  }, []);

  const handlePickDocument = async () => {
    const file = await pickDocument({
      type: ['application/pdf', 'application/msword', 'text/*'],
      copyToCacheDirectory: true
    });
    if (file) {
      // File selected, preview info
    }
  };

  const handlePickImage = async () => {
    const file = await pickImage({
      allowsEditing: true,
      quality: 0.8
    });
    if (file) {
      // Image selected
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      // Show error: file too large
      return;
    }

    await saveFile(selectedFile);
    clearSelection();
  };

  if (hasPermission === null) {
    return <LoadingIndicator />;
  }

  if (hasPermission === false) {
    return (
      <PermissionDenied
        message="파일 접근 권한이 필요합니다"
        onOpenSettings={openSettings}
      />
    );
  }

  return (
    <View>
      <Button onPress={handlePickDocument} disabled={isLoading}>
        문서 선택
      </Button>
      <Button onPress={handlePickImage} disabled={isLoading}>
        이미지 선택
      </Button>

      {selectedFile && (
        <FilePreview file={selectedFile}>
          <Button onPress={handleSave} disabled={isLoading}>
            저장
          </Button>
          <Button onPress={clearSelection}>취소</Button>
        </FilePreview>
      )}

      {error && <ErrorMessage message={error} />}
    </View>
  );
}
```

## Component Interface: FilePickerScreen

### Props

```typescript
interface FilePickerScreenProps {
  onFileSaved?: (file: UploadedFile) => void;
  onError?: (error: Error) => void;
  allowedTypes?: string[];
  maxFileSize?: number; // bytes, default 10MB
}
```

### Behavior

#### Permission Flow
1. **Mount**: `requestPermission()` 자동 호출
2. **Granted**: 파일 선택 버튼 활성화
3. **Denied**: 권한 안내 메시지 + 설정 이동 버튼

#### Document Pick Flow
1. User taps "문서 선택" button
2. `isLoading = true`
3. Call `expo-document-picker` to show native file picker
4. User selects file
5. Validate file type and size
6. Preview file metadata (name, size, type)
7. User confirms → `saveFile()`
8. User cancels → `clearSelection()`
9. `isLoading = false`

#### Image Pick Flow
1. User taps "이미지 선택" button
2. `isLoading = true`
3. Call `expo-image-picker` to show image picker
4. User selects image (with optional editing)
5. Validate image size
6. Preview image with metadata
7. User confirms → `saveFile()`
8. User cancels → `clearSelection()`
9. `isLoading = false`

#### Error Handling
- File picker unavailable → "파일을 선택할 수 없습니다"
- File size exceeds limit → "파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다"
- Invalid file type → "지원하지 않는 파일 형식입니다"
- Save failed → "파일 저장에 실패했습니다"
- Storage full → "저장공간이 부족합니다"

### Screen States

```typescript
type FilePickerScreenState =
  | 'loading'           // Checking permission
  | 'permission-denied' // No file access permission
  | 'ready'             // Ready to pick file
  | 'picking'           // File picker open
  | 'selected'          // File selected, showing preview
  | 'validating'        // Validating file size/type
  | 'saving'            // Saving to database
  | 'error';            // Error occurred
```

## Repository Interface: FileRepository

### Methods

```typescript
class FileRepository {
  // Create
  async save(input: CreateFileInput): Promise<UploadedFile>;

  // Read
  async findAll(options?: QueryOptions): Promise<UploadedFile[]>;
  async findById(id: number): Promise<UploadedFile | null>;
  async findByType(mimeType: string): Promise<UploadedFile[]>;
  async count(): Promise<number>;
  async getTotalSize(): Promise<number>; // Total bytes used

  // Delete
  async delete(id: number): Promise<boolean>;
  async deleteAll(): Promise<number>; // Returns count deleted
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'file_size' | 'file_name';
  order?: 'ASC' | 'DESC';
  mimeTypeFilter?: string; // e.g., 'image/*', 'application/pdf'
}
```

### Implementation Details

```typescript
// src/services/database/FileRepository.ts
import * as SQLite from 'expo-sqlite';
import { UploadedFile, CreateFileInput } from '@/types/File';

export class FileRepository {
  constructor(private db: SQLite.Database) {}

  async save(input: CreateFileInput): Promise<UploadedFile> {
    const result = await this.db.runAsync(
      `INSERT INTO files (uri, file_name, file_type, file_size) VALUES (?, ?, ?, ?)`,
      [input.uri, input.file_name, input.file_type, input.file_size]
    );

    const inserted = await this.db.getFirstAsync<UploadedFile>(
      `SELECT * FROM files WHERE id = ?`,
      [result.lastInsertRowId]
    );

    if (!inserted) {
      throw new Error('Failed to retrieve inserted file');
    }

    return inserted;
  }

  async findAll(options: QueryOptions = {}): Promise<UploadedFile[]> {
    const {
      limit = 20,
      offset = 0,
      orderBy = 'created_at',
      order = 'DESC',
      mimeTypeFilter
    } = options;

    let query = `SELECT * FROM files`;
    const params: any[] = [];

    if (mimeTypeFilter) {
      query += ` WHERE file_type LIKE ?`;
      params.push(mimeTypeFilter.replace('*', '%'));
    }

    query += ` ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await this.db.getAllAsync<UploadedFile>(query, params);
  }

  async findById(id: number): Promise<UploadedFile | null> {
    return await this.db.getFirstAsync<UploadedFile>(
      `SELECT * FROM files WHERE id = ?`,
      [id]
    );
  }

  async findByType(mimeType: string): Promise<UploadedFile[]> {
    return await this.db.getAllAsync<UploadedFile>(
      `SELECT * FROM files WHERE file_type LIKE ? ORDER BY created_at DESC`,
      [mimeType.replace('*', '%')]
    );
  }

  async count(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM files`
    );
    return result?.count || 0;
  }

  async getTotalSize(): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT SUM(file_size) as total FROM files`
    );
    return result?.total || 0;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.runAsync(
      `DELETE FROM files WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async deleteAll(): Promise<number> {
    const result = await this.db.runAsync(`DELETE FROM files`);
    return result.changes;
  }
}
```

## Acceptance Criteria Mapping

| Scenario | Implementation |
|----------|----------------|
| Given 사용자가 메인 화면에 있을 때, When 파일 선택 버튼을 누르면, Then 디바이스 파일 선택기가 열립니다 | `pickDocument()` or `pickImage()` calls `expo-document-picker` or `expo-image-picker` |
| Given 파일 선택기가 열린 상태에서, When 사용자가 파일을 선택하면, Then 선택한 파일의 이름, 크기, 타입이 화면에 표시됩니다 | `state = 'selected'`, display `selectedFile` metadata in preview |
| Given 파일이 선택된 상태에서, When 사용자가 저장 버튼을 누르면, Then 파일 정보가 데이터베이스에 저장되고 파일 목록에 표시됩니다 | `saveFile()` → `FileRepository.save()` → navigate to list |
| Given 파일 저장소 권한이 없는 상태에서, When 파일 선택 버튼을 누르면, Then 권한 요청 다이얼로그가 표시됩니다 | `requestPermission()` → `expo-document-picker` / `expo-image-picker` permission API |
| Given 대용량 파일을 선택할 때, When 파일 크기가 제한을 초과하면, Then 사용자에게 파일 크기 제한 안내 메시지가 표시됩니다 | Validate `selectedFile.size > 10MB`, show error message |

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/useFilePicker.test.ts
describe('useFilePicker', () => {
  it('should request permission on mount', async () => {
    const { result } = renderHook(() => useFilePicker());
    expect(result.current.hasPermission).toBeNull();
    await waitFor(() => expect(result.current.hasPermission).toBe(true));
  });

  it('should pick document when permission granted', async () => {
    const { result } = renderHook(() => useFilePicker());
    await waitFor(() => expect(result.current.hasPermission).toBe(true));

    const file = await result.current.pickDocument({
      type: 'application/pdf'
    });
    expect(file).toBeDefined();
    expect(file?.mimeType).toBe('application/pdf');
  });

  it('should validate file size limit', async () => {
    const { result } = renderHook(() => useFilePicker());
    const largeFile = {
      uri: 'file:///large.pdf',
      name: 'large.pdf',
      size: 15 * 1024 * 1024, // 15MB
      mimeType: 'application/pdf'
    };

    await expect(result.current.saveFile(largeFile)).rejects.toThrow();
  });

  it('should save file to database', async () => {
    const { result } = renderHook(() => useFilePicker());
    const file = {
      uri: 'file:///test.pdf',
      name: 'test.pdf',
      size: 1024,
      mimeType: 'application/pdf'
    };

    const saved = await result.current.saveFile(file);
    expect(saved.id).toBeGreaterThan(0);
    expect(saved.file_name).toBe('test.pdf');
  });
});
```

### Integration Tests

```typescript
// __tests__/screens/FilePickerScreen.test.tsx
describe('FilePickerScreen', () => {
  it('should show file picker buttons when permission granted', async () => {
    const { getByText } = render(<FilePickerScreen />);
    await waitFor(() => {
      expect(getByText('문서 선택')).toBeTruthy();
      expect(getByText('이미지 선택')).toBeTruthy();
    });
  });

  it('should show file preview after selection', async () => {
    const { getByText, getByTestId } = render(<FilePickerScreen />);
    await waitFor(() => getByText('문서 선택'));

    fireEvent.press(getByText('문서 선택'));

    await waitFor(() => {
      expect(getByTestId('file-preview')).toBeTruthy();
      expect(getByText('저장')).toBeTruthy();
    });
  });

  it('should show error for oversized files', async () => {
    const { getByText } = render(<FilePickerScreen maxFileSize={5 * 1024 * 1024} />);

    // Mock large file selection
    await waitFor(() => {
      expect(getByText(/최대.*MB까지/)).toBeTruthy();
    });
  });
});
```

### E2E Tests

```typescript
// e2e/file-picker.e2e.ts
describe('File Picker Feature', () => {
  it('should pick and save document', async () => {
    await element(by.id('file-picker-tab')).tap();
    await element(by.id('pick-document-button')).tap();
    // Interact with native file picker (mocked in E2E)
    await waitFor(element(by.id('file-preview'))).toBeVisible();
    await element(by.id('save-button')).tap();
    await expect(element(by.id('file-list'))).toBeVisible();
  });

  it('should pick and save image', async () => {
    await element(by.id('file-picker-tab')).tap();
    await element(by.id('pick-image-button')).tap();
    await waitFor(element(by.id('file-preview'))).toBeVisible();
    await element(by.id('save-button')).tap();
    await expect(element(by.id('file-list'))).toBeVisible();
  });
});
```

## Performance Requirements

- **Permission check**: < 100ms
- **Document picker launch**: < 500ms
- **File validation**: < 200ms
- **File save (10MB)**: < 3s (including DB write)
- **List load (20 items)**: < 500ms
- **Memory**: < 100MB during large file selection

## Platform Differences

### iOS
- Permission prompt shows once for photo library access
- Document picker uses `UIDocumentPickerViewController`
- Image picker uses `UIImagePickerController`
- Files copied to app's Documents directory
- iCloud Drive integration available

### Android
- Permission varies by Android version:
  - Android 13+: Granular media permissions
  - Android 10-12: Scoped storage
  - Android < 10: `READ_EXTERNAL_STORAGE` permission
- Document picker uses Storage Access Framework (SAF)
- Image picker uses `Intent.ACTION_GET_CONTENT`
- Files copied to app's cache directory
- Requires permissions in AndroidManifest.xml

## Error Codes

```typescript
enum FilePickerErrorCode {
  PERMISSION_DENIED = 'FILE_PERMISSION_DENIED',
  PICKER_CANCELLED = 'PICKER_CANCELLED',
  PICKER_UNAVAILABLE = 'PICKER_UNAVAILABLE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  SAVE_FAILED = 'FILE_SAVE_FAILED',
  STORAGE_FULL = 'STORAGE_FULL',
  UNKNOWN = 'FILE_UNKNOWN_ERROR'
}
```

## MIME Type Filtering

### Supported Categories

```typescript
const MIME_TYPES = {
  // Images
  images: 'image/*',
  jpeg: 'image/jpeg',
  png: 'image/png',

  // Documents
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],

  // All files
  all: '*/*'
};
```

### Validation

```typescript
function validateFile(file: SelectedFile, options: ValidationOptions): ValidationResult {
  // Size check
  if (file.size > options.maxSize) {
    return {
      valid: false,
      error: FilePickerErrorCode.FILE_TOO_LARGE
    };
  }

  // Type check
  if (options.allowedTypes && !matchesMimeType(file.mimeType, options.allowedTypes)) {
    return {
      valid: false,
      error: FilePickerErrorCode.INVALID_FILE_TYPE
    };
  }

  return { valid: true };
}
```
