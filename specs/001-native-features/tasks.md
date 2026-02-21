# Tasks: 네이티브 기능 통합 테스트 앱

**Input**: Design documents from `/specs/001-native-features/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD 원칙에 따라 각 사용자 스토리에 대해 테스트를 먼저 작성합니다.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Mobile (Expo)**: `app/`, `src/`, `__tests__/` at repository root
- Expo Router file-based routing: `app/(tabs)/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Expo 프로젝트 초기화 및 기본 구조 설정

- [ ] T001 Create Expo project with TypeScript template using `npx create-expo-app@latest . --template tabs`
- [ ] T002 Install required Expo dependencies: expo-camera, expo-image-picker, expo-document-picker, expo-location, expo-barcode-scanner, expo-sqlite
- [ ] T003 [P] Configure TypeScript paths in tsconfig.json with `@/*` alias for src directory
- [ ] T004 [P] Configure Babel module resolver for path aliases in babel.config.js
- [ ] T005 [P] Update app.json with iOS/Android permissions and Expo plugins configuration
- [ ] T006 [P] Create directory structure: src/{components,screens,hooks,services,types,utils}
- [ ] T007 [P] Create subdirectories: src/services/{database,permissions}, __tests__/{components,hooks,services,e2e}
- [ ] T008 [P] Install dev dependencies: jest, @testing-library/react-native, @testing-library/jest-native
- [ ] T009 [P] Configure Jest in package.json with React Native preset
- [ ] T010 [P] Create .gitignore and .env.example files

**Checkpoint**: 프로젝트 구조 완성, 의존성 설치 완료

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 모든 사용자 스토리가 의존하는 핵심 인프라 구축

**⚠️ CRITICAL**: 이 단계 완료 전까지 사용자 스토리 작업 불가

- [ ] T011 Create TypeScript types for Photo entity in src/types/Photo.ts
- [ ] T012 [P] Create TypeScript types for UploadedFile entity in src/types/File.ts
- [ ] T013 [P] Create TypeScript types for LocationRecord entity in src/types/Location.ts
- [ ] T014 [P] Create TypeScript types for ScannedBarcode entity in src/types/Barcode.ts
- [ ] T015 Create database schema SQL in src/services/database/schema.ts with WAL mode and all 4 tables
- [ ] T016 Create DatabaseService singleton in src/services/database/DatabaseService.ts with initialize() method
- [ ] T017 Create PermissionService in src/services/permissions/PermissionService.ts with request/check methods
- [ ] T018 [P] Create reusable Button component in src/components/Button.tsx with accessibility labels
- [ ] T019 [P] Create reusable Card component in src/components/Card.tsx
- [ ] T020 [P] Create reusable List component in src/components/List.tsx
- [ ] T021 [P] Create ErrorMessage component in src/components/ErrorMessage.tsx
- [ ] T022 [P] Create LoadingIndicator component in src/components/LoadingIndicator.tsx
- [ ] T023 Initialize database on app startup in app/_layout.tsx
- [ ] T024 [P] Write unit tests for DatabaseService in __tests__/services/DatabaseService.test.ts
- [ ] T025 [P] Write unit tests for PermissionService in __tests__/services/PermissionService.test.ts

**Checkpoint**: Foundation ready - 데이터베이스, 권한 서비스, 공통 컴포넌트 준비 완료, 사용자 스토리 구현 시작 가능

---

## Phase 3: User Story 1 - 카메라로 사진 촬영 및 저장 (Priority: P1) 🎯 MVP

**Goal**: 사용자가 카메라로 사진을 촬영하고 SQLite에 저장하여 목록으로 확인할 수 있습니다

**Independent Test**: 앱을 실행하여 카메라 탭으로 이동, 사진 촬영 버튼 누르기, 사진 촬영 후 저장, 목록 화면에서 저장된 사진 확인

### Tests for User Story 1 (TDD: Write FIRST, ensure they FAIL)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T026 [P] [US1] Write unit tests for useCamera hook in __tests__/hooks/useCamera.test.ts (permission request, capture, save photo)
- [ ] T027 [P] [US1] Write unit tests for PhotoRepository in __tests__/services/database/PhotoRepository.test.ts (CRUD operations)
- [ ] T028 [P] [US1] Write integration tests for CameraScreen in __tests__/components/CameraScreen.test.tsx (permission flow, capture flow)

### Implementation for User Story 1

- [ ] T029 [US1] Create PhotoRepository in src/services/database/PhotoRepository.ts with save, findAll, findById, delete methods
- [ ] T030 [US1] Create useCamera custom hook in src/hooks/useCamera.ts with permission, capture, save logic
- [ ] T031 [US1] Create CameraScreen component in app/(tabs)/camera.tsx with CameraView, capture button, permission handling
- [ ] T032 [US1] Add photo preview modal to CameraScreen with save/cancel buttons
- [ ] T033 [US1] Create PhotoList component in src/screens/PhotoList/PhotoList.tsx to display saved photos
- [ ] T034 [US1] Add navigation to PhotoList from camera tab
- [ ] T035 [US1] Implement photo deletion feature in PhotoList with swipe-to-delete
- [ ] T036 [US1] Add error handling for camera unavailable, storage full, save failed
- [ ] T037 [US1] Add loading indicator during photo capture and save operations
- [ ] T038 [US1] Add accessibilityLabel to all interactive elements in CameraScreen

**Checkpoint**: User Story 1 완성 - 카메라 촬영, 저장, 목록 조회, 삭제 기능 모두 동작, 독립적으로 테스트 가능

---

## Phase 4: User Story 2 - 파일 선택 및 업로드 (Priority: P2)

**Goal**: 사용자가 디바이스 파일 시스템에서 파일을 선택하고 메타데이터를 SQLite에 저장하여 목록으로 확인할 수 있습니다

**Independent Test**: 파일 탭으로 이동, 파일 선택 버튼 누르기, 파일 선택, 파일 정보 표시 확인, 저장, 목록에서 확인

### Tests for User Story 2 (TDD: Write FIRST, ensure they FAIL)

- [ ] T039 [P] [US2] Write unit tests for useFilePicker hook in __tests__/hooks/useFilePicker.test.ts (pick document, pick image, file size validation)
- [ ] T040 [P] [US2] Write unit tests for FileRepository in __tests__/services/database/FileRepository.test.ts (CRUD operations, MIME type filtering)
- [ ] T041 [P] [US2] Write integration tests for FilePickerScreen in __tests__/components/FilePickerScreen.test.tsx (file selection flow, validation)

### Implementation for User Story 2

- [ ] T042 [US2] Create FileRepository in src/services/database/FileRepository.ts with save, findAll, findByMimeType, delete methods
- [ ] T043 [US2] Create useFilePicker custom hook in src/hooks/useFilePicker.ts with pickDocument, pickImage, validation logic
- [ ] T044 [US2] Create FilePickerScreen component in app/(tabs)/files.tsx with document/image picker buttons
- [ ] T045 [US2] Add file info display component showing name, size, type after selection
- [ ] T046 [US2] Implement 10MB file size validation with user-friendly error message
- [ ] T047 [US2] Create FileList component in src/screens/FileList/FileList.tsx to display saved files
- [ ] T048 [US2] Add MIME type filter to FileList (images, documents, all)
- [ ] T049 [US2] Add file deletion feature in FileList with confirmation dialog
- [ ] T050 [US2] Add error handling for permission denied, file size exceeded, unsupported file type
- [ ] T051 [US2] Add accessibilityLabel to all interactive elements in FilePickerScreen

**Checkpoint**: User Story 2 완성 - 파일 선택, 검증, 저장, 목록 조회, 삭제 기능 모두 동작, US1과 독립적으로 테스트 가능

---

## Phase 5: User Story 3 - GPS 위치 정보 확인 및 저장 (Priority: P3)

**Goal**: 사용자가 현재 GPS 위치를 조회하고 SQLite에 저장하여 위치 기록 목록으로 확인할 수 있습니다

**Independent Test**: 위치 탭으로 이동, 위치 조회 버튼 누르기, 현재 좌표 표시 확인, 저장, 위치 목록에서 확인

### Tests for User Story 3 (TDD: Write FIRST, ensure they FAIL)

- [ ] T052 [P] [US3] Write unit tests for useLocation hook in __tests__/hooks/useLocation.test.ts (permission, get location, timeout handling)
- [ ] T053 [P] [US3] Write unit tests for LocationRepository in __tests__/services/database/LocationRepository.test.ts (CRUD operations, spatial queries)
- [ ] T054 [P] [US3] Write integration tests for LocationScreen in __tests__/components/LocationScreen.test.tsx (location fetch flow, timeout)

### Implementation for User Story 3

- [ ] T055 [US3] Create LocationRepository in src/services/database/LocationRepository.ts with save, findAll, findById, delete methods
- [ ] T056 [US3] Create useLocation custom hook in src/hooks/useLocation.ts with permission, getCurrentLocation, 10s timeout logic
- [ ] T057 [US3] Create LocationScreen component in app/(tabs)/location.tsx with get location button, coordinate display
- [ ] T058 [US3] Add accuracy indicator to LocationScreen showing GPS accuracy level
- [ ] T059 [US3] Implement 10-second timeout with loading progress indicator
- [ ] T060 [US3] Create LocationList component in src/screens/LocationList/LocationList.tsx to display location history
- [ ] T061 [US3] Add location deletion feature in LocationList with confirmation
- [ ] T062 [US3] Add error handling for permission denied, GPS unavailable, timeout exceeded
- [ ] T063 [US3] Add "Location not found" message when GPS signal is weak
- [ ] T064 [US3] Add accessibilityLabel to all interactive elements in LocationScreen

**Checkpoint**: User Story 3 완성 - GPS 조회, 저장, 목록 조회, 삭제 기능 모두 동작, US1/US2와 독립적으로 테스트 가능

---

## Phase 6: User Story 4 - 바코드/QR 코드 스캔 (Priority: P4)

**Goal**: 사용자가 카메라로 바코드/QR 코드를 스캔하고 데이터를 SQLite에 저장하여 스캔 기록 목록으로 확인할 수 있습니다

**Independent Test**: 바코드 탭으로 이동, 스캔 시작 버튼 누르기, 바코드 스캔, 스캔 데이터 표시 확인, 저장, 목록에서 확인

### Tests for User Story 4 (TDD: Write FIRST, ensure they FAIL)

- [ ] T065 [P] [US4] Write unit tests for useBarcodeScanner hook in __tests__/hooks/useBarcodeScanner.test.ts (permission, scan, debounce, save)
- [ ] T066 [P] [US4] Write unit tests for BarcodeRepository in __tests__/services/database/BarcodeRepository.test.ts (CRUD operations, type filtering)
- [ ] T067 [P] [US4] Write integration tests for BarcodeScannerScreen in __tests__/components/BarcodeScannerScreen.test.tsx (scan flow, timeout)

### Implementation for User Story 4

- [ ] T068 [US4] Create BarcodeRepository in src/services/database/BarcodeRepository.ts with save, findAll, findByType, delete methods
- [ ] T069 [US4] Create useBarcodeScanner custom hook in src/hooks/useBarcodeScanner.ts with permission, scan, 2s debounce logic
- [ ] T070 [US4] Create BarcodeScannerScreen component in app/(tabs)/barcode.tsx with CameraView barcode scanning mode
- [ ] T071 [US4] Add barcode scanning overlay with frame indicator to BarcodeScannerScreen
- [ ] T072 [US4] Implement 2-second debounce to prevent duplicate scans
- [ ] T073 [US4] Add scanned data preview modal with barcode type and data display
- [ ] T074 [US4] Create BarcodeList component in src/screens/BarcodeList/BarcodeList.tsx to display scan history
- [ ] T075 [US4] Add barcode type filter to BarcodeList (QR, EAN13, CODE128, etc.)
- [ ] T076 [US4] Add barcode deletion feature in BarcodeList with confirmation
- [ ] T077 [US4] Implement 10-second scan timeout with retry option
- [ ] T078 [US4] Add error handling for permission denied, camera unavailable, unrecognized barcode
- [ ] T079 [US4] Add accessibilityLabel to all interactive elements in BarcodeScannerScreen

**Checkpoint**: User Story 4 완성 - 바코드 스캔, 저장, 목록 조회, 삭제 기능 모두 동작, 모든 사용자 스토리 독립적으로 기능

---

## Phase 7: 통합 데이터 목록 화면 (Cross-Story Feature)

**Purpose**: 모든 저장된 데이터를 한 곳에서 확인할 수 있는 통합 화면

- [ ] T080 Create RecordsScreen in app/(tabs)/records.tsx with tabbed interface for all data types
- [ ] T081 Add summary cards showing count for each data type (photos, files, locations, barcodes)
- [ ] T082 Implement "Delete All" feature with confirmation for each data type
- [ ] T083 Add total record count display with warning when approaching 100 records
- [ ] T084 Implement auto-cleanup suggestion when total records exceed 100

**Checkpoint**: 통합 데이터 관리 화면 완성

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 성능 최적화, 문서화, 접근성, 플랫폼별 테스트

- [ ] T085 [P] Add JSDoc comments to all public hook functions in src/hooks/
- [ ] T086 [P] Add JSDoc comments to all repository methods in src/services/database/
- [ ] T087 [P] Create README.md with setup instructions, dependencies, running guide
- [ ] T088 [P] Update quickstart.md with actual implementation paths and examples
- [ ] T089 [P] Add platform-specific permission handling using Platform.OS in PermissionService
- [ ] T090 [P] Optimize database queries with proper indexing (already in schema, verify)
- [ ] T091 [P] Add image compression before saving photos using expo-image-manipulator
- [ ] T092 Test all features on iOS simulator (iOS 13+)
- [ ] T093 Test all features on Android emulator (API 26+)
- [ ] T094 [P] Run Jest tests and ensure >80% coverage
- [ ] T095 [P] Verify all accessibility labels are present and meaningful
- [ ] T096 Test offline functionality (airplane mode) for all features
- [ ] T097 Test with 100+ records to verify performance requirements
- [ ] T098 Verify app startup time is <3 seconds
- [ ] T099 Create app icon and splash screen assets
- [ ] T100 Final code review and cleanup

**Checkpoint**: 앱 완성, 모든 테스트 통과, 문서화 완료, 배포 준비

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational (Phase 2) completion
  - User Story 1 (P1): Can start after Phase 2
  - User Story 2 (P2): Can start after Phase 2 (independent of US1)
  - User Story 3 (P3): Can start after Phase 2 (independent of US1/US2)
  - User Story 4 (P4): Can start after Phase 2 (independent of US1/US2/US3)
- **Records Screen (Phase 7)**: Depends on at least one user story being complete (preferably all)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories
- **User Story 2 (P2)**: No dependencies on other stories
- **User Story 3 (P3)**: No dependencies on other stories
- **User Story 4 (P4)**: Reuses camera permission from US1, but can be implemented independently

### Within Each User Story

- **Tests FIRST**: Write all tests for the story before any implementation (TDD)
- **Repository before Hook**: Database layer before business logic
- **Hook before Screen**: Logic before UI
- **Core implementation before polish**: Get it working before optimization
- **Story complete before moving to next**: Fully test and validate each story independently

### Parallel Opportunities

**Setup Phase**:
- T003, T004, T005, T006, T007, T008, T009, T010 can all run in parallel

**Foundational Phase**:
- T012, T013, T014 (types) can run in parallel
- T018, T019, T020, T021, T022 (components) can run in parallel
- T024, T025 (tests) can run in parallel

**User Story Tests** (within each story):
- All test tasks marked [P] can run in parallel

**User Stories** (across stories):
- Once Phase 2 completes, ALL user stories (Phase 3-6) can be worked on in parallel by different developers
- Each story is completely independent

**Polish Phase**:
- T085, T086, T087, T088, T089, T090, T091, T094, T095 can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Write all tests in parallel:
Parallel: T026 (useCamera.test.ts), T027 (PhotoRepository.test.ts), T028 (CameraScreen.test.tsx)

# After tests written, run tests to ensure they FAIL
npm test -- --watch

# Then implement in sequence (but can be different developers):
T029 PhotoRepository → T030 useCamera → T031 CameraScreen → T032-T038 (features)
```

## Parallel Example: All User Stories

```bash
# After Phase 2 complete, different team members:
Developer A: Phase 3 (User Story 1 - Camera)
Developer B: Phase 4 (User Story 2 - File Picker)
Developer C: Phase 5 (User Story 3 - Location)
Developer D: Phase 6 (User Story 4 - Barcode)

# Each completes their story independently, then merge
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T025) **← CRITICAL BLOCKING PHASE**
3. Complete Phase 3: User Story 1 (T026-T038)
4. **STOP and VALIDATE**: Test User Story 1 thoroughly
   - Test on iOS simulator
   - Test on Android emulator
   - Verify all 5 acceptance scenarios from spec.md
   - Test permission flows
   - Test error handling
5. Deploy/demo if ready → **THIS IS YOUR MVP!**

### Incremental Delivery (Recommended)

1. **Foundation** (Phase 1 + 2) → Database, permissions, components ready
2. **MVP** (Phase 3) → Camera feature → Test independently → Demo/Deploy ✅
3. **Iteration 2** (Phase 4) → File picker → Test independently → Demo/Deploy ✅
4. **Iteration 3** (Phase 5) → GPS location → Test independently → Demo/Deploy ✅
5. **Iteration 4** (Phase 6) → Barcode scanner → Test independently → Demo/Deploy ✅
6. **Integration** (Phase 7) → Records screen → All features in one place
7. **Polish** (Phase 8) → Performance, docs, accessibility → Production ready

Each iteration adds value without breaking previous features.

### Parallel Team Strategy

With 4 developers:

1. **Together**: Complete Setup + Foundational (Phase 1-2)
2. **Split by story** (after Phase 2):
   - Dev A: Camera (US1)
   - Dev B: File Picker (US2)
   - Dev C: Location (US3)
   - Dev D: Barcode (US4)
3. **Integrate**: Each story merges independently, no conflicts
4. **Together**: Records screen (Phase 7) + Polish (Phase 8)

---

## Task Summary

**Total Tasks**: 100
- **Setup (Phase 1)**: 10 tasks
- **Foundational (Phase 2)**: 15 tasks (BLOCKING)
- **User Story 1 - Camera (Phase 3)**: 13 tasks (MVP)
- **User Story 2 - Files (Phase 4)**: 13 tasks
- **User Story 3 - Location (Phase 5)**: 13 tasks
- **User Story 4 - Barcode (Phase 6)**: 15 tasks
- **Records Screen (Phase 7)**: 5 tasks
- **Polish (Phase 8)**: 16 tasks

**Parallel Opportunities**: 35+ tasks can run in parallel across different phases

**Independent Test Criteria**:
- **US1**: Camera → Capture → Save → View in list
- **US2**: File picker → Select → Validate → Save → View in list
- **US3**: Location → Request → Display → Save → View in history
- **US4**: Barcode → Scan → Recognize → Save → View in history

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (Camera feature only) = 38 tasks

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **TDD Mandatory**: All tests must be written FIRST and FAIL before implementation
- **Independent Stories**: Each user story delivers standalone value
- **Checkpoint validation**: Test each story independently before proceeding
- **Commit frequency**: Commit after each task or logical group
- **Avoid**: Cross-story dependencies, vague tasks, same file conflicts

---

## Next Steps

1. **Start with Setup**: Run tasks T001-T010 to initialize Expo project
2. **Build Foundation**: Complete T011-T025 (database, permissions, components)
3. **Validate Foundation**: Ensure database initializes, permissions work
4. **Choose Strategy**:
   - **MVP approach**: Complete just Phase 3 (Camera) for quick demo
   - **Incremental**: Complete one user story at a time (P1 → P2 → P3 → P4)
   - **Parallel**: Split team across all 4 user stories after Phase 2

**Recommended**: Start with MVP (Camera only) to validate architecture, then add other features incrementally.
