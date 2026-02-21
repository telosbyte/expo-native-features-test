# Data Model: 네이티브 기능 통합 테스트 앱

**Feature**: 001-native-features
**Created**: 2026-02-21
**Database**: SQLite (expo-sqlite)

## Overview

이 문서는 네이티브 기능 테스트 앱의 데이터 모델을 정의합니다. 모든 데이터는 SQLite 로컬 데이터베이스에 저장되며, 4개의 주요 엔티티로 구성됩니다.

## Entities

### 1. CapturedPhoto (사진)

카메라로 촬영한 사진 정보를 저장합니다.

**Table Name**: `photos`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 고유 식별자 |
| uri | TEXT | NOT NULL | 사진 파일 경로 (file://) |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 촬영 일시 (ISO 8601) |
| file_size | INTEGER | NULL | 파일 크기 (bytes) |
| width | INTEGER | NULL | 이미지 가로 크기 (px) |
| height | INTEGER | NULL | 이미지 세로 크기 (px) |

**Indexes**:
- `idx_photos_created_at` on `created_at DESC` (목록 조회 최적화)

**Validation Rules**:
- `uri` must start with "file://"
- `file_size` > 0 if provided
- `width`, `height` > 0 if provided

**Sample Data**:
```json
{
  "id": 1,
  "uri": "file:///data/user/0/com.example.app/cache/Camera/photo_123.jpg",
  "created_at": "2026-02-21T10:30:00.000Z",
  "file_size": 2048576,
  "width": 1920,
  "height": 1080
}
```

---

### 2. UploadedFile (파일)

사용자가 선택한 파일의 메타데이터를 저장합니다.

**Table Name**: `files`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 고유 식별자 |
| name | TEXT | NOT NULL | 파일 이름 |
| uri | TEXT | NOT NULL | 파일 경로 |
| mime_type | TEXT | NULL | MIME 타입 (e.g., "image/jpeg") |
| size | INTEGER | NOT NULL | 파일 크기 (bytes) |
| uploaded_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 선택 일시 (ISO 8601) |

**Indexes**:
- `idx_files_uploaded_at` on `uploaded_at DESC`
- `idx_files_mime_type` on `mime_type` (타입별 필터링)

**Validation Rules**:
- `name` must not be empty
- `uri` must be valid file path
- `size` must be > 0 and <= 10485760 (10MB)
- `mime_type` should be valid MIME type if provided

**Sample Data**:
```json
{
  "id": 1,
  "name": "document.pdf",
  "uri": "file:///data/user/0/com.example.app/files/document.pdf",
  "mime_type": "application/pdf",
  "size": 524288,
  "uploaded_at": "2026-02-21T10:35:00.000Z"
}
```

---

### 3. LocationRecord (위치)

GPS 위치 조회 기록을 저장합니다.

**Table Name**: `locations`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 고유 식별자 |
| latitude | REAL | NOT NULL | 위도 (-90 to 90) |
| longitude | REAL | NOT NULL | 경도 (-180 to 180) |
| accuracy | REAL | NULL | 정확도 (meters) |
| altitude | REAL | NULL | 고도 (meters) |
| heading | REAL | NULL | 진행 방향 (degrees, 0-360) |
| speed | REAL | NULL | 속도 (m/s) |
| created_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 조회 일시 (ISO 8601) |

**Indexes**:
- `idx_locations_created_at` on `created_at DESC`
- `idx_locations_coords` on `latitude, longitude` (지도 쿼리 최적화)

**Validation Rules**:
- `latitude` between -90 and 90
- `longitude` between -180 and 180
- `accuracy` >= 0 if provided
- `heading` between 0 and 360 if provided
- `speed` >= 0 if provided

**Sample Data**:
```json
{
  "id": 1,
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.5,
  "altitude": 15.2,
  "heading": 180.0,
  "speed": 0.0,
  "created_at": "2026-02-21T10:40:00.000Z"
}
```

---

### 4. ScannedBarcode (바코드)

스캔한 바코드/QR 코드 정보를 저장합니다.

**Table Name**: `barcodes`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 고유 식별자 |
| type | TEXT | NOT NULL | 바코드 타입 (QR, EAN13, etc.) |
| data | TEXT | NOT NULL | 바코드 데이터 (스캔된 텍스트) |
| scanned_at | TEXT | NOT NULL DEFAULT CURRENT_TIMESTAMP | 스캔 일시 (ISO 8601) |
| raw_value | TEXT | NULL | 원본 바코드 값 (추가 정보) |

**Indexes**:
- `idx_barcodes_scanned_at` on `scanned_at DESC`
- `idx_barcodes_type` on `type` (타입별 필터링)

**Validation Rules**:
- `type` must be one of: QR, EAN13, EAN8, UPCE, CODE39, CODE128, ITF14, AZTEC, PDF417, DATAMATRIX, CODE93, CODABAR, UPC_A
- `data` must not be empty
- Maximum `data` length: 4096 characters

**Sample Data**:
```json
{
  "id": 1,
  "type": "QR",
  "data": "https://example.com",
  "scanned_at": "2026-02-21T10:45:00.000Z",
  "raw_value": null
}
```

## Relationships

이 앱은 단순한 테스트 앱이므로 엔티티 간 관계가 없습니다. 각 엔티티는 독립적으로 저장되고 조회됩니다.

미래 확장 가능성:
- `CapturedPhoto`와 `LocationRecord` 연결 (사진에 위치 태그)
- 사용자 엔티티 추가 (다중 사용자 지원 시)

## Database Schema (SQL)

```sql
-- Enable WAL mode for better performance
PRAGMA journal_mode = WAL;

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  file_size INTEGER,
  width INTEGER,
  height INTEGER
);

CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  uri TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_mime_type ON files(mime_type);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  altitude REAL,
  heading REAL,
  speed REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_locations_created_at ON locations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_coords ON locations(latitude, longitude);

-- Barcodes table
CREATE TABLE IF NOT EXISTS barcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  raw_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_barcodes_scanned_at ON barcodes(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_barcodes_type ON barcodes(type);
```

## TypeScript Types

```typescript
// src/types/Photo.ts
export interface Photo {
  id: number;
  uri: string;
  created_at: string; // ISO 8601
  file_size?: number;
  width?: number;
  height?: number;
}

export interface CreatePhotoInput {
  uri: string;
  file_size?: number;
  width?: number;
  height?: number;
}

// src/types/File.ts
export interface UploadedFile {
  id: number;
  name: string;
  uri: string;
  mime_type?: string;
  size: number;
  uploaded_at: string; // ISO 8601
}

export interface CreateFileInput {
  name: string;
  uri: string;
  mime_type?: string;
  size: number;
}

// src/types/Location.ts
export interface LocationRecord {
  id: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  created_at: string; // ISO 8601
}

export interface CreateLocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

// src/types/Barcode.ts
export type BarcodeType =
  | 'QR'
  | 'EAN13'
  | 'EAN8'
  | 'UPCE'
  | 'CODE39'
  | 'CODE128'
  | 'ITF14'
  | 'AZTEC'
  | 'PDF417'
  | 'DATAMATRIX'
  | 'CODE93'
  | 'CODABAR'
  | 'UPC_A';

export interface ScannedBarcode {
  id: number;
  type: BarcodeType;
  data: string;
  scanned_at: string; // ISO 8601
  raw_value?: string;
}

export interface CreateBarcodeInput {
  type: BarcodeType;
  data: string;
  raw_value?: string;
}
```

## Migration Strategy

### Initial Migration (v1)

```typescript
// src/services/database/migrations.ts
export const migrations = [
  {
    version: 1,
    up: async (db: SQLite.Database) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uri TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          file_size INTEGER,
          width INTEGER,
          height INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

        -- ... (repeat for all tables)
      `);
    },
    down: async (db: SQLite.Database) => {
      await db.execAsync(`
        DROP TABLE IF EXISTS barcodes;
        DROP TABLE IF EXISTS locations;
        DROP TABLE IF EXISTS files;
        DROP TABLE IF EXISTS photos;
      `);
    }
  }
];
```

### Future Migrations

추가 필드나 인덱스가 필요한 경우:

```typescript
{
  version: 2,
  up: async (db: SQLite.Database) => {
    await db.execAsync(`
      ALTER TABLE photos ADD COLUMN location_id INTEGER REFERENCES locations(id);
      CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(location_id);
    `);
  },
  down: async (db: SQLite.Database) => {
    // SQLite doesn't support DROP COLUMN, so recreate table
    await db.execAsync(`
      CREATE TABLE photos_backup AS SELECT id, uri, created_at, file_size, width, height FROM photos;
      DROP TABLE photos;
      ALTER TABLE photos_backup RENAME TO photos;
      CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
    `);
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Indexes**: 모든 테이블에 `created_at/uploaded_at/scanned_at` DESC 인덱스로 최신 데이터 빠른 조회
2. **WAL Mode**: Write-Ahead Logging으로 읽기/쓰기 동시성 개선
3. **Batch Operations**: 여러 레코드 삽입 시 트랜잭션 사용
4. **Pagination**: 목록 조회 시 LIMIT/OFFSET으로 메모리 절약
5. **Cleanup**: 주기적으로 오래된 레코드 삭제 (100개 제한 준수)

### Query Examples

```typescript
// 최신 10개 사진 조회 (페이지네이션)
SELECT * FROM photos ORDER BY created_at DESC LIMIT 10 OFFSET 0;

// 특정 MIME 타입 파일 조회
SELECT * FROM files WHERE mime_type LIKE 'image/%' ORDER BY uploaded_at DESC;

// 특정 범위 위치 조회
SELECT * FROM locations
WHERE latitude BETWEEN ? AND ?
  AND longitude BETWEEN ? AND ?
ORDER BY created_at DESC;

// 바코드 타입별 통계
SELECT type, COUNT(*) as count FROM barcodes GROUP BY type;

// 전체 레코드 수 확인 (100개 제한 체크)
SELECT
  (SELECT COUNT(*) FROM photos) +
  (SELECT COUNT(*) FROM files) +
  (SELECT COUNT(*) FROM locations) +
  (SELECT COUNT(*) FROM barcodes) as total_records;
```

## Data Lifecycle

### Creation
- 사용자가 각 네이티브 기능 사용 시 즉시 생성
- 트랜잭션으로 원자성 보장

### Reading
- 각 엔티티별 목록 화면에서 최신순 조회
- 페이지네이션으로 메모리 효율적 로딩

### Updating
- 현재 버전에서는 업데이트 없음 (불변 레코드)
- 미래: 사진/파일에 메타데이터 추가 기능

### Deletion
- 사용자가 개별 레코드 삭제 가능
- 레코드 수가 100개 초과 시 알림 표시 및 오래된 데이터 자동 삭제 옵션 제공
- Cascade delete 없음 (독립적 엔티티)

## Storage Estimates

### Per Record Storage

- **Photo**: ~100 bytes (메타데이터만, 실제 이미지 파일은 별도)
- **File**: ~150 bytes (메타데이터만)
- **Location**: ~80 bytes
- **Barcode**: ~200 bytes (데이터 길이에 따라 가변)

### Total Capacity

- 100개 레코드: ~13KB (데이터베이스 크기)
- 실제 파일 저장공간: 별도 계산 필요 (사진/파일 원본)
- 권장 최대: 1000개 레코드 (~130KB DB)

## Backup & Recovery

### 자동 백업 (미래 기능)
- SQLite 파일을 디바이스 문서 디렉토리에 복사
- Export to JSON 기능

### 복구
- 앱 재설치 시 데이터 손실 (로컬 전용)
- 미래: iCloud/Google Drive 백업 통합 가능
