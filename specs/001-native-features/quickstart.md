# Quickstart Guide: 네이티브 기능 통합 테스트 앱

**Feature**: 001-native-features
**Last Updated**: 2026-02-21
**Target Developers**: React Native + Expo developers

## 개요

이 가이드는 네이티브 기능 통합 테스트 앱을 처음부터 개발하는 방법을 단계별로 안내합니다. TDD (Test-Driven Development) 원칙에 따라 테스트를 먼저 작성하고, 컴포넌트 기반으로 개발하며, 크로스 플랫폼 호환성을 보장합니다.

## 전제 조건

### 필수 소프트웨어

- **Node.js**: 18.x 이상
- **npm** 또는 **yarn** 또는 **pnpm**
- **Expo CLI**: `npm install -g expo-cli`
- **Git**: 버전 관리용

### 개발 환경

- **iOS 개발**: macOS + Xcode 14+ (iOS 13+ 시뮬레이터)
- **Android 개발**: Android Studio + Android SDK (API 26+)
- **실물 테스트**: Expo Go 앱 (iOS/Android)

### 권장 도구

- **IDE**: VS Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - TypeScript
- **Testing**: Jest, React Native Testing Library
- **Debugging**: React Native Debugger, Flipper

## 프로젝트 설정

### 1. Expo 프로젝트 생성

```bash
# Create new Expo project with TypeScript template
npx create-expo-app@latest expo-native-features-test --template tabs

cd expo-native-features-test

# Install required dependencies
npm install expo-camera expo-image-picker expo-document-picker expo-location expo-barcode-scanner expo-sqlite
```

### 2. 디렉토리 구조 설정

```bash
# Create directory structure
mkdir -p src/{components,screens,hooks,services,types,utils}
mkdir -p src/services/{database,permissions}
mkdir -p src/services/database
mkdir -p __tests__/{components,hooks,services,e2e}
```

### 3. TypeScript 설정

`tsconfig.json` 업데이트:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

### 4. Babel 설정

`babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
```

Install babel plugin:

```bash
npm install --save-dev babel-plugin-module-resolver
```

### 5. Expo 설정

`app.json` 업데이트:

```json
{
  "expo": {
    "name": "Native Features Test",
    "slug": "native-features-test",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.example.nativefeatures",
      "infoPlist": {
        "NSCameraUsageDescription": "이 앱은 사진 촬영과 바코드 스캔을 위해 카메라 접근이 필요합니다.",
        "NSPhotoLibraryUsageDescription": "촬영한 사진을 저장하기 위해 사진 라이브러리 접근이 필요합니다.",
        "NSLocationWhenInUseUsageDescription": "현재 위치 조회를 위해 위치 정보 접근이 필요합니다."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.example.nativefeatures",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION"
      ]
    },
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "카메라 접근 권한이 필요합니다.",
          "microphonePermission": false
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "위치 정보 접근 권한이 필요합니다."
        }
      ]
    ]
  }
}
```

## 개발 워크플로우 (TDD)

헌법의 TDD 원칙에 따라 다음 순서로 개발합니다:

### Phase 1: 테스트 작성 (RED)

1. **테스트 먼저 작성**: 각 기능의 인수 테스트 작성
2. **테스트 실행**: 모든 테스트가 실패하는지 확인 (RED)
3. **사용자 승인**: 테스트가 요구사항을 정확히 반영하는지 확인

### Phase 2: 최소 구현 (GREEN)

1. **최소 코드 작성**: 테스트를 통과하는 최소한의 코드
2. **테스트 실행**: 테스트가 통과하는지 확인 (GREEN)
3. **커밋**: 테스트 통과 시점에 커밋

### Phase 3: 리팩토링 (REFACTOR)

1. **코드 개선**: 중복 제거, 가독성 향상
2. **테스트 재실행**: 리팩토링 후에도 테스트 통과 확인
3. **커밋**: 리팩토링 완료 후 커밋

## 단계별 구현 가이드

### Step 1: 데이터베이스 설정 (Foundation)

#### 1.1 Schema 정의

`src/services/database/schema.ts`:

```typescript
export const SCHEMA_VERSION = 1;

export const INIT_SCHEMA = `
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

  -- ... (다른 테이블들)
`;
```

#### 1.2 Database Service

`src/services/database/DatabaseService.ts`:

```typescript
import * as SQLite from 'expo-sqlite';
import { INIT_SCHEMA, SCHEMA_VERSION } from './schema';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.Database | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('native_features.db');
    await this.db.execAsync(INIT_SCHEMA);
  }

  getDatabase(): SQLite.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }
}
```

#### 1.3 테스트 작성 (RED)

`__tests__/services/DatabaseService.test.ts`:

```typescript
import { DatabaseService } from '@/services/database/DatabaseService';

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(async () => {
    dbService = DatabaseService.getInstance();
    await dbService.initialize();
  });

  it('should initialize database', async () => {
    const db = dbService.getDatabase();
    expect(db).toBeDefined();
  });

  it('should create photos table', async () => {
    const db = dbService.getDatabase();
    const result = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='photos'"
    );
    expect(result).toBeDefined();
  });
});
```

### Step 2: P1 - 카메라 기능 (MVP)

#### 2.1 테스트 작성 (RED)

`__tests__/hooks/useCamera.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCamera } from '@/hooks/useCamera';
import * as Camera from 'expo-camera';

jest.mock('expo-camera');

describe('useCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request permission on mount', async () => {
    jest.spyOn(Camera, 'requestCameraPermissionsAsync')
      .mockResolvedValue({ status: 'granted', canAskAgain: true, expires: 'never', granted: true });

    const { result } = renderHook(() => useCamera());

    await waitFor(() => {
      expect(result.current.hasPermission).toBe(true);
    });
  });

  it('should capture photo when permission granted', async () => {
    jest.spyOn(Camera, 'requestCameraPermissionsAsync')
      .mockResolvedValue({ status: 'granted', canAskAgain: true, expires: 'never', granted: true });

    const { result } = renderHook(() => useCamera());

    await waitFor(() => expect(result.current.hasPermission).toBe(true));

    // Mock camera capture
    const photo = await result.current.capturePhoto();
    expect(photo).toBeDefined();
  });
});
```

#### 2.2 Hook 구현 (GREEN)

`src/hooks/useCamera.ts`:

```typescript
import { useState, useEffect } from 'react';
import * as Camera from 'expo-camera';
import { PhotoRepository } from '@/services/database/PhotoRepository';
import { Photo, CreatePhotoInput } from '@/types/Photo';

export function useCamera() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (err) {
      setError('권한 요청 중 오류가 발생했습니다');
      return false;
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  const capturePhoto = async (): Promise<Photo | null> => {
    // Implementation
    return null;
  };

  const savePhoto = async (uri: string, metadata?: any): Promise<Photo> => {
    // Implementation
    throw new Error('Not implemented');
  };

  return {
    hasPermission,
    isLoading,
    error,
    requestPermission,
    capturePhoto,
    savePhoto,
  };
}
```

#### 2.3 컴포넌트 구현

`app/(tabs)/camera.tsx`:

```typescript
import { View, Button, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Button onPress={requestPermission} title="카메라 권한 요청" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera}>
        <View style={styles.buttonContainer}>
          <Button title="사진 촬영" onPress={() => {/* TODO */}} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  buttonContainer: { position: 'absolute', bottom: 40, alignSelf: 'center' },
});
```

### Step 3: P2 - 파일 업로드

*(동일한 TDD 패턴 반복)*

1. `__tests__/hooks/useFilePicker.test.ts` 작성
2. `src/hooks/useFilePicker.ts` 구현
3. `app/(tabs)/files.tsx` 컴포넌트 작성

### Step 4: P3 - GPS 위치

*(동일한 TDD 패턴 반복)*

### Step 5: P4 - 바코드 스캔

*(동일한 TDD 패턴 반복)*

## 테스트 실행

### 단위 테스트

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### E2E 테스트 (Detox)

```bash
# Setup Detox (first time only)
npm install --save-dev detox detox-cli

# Build app
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

## 빌드 및 실행

### 개발 빌드

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on physical device (Expo Go)
npm start
# Scan QR code with Expo Go app
```

### 프로덕션 빌드

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 디버깅 팁

### Common Issues

#### 1. 카메라 권한 테스트
```bash
# Reset iOS simulator permissions
xcrun simctl privacy booted reset all
```

#### 2. SQLite 디버그
```typescript
// Enable SQL logging
db.execAsync('PRAGMA journal_mode = WAL');
console.log('Database ready');
```

#### 3. 네이티브 모듈 에러
```bash
# Clear cache and reinstall
npm start -- --reset-cache
rm -rf node_modules
npm install
```

## 코딩 스타일 가이드

### 파일 명명 규칙
- 컴포넌트: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Services: `PascalCase.ts`
- Types: `PascalCase.ts`
- Tests: `*.test.ts` or `*.test.tsx`

### TypeScript 규칙
- Always use explicit types
- Prefer interfaces over types for objects
- Use enums for fixed sets of values

### 주석 규칙
- JSDoc for all public APIs
- Inline comments for complex logic only
- Korean for user-facing messages

## 성능 최적화

### 이미지 최적화
```typescript
// Compress photos before saving
import * as ImageManipulator from 'expo-image-manipulator';

const compressedImage = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1920 } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);
```

### 데이터베이스 최적화
```typescript
// Use transactions for batch operations
await db.withTransactionAsync(async () => {
  for (const photo of photos) {
    await photoRepo.save(photo);
  }
});
```

## 배포 체크리스트

- [ ] 모든 테스트 통과
- [ ] 린팅 에러 없음
- [ ] iOS/Android 양쪽에서 테스트
- [ ] 권한 처리 검증
- [ ] 성능 기준 충족 (SC-001 ~ SC-012)
- [ ] 에러 처리 검증
- [ ] 오프라인 동작 확인
- [ ] 100개 레코드 성능 테스트
- [ ] 접근성 레이블 확인
- [ ] README.md 업데이트

## 추가 리소스

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Project Constitution](../../.specify/memory/constitution.md)
- [Feature Spec](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)

## 다음 단계

1. `/speckit.tasks` 실행하여 구현 작업 목록 생성
2. P1 (카메라) 기능부터 시작
3. TDD 사이클 준수하며 개발
4. 각 우선순위별로 독립적으로 완성 및 테스트
