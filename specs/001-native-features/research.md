# Native Features Test App - Technology Research

## Overview

This document provides comprehensive research on Expo native APIs and testing strategies for building a robust native features test application. The research covers camera functionality, file picking, location services, barcode scanning, local database storage, and testing approaches.

---

## 1. Expo Camera API (expo-camera)

### Decision
Use **expo-camera** for all camera-related functionality including photo capture and barcode scanning (SDK 52+).

### Rationale
- Native integration with iOS and Android camera APIs
- Built-in permission handling hooks
- Supports both photo/video capture and barcode scanning in a single package
- Active maintenance and part of the core Expo SDK
- Better performance compared to deprecated `expo-barcode-scanner`

### Alternatives Considered
- **react-native-vision-camera**: More feature-rich but requires native module configuration, not compatible with Expo Go
- **expo-barcode-scanner**: Deprecated in favor of expo-camera's built-in barcode scanning
- **Custom native modules**: Too much overhead for standard camera functionality

### Best Practices

#### Permission Handling

**Configuration (app.json/app.config.js)**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for taking photos.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for recording videos.",
          "recordAudioAndroid": true
        }
      ]
    ]
  }
}
```

**Runtime Permission Flow**:
```javascript
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';

function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  // Permission states: null (loading), granted, denied
  if (!permission) {
    return <ActivityIndicator />;
  }

  if (!permission.granted) {
    return (
      <View>
        <Text>Camera access is required</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  return <CameraView style={styles.camera} />;
}
```

**Key Considerations**:
- Always check permission status before using camera
- On iOS/Android, if user denies permission, you cannot ask again - must redirect to Settings
- Use `Linking.openSettings()` to redirect users to app settings when permissions are denied
- Test permission flows thoroughly by uninstalling/reinstalling the app

#### Photo Capture and Storage

**Taking Photos**:
```javascript
const cameraRef = useRef(null);

const takePicture = async () => {
  if (!cameraRef.current) return;

  try {
    // Wait for camera to be ready before taking picture
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.8, // 0-1, lower = more compression
      skipProcessing: false, // Set to true for faster capture (no rotation/scaling)
      base64: false, // Set to true if you need base64 encoding
      exif: true, // Include EXIF metadata
    });

    // photo.uri contains the local file path
    console.log('Photo saved to:', photo.uri);
    return photo;
  } catch (error) {
    console.error('Failed to take picture:', error);
  }
};

<CameraView ref={cameraRef} style={styles.camera} />
```

**Saving to Device Gallery**:
```javascript
import * as MediaLibrary from 'expo-media-library';

async function saveToGallery(photoUri) {
  try {
    // Request media library permissions
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission required');
    }

    // Save to device gallery
    const asset = await MediaLibrary.createAssetAsync(photoUri);
    await MediaLibrary.createAlbumAsync('MyApp', asset, false);

    console.log('Photo saved to gallery');
  } catch (error) {
    console.error('Failed to save photo:', error);
  }
}
```

#### Memory Management

**Best Practices**:
1. **Clean up camera references**: Remove camera component when not in use
2. **Limit quality for batch captures**: Use `quality: 0.5-0.7` when taking multiple photos
3. **Use skipProcessing for speed**: When orientation doesn't matter, enable `skipProcessing: true`
4. **Delete temporary files**: Photos are saved to cache directory by default - clean up old files
5. **Avoid base64 encoding**: Only use `base64: true` when absolutely necessary (e.g., uploading to certain APIs)

```javascript
import * as FileSystem from 'expo-file-system';

// Clean up old cached photos
async function cleanupCache() {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const files = await FileSystem.readDirectoryAsync(cacheDir);

    // Delete files older than 24 hours
    const now = Date.now();
    for (const file of files) {
      const fileUri = `${cacheDir}${file}`;
      const info = await FileSystem.getInfoAsync(fileUri);

      if (info.exists && now - info.modificationTime > 86400000) {
        await FileSystem.deleteAsync(fileUri);
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}
```

#### Platform-Specific Considerations

**iOS**:
- Requires `NSCameraUsageDescription` in Info.plist (handled by config plugin)
- Requires `NSMicrophoneUsageDescription` for video recording
- Photos are automatically rotated to correct orientation (unless `skipProcessing: true`)
- App Store requires detailed explanation of why camera access is needed

**Android**:
- Requires `CAMERA` permission in AndroidManifest.xml (handled by config plugin)
- Requires `RECORD_AUDIO` permission for video with audio
- `takePictureAsync()` can be slower on some Android devices - monitor performance
- Consider using `skipProcessing: true` on lower-end Android devices

**Common Pitfall**: Always wait for `onCameraReady` callback before calling `takePictureAsync()`:
```javascript
const [isCameraReady, setIsCameraReady] = useState(false);

<CameraView
  ref={cameraRef}
  onCameraReady={() => setIsCameraReady(true)}
  style={styles.camera}
/>

// Only allow taking pictures when ready
<Button
  disabled={!isCameraReady}
  onPress={takePicture}
  title="Take Photo"
/>
```

### Sources
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Permissions Guide](https://docs.expo.dev/guides/permissions/)
- [Expo Camera GitHub Issues](https://github.com/expo/expo/issues/28757)
- [React Native Expo Camera Tutorial](https://reactnative.sataiva.com/reactnative-intro/reactnative-expo-camera/)

---

## 2. Expo File Picker APIs

### Decision
Use **both expo-image-picker and expo-document-picker** based on use case:
- `expo-image-picker`: For photos/videos from gallery or camera
- `expo-document-picker`: For all other file types (PDFs, documents, etc.)

### Rationale
- Each library is optimized for its specific use case
- expo-image-picker provides better UX for media selection with camera integration
- expo-document-picker provides essential metadata (MIME type, filename) needed for document handling
- Both share similar APIs for consistency

### Alternatives Considered
- **react-native-document-picker**: More features but requires native linking
- **Single library approach**: Not recommended as expo-image-picker lacks file metadata and expo-document-picker lacks camera integration
- **Custom native modules**: Unnecessary complexity

### When to Use Each

#### Use expo-image-picker when:
- Selecting photos or videos from device gallery
- Need camera integration (take photo + select from gallery in one flow)
- Building a photo upload feature
- Working with visual media only
- Need image editing options (cropping, aspect ratio)

#### Use expo-document-picker when:
- Selecting any file type (PDF, DOCX, TXT, ZIP, etc.)
- Need file metadata (MIME type, file size, filename)
- Building a document upload feature
- Working with non-media files
- Need to validate file types before upload

### Best Practices

#### expo-image-picker Configuration

**Installation**:
```bash
npx expo install expo-image-picker
```

**Permission Handling**:
```javascript
import * as ImagePicker from 'expo-image-picker';

async function pickImage() {
  // Request permission
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission to access gallery is required!');
    return;
  }

  // Launch picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images, // or .All, .Videos
    allowsEditing: true, // Enable cropping
    aspect: [4, 3], // Crop aspect ratio
    quality: 0.8, // 0-1, image compression
    allowsMultipleSelection: true, // iOS 14+ and Android
  });

  if (!result.canceled) {
    // result.assets is an array of selected media
    const selectedImages = result.assets;
    selectedImages.forEach(image => {
      console.log('URI:', image.uri);
      console.log('Dimensions:', image.width, image.height);
      // Note: fileSize, fileName not reliably available on all platforms
    });
  }
}
```

**Camera Integration**:
```javascript
async function takePhoto() {
  // Request camera permission
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Camera permission is required!');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled) {
    const photo = result.assets[0];
    return photo.uri;
  }
}
```

#### expo-document-picker Configuration

**Installation**:
```bash
npx expo install expo-document-picker
```

**Basic Usage**:
```javascript
import * as DocumentPicker from 'expo-document-picker';

async function pickDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // All file types
      copyToCacheDirectory: true, // Copy to app cache for access
      multiple: false,
    });

    if (result.type === 'success') {
      console.log('File URI:', result.uri);
      console.log('File name:', result.name);
      console.log('MIME type:', result.mimeType);
      console.log('File size:', result.size);

      return result;
    }
  } catch (error) {
    console.error('Document picker error:', error);
  }
}
```

#### File Type Filtering

**Image picker type filtering**:
```javascript
// Images only
mediaTypes: ImagePicker.MediaTypeOptions.Images

// Videos only
mediaTypes: ImagePicker.MediaTypeOptions.Videos

// Both images and videos
mediaTypes: ImagePicker.MediaTypeOptions.All
```

**Document picker MIME type filtering**:
```javascript
// PDFs only
type: 'application/pdf'

// Images only
type: 'image/*'

// Multiple specific types
type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// All files
type: '*/*'
```

#### File Size Limits and Validation

**Note**: Neither library enforces built-in file size limits. You must implement validation:

```javascript
import * as FileSystem from 'expo-file-system';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function validateFile(fileUri) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    if (fileInfo.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    return fileInfo;
  } catch (error) {
    console.error('File validation failed:', error);
    throw error;
  }
}

// Usage
async function pickImageWithValidation() {
  const result = await ImagePicker.launchImageLibraryAsync({
    quality: 0.8,
  });

  if (!result.canceled) {
    const image = result.assets[0];
    const fileInfo = await validateFile(image.uri);
    console.log('Validated file size:', fileInfo.size);
    return image;
  }
}
```

#### File Metadata Extraction

**Document picker provides metadata directly**:
```javascript
const doc = await DocumentPicker.getDocumentAsync({ type: '*/*' });
if (doc.type === 'success') {
  // Available metadata
  const metadata = {
    name: doc.name,          // Filename with extension
    mimeType: doc.mimeType,  // MIME type
    size: doc.size,          // File size in bytes
    uri: doc.uri,            // Local file URI
  };
}
```

**Image picker requires additional work**:
```javascript
async function getImageMetadata(imageUri) {
  const fileInfo = await FileSystem.getInfoAsync(imageUri);

  // Extract filename from URI
  const filename = imageUri.split('/').pop();

  // Note: MIME type detection requires checking file extension
  const extension = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };

  return {
    uri: imageUri,
    name: filename,
    size: fileInfo.size,
    mimeType: mimeTypes[extension] || 'application/octet-stream',
  };
}
```

### Code Example: Unified File Picker Component

```javascript
import React from 'react';
import { View, Button, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

function UnifiedFilePicker() {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant media library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        const info = await FileSystem.getInfoAsync(asset.uri);
        if (info.size > MAX_SIZE) {
          Alert.alert('File too large', `${asset.uri.split('/').pop()} exceeds 10MB`);
          continue;
        }
        console.log('Selected media:', asset.uri);
      }
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword'],
      copyToCacheDirectory: true,
    });

    if (result.type === 'success') {
      if (result.size > MAX_SIZE) {
        Alert.alert('File too large', 'Document exceeds 10MB limit');
        return;
      }
      console.log('Selected document:', result.name, result.mimeType);
    }
  };

  return (
    <View>
      <Button title="Pick Photo/Video" onPress={pickMedia} />
      <Button title="Pick Document" onPress={pickDocument} />
    </View>
  );
}
```

### Sources
- [Expo ImagePicker Documentation](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Expo DocumentPicker Documentation](https://docs.expo.dev/versions/latest/sdk/document-picker/)
- [Expo ImagePicker vs DocumentPicker Discussion](https://github.com/expo/expo/issues/4294)
- [Medium: React Native File & Image Picker with Expo](https://medium.com/@YAGNIK09/react-native-file-image-picker-with-expo-documentpicker-imagepicker-camera-2b3699b3db99)

---

## 3. Expo Location API (expo-location)

### Decision
Use **expo-location** for all location-based features including GPS tracking, geolocation, and geocoding.

### Rationale
- Unified API for both iOS and Android location services
- Built-in permission handling for foreground and background location
- Supports various accuracy levels with battery optimization
- Includes geocoding/reverse geocoding
- Part of core Expo SDK with active maintenance

### Alternatives Considered
- **react-native-geolocation**: Requires native linking, less integrated with Expo
- **Custom native modules**: Too complex for standard location features
- **Expo Task Manager + Location**: Used in combination for background tracking, not an alternative

### GPS Accuracy Options and Battery Impact

#### Accuracy Levels

```javascript
import * as Location from 'expo-location';

// Available accuracy levels (from lowest to highest battery drain)
const accuracyLevels = {
  Lowest: Location.Accuracy.Lowest,       // ~3km accuracy
  Low: Location.Accuracy.Low,             // ~1km accuracy
  Balanced: Location.Accuracy.Balanced,   // ~100m accuracy (RECOMMENDED)
  High: Location.Accuracy.High,           // ~10m accuracy
  Highest: Location.Accuracy.Highest,     // ~1m accuracy (HIGH BATTERY DRAIN)
  BestForNavigation: Location.Accuracy.BestForNavigation, // Best possible (HIGHEST DRAIN)
};
```

#### Battery Optimization Best Practices

**1. Use Appropriate Accuracy**:
```javascript
// For general location features
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Balanced, // ~100m is sufficient for most use cases
});

// Only use Highest for critical features (navigation, fitness tracking)
const preciseLocation = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.Highest, // Use sparingly
});
```

**2. Optimize Update Intervals**:
```javascript
// GOOD: Reasonable intervals
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,      // Update every 10 seconds
    distanceInterval: 50,     // Or when user moves 50 meters
  },
  (location) => {
    console.log('Location updated:', location.coords);
  }
);

// BAD: Too frequent updates
const badSubscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Highest,
    timeInterval: 1000,       // Every second - battery killer!
    distanceInterval: 1,      // Every meter - unnecessary
  },
  callback
);
```

**3. Use Deferred Updates (iOS)**:
```javascript
// Batch location updates to save battery
const deferredSubscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 10,
    deferredUpdatesDistance: 100,  // Wait until 100m traveled
    deferredUpdatesTimeout: 30000, // Or 30 seconds elapsed
  },
  (location) => {
    // Receives batched updates
  }
);
```

**Battery Impact Summary**:
- **Accuracy.Lowest/Low**: Minimal battery impact (uses cell tower/WiFi)
- **Accuracy.Balanced**: Low-moderate impact (recommended default)
- **Accuracy.High/Highest**: High battery impact (continuous GPS)
- **BestForNavigation**: Maximum battery impact (GPS + sensors)

### Permission Handling (Foreground vs Background)

#### Foreground Permissions

**Configuration (app.json)**:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location for [feature description]."
        }
      ]
    ]
  }
}
```

**Runtime Request**:
```javascript
async function requestForegroundPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status === 'granted') {
    // Permission granted - can access location
    const location = await Location.getCurrentPositionAsync();
    return location;
  } else {
    // Permission denied - show explanation
    Alert.alert(
      'Location Permission',
      'Location access is needed to show your position on the map.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }
}
```

#### Background Permissions

**Configuration (app.json)**:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Allow app to use location while in use.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Allow app to use location always for tracking features.",
        "UIBackgroundModes": ["location"]
      }
    },
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

**Runtime Request**:
```javascript
async function requestBackgroundPermission() {
  // Must request foreground permission first
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    Alert.alert('Foreground permission required first');
    return;
  }

  // Then request background permission
  const background = await Location.requestBackgroundPermissionsAsync();

  if (background.status === 'granted') {
    // Can now use background location tracking
    await startBackgroundLocationTracking();
  } else {
    Alert.alert(
      'Background Location',
      'Background location is needed for tracking while app is closed.',
      [{ text: 'OK' }]
    );
  }
}
```

**Important Notes**:
- Background location requires a **development build** (not available in Expo Go)
- iOS requires "Always" permission option
- Android 10+ requires explicit background permission request
- App Store/Play Store require detailed justification for background location

#### Background Location Tracking

```javascript
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

// Define background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Process locations (save to DB, send to server, etc.)
    console.log('Background locations:', locations);
  }
});

// Start background tracking
async function startBackgroundLocationTracking() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') {
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,      // Every 10 seconds
    distanceInterval: 50,     // Or 50 meters
    foregroundService: {
      notificationTitle: 'Location Tracking',
      notificationBody: 'Tracking your location in background',
      notificationColor: '#FF0000',
    },
  });
}

// Stop background tracking
async function stopBackgroundLocationTracking() {
  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
```

### Best Practices for Location Tracking

#### 1. Single Location Fetch
```javascript
// For one-time location access (e.g., "Use my location" button)
async function getLocation() {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeoutMs: 5000, // Don't wait more than 5 seconds
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    throw error;
  }
}
```

#### 2. Continuous Location Tracking
```javascript
// For real-time tracking (e.g., maps, fitness apps)
let locationSubscription = null;

async function startTracking() {
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location) => {
      updateMapPosition(location.coords);
    }
  );
}

async function stopTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }
}

// IMPORTANT: Always clean up on component unmount
useEffect(() => {
  return () => {
    stopTracking();
  };
}, []);
```

#### 3. Error Handling
```javascript
async function getLocationSafely() {
  try {
    // Check if location services are enabled
    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) {
      Alert.alert('Location Services Disabled', 'Please enable location services');
      return null;
    }

    // Check permissions
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        return null;
      }
    }

    // Get location with timeout
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeoutMs: 10000,
    });

    return location;
  } catch (error) {
    if (error.code === 'E_LOCATION_TIMEOUT') {
      Alert.alert('Location Timeout', 'Could not determine your location');
    } else {
      Alert.alert('Location Error', error.message);
    }
    return null;
  }
}
```

#### 4. Geocoding and Reverse Geocoding
```javascript
// Address to coordinates
async function geocodeAddress(address) {
  const locations = await Location.geocodeAsync(address);
  if (locations.length > 0) {
    return locations[0]; // { latitude, longitude }
  }
  return null;
}

// Coordinates to address
async function reverseGeocode(latitude, longitude) {
  const addresses = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  });

  if (addresses.length > 0) {
    const address = addresses[0];
    return {
      street: address.street,
      city: address.city,
      region: address.region,
      country: address.country,
      postalCode: address.postalCode,
      formatted: `${address.street}, ${address.city}, ${address.region}`,
    };
  }
  return null;
}
```

#### Known Issues to Watch For

**timeInterval parameter**: There are documented issues where `timeInterval` may not work as expected, especially when combined with `distanceInterval`. The interval appears to be ignored in some cases. Test thoroughly on both platforms.

**watchPositionAsync cleanup**: Even after calling `.remove()` on the subscription, location updates may continue on some devices. Always verify cleanup in testing.

### Platform-Specific Considerations

**iOS**:
- Requires detailed usage descriptions in Info.plist
- "Always" permission requires strong App Store justification
- Background location shows blue status bar indicator
- Deferred updates help with battery optimization

**Android**:
- Android 10+ requires separate background permission request
- Foreground service notification required for background tracking
- Battery optimization settings can affect location updates
- May need to request "Ignore battery optimization" for critical apps

### Sources
- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Building Location-Based Features Using Expo Location](https://coffey.codes/articles/building-location-based-features-using-expo-location)
- [Location tracking in Expo and React Native](https://chafikgharbi.com/expo-location-tracking/)
- [Expo Location GitHub Issues - timeInterval](https://github.com/expo/expo/issues/10196)

---

## 4. Expo Barcode Scanner (expo-barcode-scanner)

### Decision
Use **expo-camera with built-in barcode scanning** (SDK 52+) instead of the deprecated `expo-barcode-scanner`.

### Rationale
- expo-camera now includes barcode scanning capabilities
- Better performance and active maintenance
- Unified camera API for photos, videos, and barcode scanning
- expo-barcode-scanner is deprecated and no longer recommended
- Reduces bundle size by eliminating redundant packages

### Alternatives Considered
- **expo-barcode-scanner**: Deprecated in SDK 52+
- **react-native-vision-camera**: More powerful but requires native modules (not Expo Go compatible)
- **Third-party SDKs (Scanbot, Dynamsoft)**: Commercial solutions with advanced features but costly

### Supported Barcode Formats

The expo-camera barcode scanner supports the following formats:

| Format | Type | Common Use Cases |
|--------|------|-----------------|
| `qr` | 2D | QR codes, URL sharing, payments |
| `pdf417` | 2D | ID cards, boarding passes |
| `aztec` | 2D | Transportation tickets |
| `datamatrix` | 2D | Product marking, electronics |
| `ean13` | 1D | Retail product barcodes (Europe) |
| `ean8` | 1D | Small retail items |
| `upc_a` | 1D | Retail product barcodes (North America) |
| `upc_e` | 1D | Small retail items |
| `code39` | 1D | Inventory, industrial applications |
| `code93` | 1D | Logistics, retail |
| `code128` | 1D | Shipping, packaging |
| `codabar` | 1D | Libraries, blood banks |
| `itf14` | 1D | Packaging and cartons |

### Performance Optimization Tips

#### 1. Limit Barcode Types
**CRITICAL**: Only scan for barcode types you expect. Scanning for PDF417 and Code39 significantly increases battery consumption on iOS.

```javascript
import { CameraView } from 'expo-camera';

// BAD: Scanning all types drains battery
<CameraView
  barcodeScannerSettings={{
    barcodeTypes: [
      'qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'upc_a',
      'upc_e', 'code39', 'code93', 'code128', 'itf14', 'codabar'
    ]
  }}
/>

// GOOD: Only scan what you need
<CameraView
  barcodeScannerSettings={{
    barcodeTypes: ['qr', 'ean13'] // Only QR codes and product barcodes
  }}
  onBarcodeScanned={handleBarcodeScan}
/>
```

#### 2. Debounce Scan Events
```javascript
import { useState, useRef } from 'react';

function BarcodeScanner() {
  const [scanned, setScanned] = useState(false);
  const lastScanTime = useRef(0);

  const handleBarcodeScan = ({ type, data }) => {
    const now = Date.now();

    // Prevent rapid re-scanning (debounce 2 seconds)
    if (now - lastScanTime.current < 2000) {
      return;
    }

    lastScanTime.current = now;
    setScanned(true);

    console.log(`Scanned ${type}:`, data);

    // Process barcode
    processBarcode(data);
  };

  const resetScanner = () => {
    setScanned(false);
    lastScanTime.current = 0;
  };

  return (
    <CameraView
      style={styles.camera}
      barcodeScannerSettings={{
        barcodeTypes: ['qr', 'ean13'],
      }}
      onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
    />
  );
}
```

#### 3. Optimize Camera Settings
```javascript
<CameraView
  style={styles.camera}
  barcodeScannerSettings={{
    barcodeTypes: ['qr'],
  }}
  // Use rear camera for better scanning
  facing="back"
  // Disable unnecessary features
  mode="picture"
  onBarcodeScanned={handleBarcodeScan}
/>
```

#### 4. Provide Visual Feedback
```javascript
function BarcodeScannerWithFeedback() {
  const [scanned, setScanned] = useState(false);
  const [scanData, setScanData] = useState(null);

  const handleBarcodeScan = ({ type, data, cornerPoints }) => {
    setScanned(true);
    setScanData({ type, data, cornerPoints });

    // Vibrate on successful scan
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-reset after 3 seconds
    setTimeout(() => {
      setScanned(false);
      setScanData(null);
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      >
        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.instructions}>
            {scanned ? 'Barcode Scanned!' : 'Point camera at barcode'}
          </Text>
        </View>

        {/* Show scan result */}
        {scanData && (
          <View style={styles.result}>
            <Text>Type: {scanData.type}</Text>
            <Text>Data: {scanData.data}</Text>
          </View>
        )}
      </CameraView>

      {scanned && (
        <Button title="Scan Again" onPress={() => setScanned(false)} />
      )}
    </View>
  );
}
```

#### 5. Handle Low Light Conditions
```javascript
import { useState } from 'react';

function AdaptiveBarcodeScanner() {
  const [torchEnabled, setTorchEnabled] = useState(false);

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13'],
        }}
        enableTorch={torchEnabled} // Enable flashlight
        onBarcodeScanned={handleBarcodeScan}
      />

      <Button
        title={torchEnabled ? 'Turn Off Flash' : 'Turn On Flash'}
        onPress={() => setTorchEnabled(!torchEnabled)}
      />
    </View>
  );
}
```

### Integration with Camera Permissions

Barcode scanning uses the same camera permissions as photo capture:

```javascript
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';

function BarcodeApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Permission is loading
    return <ActivityIndicator />;
  }

  if (!permission.granted) {
    // Permission not granted
    return (
      <View style={styles.container}>
        <Text>Camera permission is required for scanning barcodes</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  const handleBarcodeScan = ({ type, data }) => {
    setScanned(true);
    Alert.alert(
      'Barcode Scanned',
      `Type: ${type}\nData: ${data}`,
      [{ text: 'OK', onPress: () => setScanned(false) }]
    );
  };

  return (
    <CameraView
      style={styles.camera}
      barcodeScannerSettings={{
        barcodeTypes: ['qr', 'ean13', 'upc_a'],
      }}
      onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
    />
  );
}
```

### Known Issues and Limitations

**Black Backgrounds**: Barcodes with black backgrounds may be difficult to scan due to the underlying ZXing library limitations. Ensure proper lighting and contrast.

**Performance on Android**: Some Android devices may experience slower scanning. Use `barcodeTypes` filtering to improve performance.

**Web Support**: Barcode scanning on web may have limited browser support. Test thoroughly across browsers.

### Complete Example: Production-Ready Barcode Scanner

```javascript
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

function ProductBarcode Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const lastScanTime = useRef(0);

  const handleBarcodeScan = ({ type, data }) => {
    const now = Date.now();

    // Debounce: Prevent scanning same code within 2 seconds
    if (now - lastScanTime.current < 2000) {
      return;
    }

    lastScanTime.current = now;
    setScanned(true);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Process barcode
    Alert.alert(
      'Product Scanned',
      `${type}: ${data}`,
      [
        { text: 'Scan Another', onPress: () => setScanned(false) },
        { text: 'Done', onPress: () => {} }
      ]
    );
  };

  if (!permission) {
    return <View><Text>Loading...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Camera access is required to scan product barcodes
        </Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'], // Product barcodes only
        }}
        enableTorch={torchEnabled}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          <Text style={styles.instructions}>
            {scanned ? 'Barcode Scanned!' : 'Align barcode within frame'}
          </Text>
        </View>
      </CameraView>

      <View style={styles.controls}>
        <Button
          title={torchEnabled ? 'Flash Off' : 'Flash On'}
          onPress={() => setTorchEnabled(!torchEnabled)}
        />
        {scanned && (
          <Button
            title="Scan Again"
            onPress={() => setScanned(false)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'white',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
});

export default ProductBarcodeScanner;
```

### Sources
- [Building a Professional Barcode & QR Scanner with Expo Camera](https://anytechie.medium.com/building-a-professional-barcode-qr-scanner-with-expo-camera-57e014382000)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo BarCodeScanner Documentation (Deprecated)](http://docs.expo.dev-pr-27115.s3-website-us-east-1.amazonaws.com/versions/latest/sdk/bar-code-scanner/)
- [Comparing React Native barcode scanner libraries](https://scanbot.io/blog/react-native-vision-camera-vs-expo-camera/)

---

## 5. Expo SQLite (expo-sqlite)

### Decision
Use **expo-sqlite (next API)** with **Drizzle ORM** for type-safe database operations.

### Rationale
- expo-sqlite provides native SQLite integration for offline-first mobile apps
- The "next" API offers modern async/await syntax with prepared statements
- Drizzle ORM adds type safety, migrations, and better developer experience
- SQLite is perfect for mobile: lightweight, embedded, no server needed
- Excellent performance for 100+ records (tested with 10,000+ records)

### Alternatives Considered
- **Async Storage**: Too simple, no relational data support, performance issues with large datasets
- **Realm**: Powerful but heavyweight, steeper learning curve, licensing concerns
- **WatermelonDB**: Good for sync but more complex setup
- **Remote database only**: Requires internet connection, not offline-first

### Schema Design Best Practices for Mobile

#### 1. Normalize with Purpose
```javascript
// Good: Normalized design
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

// Acceptable: Denormalization for read performance
CREATE TABLE posts_with_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL, -- Denormalized for faster reads
  title TEXT NOT NULL,
  content TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

#### 2. Use Appropriate Data Types
```sql
-- SQLite has dynamic typing but these are common patterns:
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,                    -- Use REAL for decimals
  quantity INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,            -- Use INTEGER for booleans (0/1)
  metadata TEXT,                          -- Use TEXT for JSON (SQLite 3.38+ has JSON1)
  created_at INTEGER DEFAULT (strftime('%s', 'now')), -- UNIX timestamp
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

#### 3. Index Strategically
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- Composite indexes for common query patterns
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Unique indexes for constraint enforcement
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Don't over-index: each index adds write overhead and storage
```

#### 4. Use Drizzle ORM Schema Definition
```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  price: real('price').notNull(),
  quantity: integer('quantity').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  metadata: text('metadata', { mode: 'json' }),
});
```

### Migration Patterns

#### Using expo-sqlite Built-in Migrations

```javascript
import { openDatabaseSync, SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

// Method 1: Using SQLiteProvider with migrations
export default function App() {
  return (
    <SQLiteProvider
      databaseName="myapp.db"
      onInit={migrateDbIfNeeded}
    >
      <AppContent />
    </SQLiteProvider>
  );
}

async function migrateDbIfNeeded(db) {
  const DATABASE_VERSION = 1;
  let { user_version: currentDbVersion } = await db.getFirstAsync(
    'PRAGMA user_version'
  );

  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
      CREATE TABLE posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX idx_posts_user_id ON posts(user_id);
    `);
    currentDbVersion = 1;
  }

  // Future migrations
  // if (currentDbVersion === 1) {
  //   await db.execAsync(`ALTER TABLE users ADD COLUMN phone TEXT;`);
  //   currentDbVersion = 2;
  // }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```

#### Using Drizzle Kit Migrations

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
```

```bash
# Generate migrations
npx drizzle-kit generate

# This creates SQL files in drizzle/migrations/
# 0000_initial.sql
# 0001_add_user_phone.sql
```

```typescript
// app/db.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as schema from '../drizzle/schema';

const expo = openDatabaseSync('myapp.db', { enableChangeListener: true });
export const db = drizzle(expo, { schema });

// Run migrations
export async function runMigrations() {
  try {
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });
    console.log('Migrations applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}
```

```typescript
// App.tsx
import { useEffect } from 'react';
import { runMigrations } from './app/db';

export default function App() {
  useEffect(() => {
    runMigrations();
  }, []);

  return <AppContent />;
}
```

#### Migration Best Practices

1. **Never modify existing migrations**: Always create new migration files
2. **Test migrations thoroughly**: Test upgrade path from all previous versions
3. **Bundle migrations into app**: SQL files must be bundled as strings
4. **Run migrations before rendering**: Use hooks to ensure migrations complete first
5. **Version your schema**: Use PRAGMA user_version to track schema version
6. **Handle migration failures**: Implement rollback or recovery strategies

### Performance Considerations for 100+ Records

#### 1. Use Transactions for Bulk Operations
```javascript
const db = useSQLiteContext();

// BAD: Individual inserts (slow for 100+ records)
async function insertProductsSlow(products) {
  for (const product of products) {
    await db.runAsync(
      'INSERT INTO products (name, price) VALUES (?, ?)',
      [product.name, product.price]
    );
  }
}

// GOOD: Transaction with prepared statement (100x faster)
async function insertProductsFast(products) {
  await db.withTransactionAsync(async () => {
    const stmt = await db.prepareAsync(
      'INSERT INTO products (name, price) VALUES (?, ?)'
    );

    try {
      for (const product of products) {
        await stmt.executeAsync([product.name, product.price]);
      }
    } finally {
      await stmt.finalizeAsync(); // Always finalize
    }
  });
}
```

#### 2. Use WAL Mode (Write-Ahead Logging)
```javascript
// Enable WAL mode for better concurrent read/write performance
await db.execAsync('PRAGMA journal_mode = WAL;');

// WAL mode benefits:
// - Readers don't block writers
// - Writers don't block readers
// - Better performance for concurrent operations
// - Automatic in most Expo SQLite setups
```

#### 3. Optimize Queries with Indexes
```typescript
import { eq, and, desc } from 'drizzle-orm';

// Without index: Full table scan (slow for 1000+ records)
const posts = await db
  .select()
  .from(postsTable)
  .where(eq(postsTable.userId, 123));

// With index on user_id: Fast lookup
// CREATE INDEX idx_posts_user_id ON posts(user_id);

// Composite index for complex queries
// CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
const recentPosts = await db
  .select()
  .from(postsTable)
  .where(eq(postsTable.userId, 123))
  .orderBy(desc(postsTable.createdAt))
  .limit(20);
```

#### 4. Use Prepared Statements
```javascript
// Prepared statements improve performance and security
const db = useSQLiteContext();

// One-time queries: use runAsync/getAllAsync
const result = await db.getAllAsync(
  'SELECT * FROM products WHERE price > ?',
  [100]
);

// Repeated queries: use prepareAsync
const stmt = await db.prepareAsync(
  'SELECT * FROM products WHERE category = ?'
);

try {
  const electronics = await stmt.executeAsync(['Electronics']).then(r => r.getAllAsync());
  const books = await stmt.executeAsync(['Books']).then(r => r.getAllAsync());
} finally {
  await stmt.finalizeAsync(); // Prevent resource leaks
}
```

#### 5. Pagination for Large Datasets
```typescript
// Don't load all records at once
async function getProductsPaginated(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const products = await db
    .select()
    .from(productsTable)
    .limit(pageSize)
    .offset(offset);

  return products;
}

// Infinite scroll pattern
async function getProductsInfinite(lastId, pageSize = 20) {
  const products = await db
    .select()
    .from(productsTable)
    .where(lastId ? gt(productsTable.id, lastId) : undefined)
    .limit(pageSize);

  return products;
}
```

#### 6. Batch Reads with JOIN
```typescript
// BAD: N+1 query problem
async function getPostsWithUsersSlow() {
  const posts = await db.select().from(postsTable);

  for (const post of posts) {
    post.user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, post.userId))
      .then(r => r[0]);
  }

  return posts;
}

// GOOD: Single JOIN query
async function getPostsWithUsersFast() {
  const posts = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      content: postsTable.content,
      user: {
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      },
    })
    .from(postsTable)
    .innerJoin(usersTable, eq(postsTable.userId, usersTable.id));

  return posts;
}
```

### Complete Example: Production Database Setup

```typescript
// drizzle/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  category: text('category').notNull(),
  stock: integer('stock').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

```typescript
// app/database/index.ts
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as schema from '../../drizzle/schema';

const expo = openDatabaseSync('store.db', { enableChangeListener: true });
export const db = drizzle(expo, { schema });

export async function initializeDatabase() {
  try {
    // Enable WAL mode for better performance
    await expo.execAsync('PRAGMA journal_mode = WAL;');

    // Run migrations
    await migrate(db, { migrationsFolder: 'drizzle/migrations' });

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}
```

```typescript
// app/database/operations.ts
import { eq, and, like, desc } from 'drizzle-orm';
import { db } from './index';
import { products, users } from '../../drizzle/schema';

// Create operations
export async function createProduct(data: typeof products.$inferInsert) {
  const result = await db.insert(products).values(data).returning();
  return result[0];
}

export async function bulkCreateProducts(items: typeof products.$inferInsert[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.insert(products).values(item);
    }
  });
}

// Read operations
export async function getProducts(filters?: {
  category?: string;
  minPrice?: number;
  search?: string;
}) {
  let query = db.select().from(products);

  if (filters?.category) {
    query = query.where(eq(products.category, filters.category));
  }

  if (filters?.search) {
    query = query.where(like(products.name, `%${filters.search}%`));
  }

  return await query;
}

export async function getProductsPaginated(page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  return await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(pageSize)
    .offset(offset);
}

// Update operations
export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  const result = await db
    .update(products)
    .set(data)
    .where(eq(products.id, id))
    .returning();
  return result[0];
}

// Delete operations
export async function deleteProduct(id: number) {
  await db.delete(products).where(eq(products.id, id));
}
```

### Sources
- [Expo SQLite Documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Drizzle ORM - Expo SQLite](https://orm.drizzle.team/docs/get-started/expo-new)
- [Using SQLite in Expo: Build Fast, Offline-Ready Apps](https://medium.com/@nnaemekaonyeji27/using-sqlite-in-expo-build-fast-offline-ready-apps-1f1ecc532d71)
- [Best SQLite Solutions for React Native 2026](https://vibe.forem.com/eira-wexford/best-sqlite-solutions-for-react-native-app-development-in-2026-3b5l)
- [Drizzle and React Native (Expo): Local SQLite setup](https://blog.logrocket.com/drizzle-react-native-expo-sqlite/)

---

## 6. Testing Strategy

### Decision
Use a **multi-layered testing approach**:
- **Unit/Integration tests**: Jest + React Native Testing Library
- **E2E tests**: Detox (limited use due to Expo constraints)
- **Component tests**: React Native Testing Library with mocked Expo APIs

### Rationale
- Jest is the standard testing framework for React Native/Expo
- React Native Testing Library promotes best practices (testing behavior, not implementation)
- jest-expo preset provides automatic mocking for Expo modules
- Detox provides native E2E testing but has limited Expo support
- Combination provides good coverage while maintaining fast feedback loops

### Alternatives Considered
- **Appium**: More complex setup, slower than Detox
- **Maestro**: Newer tool, less mature ecosystem
- **Detox only**: Not practical due to Expo limitations
- **Manual testing only**: Not scalable, error-prone

### Jest + React Native Testing Library Setup

#### Installation

```bash
# Install testing dependencies
npx expo install jest-expo jest
npx expo install --save-dev @testing-library/react-native @testing-library/jest-native

# Install additional helpers
npm install --save-dev @testing-library/react-hooks
```

#### Configuration

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": [
      "@testing-library/jest-native/extend-expect",
      "<rootDir>/jest.setup.js"
    ],
    "collectCoverageFrom": [
      "**/*.{js,jsx,ts,tsx}",
      "!**/coverage/**",
      "!**/node_modules/**",
      "!**/babel.config.js",
      "!**/jest.setup.js"
    ]
  }
}
```

```javascript
// jest.setup.js
import '@testing-library/jest-native/extend-expect';

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

// Silence warnings
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

global.console = {
  ...console,
  error: jest.fn(), // Suppress console errors in tests
  warn: jest.fn(),
};
```

### Mocking Expo APIs in Tests

#### Camera Mock

```javascript
// __mocks__/expo-camera.js
export const CameraView = 'CameraView';
export const Camera = {
  Constants: {
    Type: {
      back: 'back',
      front: 'front',
    },
  },
};

export const useCameraPermissions = jest.fn(() => [
  { granted: true, status: 'granted' },
  jest.fn(),
]);

export default {
  CameraView,
  Camera,
  useCameraPermissions,
};
```

```javascript
// __tests__/CameraScreen.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CameraScreen from '../screens/CameraScreen';

jest.mock('expo-camera');

describe('CameraScreen', () => {
  it('requests camera permission', async () => {
    const { getByText } = render(<CameraScreen />);

    expect(getByText(/camera/i)).toBeTruthy();
  });

  it('shows camera when permission granted', () => {
    const { getByTestId } = render(<CameraScreen />);

    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('takes picture when button pressed', async () => {
    const { getByText } = render(<CameraScreen />);

    const takePhotoButton = getByText('Take Photo');
    fireEvent.press(takePhotoButton);

    await waitFor(() => {
      // Assert photo taken
    });
  });
});
```

#### Location Mock

```javascript
// __mocks__/expo-location.js
export const requestForegroundPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted' })
);

export const getCurrentPositionAsync = jest.fn(() =>
  Promise.resolve({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 0,
      accuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  })
);

export const watchPositionAsync = jest.fn((options, callback) => {
  callback({
    coords: {
      latitude: 37.7749,
      longitude: -122.4194,
    },
  });

  return Promise.resolve({
    remove: jest.fn(),
  });
});

export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};
```

```javascript
// __tests__/LocationScreen.test.js
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import LocationScreen from '../screens/LocationScreen';
import * as Location from 'expo-location';

jest.mock('expo-location');

describe('LocationScreen', () => {
  it('displays current location', async () => {
    const { getByText } = render(<LocationScreen />);

    await waitFor(() => {
      expect(getByText(/37.7749/)).toBeTruthy();
      expect(getByText(/-122.4194/)).toBeTruthy();
    });
  });

  it('requests location permission', async () => {
    render(<LocationScreen />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });
});
```

#### SQLite Mock

```javascript
// __mocks__/expo-sqlite.js
export const openDatabaseSync = jest.fn(() => ({
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  getFirstAsync: jest.fn(() => Promise.resolve(null)),
  prepareAsync: jest.fn(() => ({
    executeAsync: jest.fn(),
    finalizeAsync: jest.fn(),
  })),
  withTransactionAsync: jest.fn((callback) => callback()),
}));

export const SQLiteProvider = ({ children }) => children;
export const useSQLiteContext = jest.fn(() => openDatabaseSync());
```

```javascript
// __tests__/database.test.js
import { openDatabaseSync } from 'expo-sqlite';
import { createProduct, getProducts } from '../app/database/operations';

jest.mock('expo-sqlite');

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a product', async () => {
    const mockDb = openDatabaseSync();
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

    await createProduct({ name: 'Test Product', price: 99.99 });

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO products'),
      expect.arrayContaining(['Test Product', 99.99])
    );
  });

  it('retrieves products', async () => {
    const mockDb = openDatabaseSync();
    mockDb.getAllAsync.mockResolvedValue([
      { id: 1, name: 'Product 1', price: 10 },
      { id: 2, name: 'Product 2', price: 20 },
    ]);

    const products = await getProducts();

    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Product 1');
  });
});
```

#### Image Picker Mock

```javascript
// __mocks__/expo-image-picker.js
export const requestMediaLibraryPermissionsAsync = jest.fn(() =>
  Promise.resolve({ status: 'granted' })
);

export const launchImageLibraryAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file:///mock/image.jpg',
        width: 1920,
        height: 1080,
        type: 'image',
      },
    ],
  })
);

export const launchCameraAsync = jest.fn(() =>
  Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file:///mock/camera.jpg',
        width: 1920,
        height: 1080,
        type: 'image',
      },
    ],
  })
);

export const MediaTypeOptions = {
  All: 'All',
  Images: 'Images',
  Videos: 'Videos',
};
```

### Testing Best Practices

#### 1. Test User Behavior, Not Implementation

```javascript
// BAD: Testing implementation details
it('sets isLoading to true', () => {
  const { result } = renderHook(() => useProducts());
  expect(result.current.isLoading).toBe(true);
});

// GOOD: Testing user-visible behavior
it('shows loading spinner while fetching products', () => {
  const { getByTestId } = render(<ProductList />);
  expect(getByTestId('loading-spinner')).toBeTruthy();
});
```

#### 2. Use Data Test IDs Sparingly

```javascript
// Component
<View testID="camera-view">
  <Button testID="take-photo-btn" onPress={takePhoto} title="Take Photo" />
</View>

// Test - prefer accessible queries
const { getByText, getByTestID } = render(<CameraScreen />);

// GOOD: Query by user-visible text
const button = getByText('Take Photo');

// OK: Use testID when necessary
const camera = getByTestID('camera-view');
```

#### 3. Test Async Operations

```javascript
it('loads products from database', async () => {
  const { getByText, queryByText } = render(<ProductList />);

  // Initially loading
  expect(queryByText('Product 1')).toBeNull();

  // Wait for products to load
  await waitFor(() => {
    expect(getByText('Product 1')).toBeTruthy();
    expect(getByText('Product 2')).toBeTruthy();
  });
});
```

#### 4. Mock External Dependencies

```javascript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'Product 1' },
        { id: 2, name: 'Product 2' },
      ])
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E Testing with Detox for Expo Apps

#### Important Limitations

**Expo Support**: Detox has **limited Expo support**. It works only with:
- Custom development builds (EAS Build)
- Non-development clients (JS bundle built-in)
- Not compatible with Expo Go

#### Setup (for EAS Build)

```bash
# Install Detox
npm install --save-dev detox
npm install -g detox-cli

# Initialize Detox
detox init
```

```json
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/YourApp.app',
      build: 'xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Release -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
};
```

#### Basic E2E Test

```javascript
// e2e/firstTest.e2e.js
describe('Product List', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display product list', async () => {
    await expect(element(by.text('Products'))).toBeVisible();
  });

  it('should add product to cart', async () => {
    await element(by.id('product-1')).tap();
    await element(by.id('add-to-cart-btn')).tap();

    await expect(element(by.text('Added to cart'))).toBeVisible();
  });

  it('should search for products', async () => {
    await element(by.id('search-input')).typeText('Camera');
    await element(by.id('search-input')).tapReturnKey();

    await expect(element(by.text('Digital Camera'))).toBeVisible();
  });
});
```

#### Camera E2E Test

```javascript
describe('Camera Feature', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: { camera: 'YES' },
    });
  });

  it('should take a photo', async () => {
    await element(by.id('camera-tab')).tap();
    await element(by.id('take-photo-btn')).tap();

    await waitFor(element(by.id('photo-preview')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should save photo to gallery', async () => {
    await element(by.id('camera-tab')).tap();
    await element(by.id('take-photo-btn')).tap();
    await element(by.id('save-btn')).tap();

    await expect(element(by.text('Photo saved'))).toBeVisible();
  });
});
```

#### Running Detox Tests

```bash
# Build the app
detox build --configuration ios.sim.release

# Run tests
detox test --configuration ios.sim.release

# Run specific test file
detox test e2e/camera.e2e.js --configuration ios.sim.release
```

### Recommended Testing Strategy

For an Expo app with native features:

**1. Unit Tests (70% coverage)**
- Database operations
- Business logic
- Utility functions
- Hooks

**2. Integration Tests (20% coverage)**
- Component interactions
- Navigation flows
- API integration
- State management

**3. E2E Tests (10% coverage)**
- Critical user journeys only
- App launch and navigation
- Key features (camera, location if possible with mocks)
- Payment/checkout flows

**Test Pyramid**:
```
       /\
      /E2E\        Small number, slow, expensive
     /------\
    /  Int   \     Moderate number, medium speed
   /----------\
  /   Unit     \   Large number, fast, cheap
 /--------------\
```

### Sources
- [Expo Unit Testing Documentation](https://docs.expo.dev/develop/unit-testing/)
- [React Native Testing Library Documentation](https://callstack.github.io/react-native-testing-library/)
- [jest-expo npm package](https://www.npmjs.com/package/jest-expo)
- [Testing Expo Apps with Detox](https://blog.expo.dev/testing-expo-apps-with-detox-and-react-native-testing-library-7fbdbb82ac87)
- [Detox for React Native](https://reactnativetesting.io/e2e/intro/)
- [Simple Step-by-Step Setup Detox for React Native Android E2E Testing 2026](https://medium.com/@svbala99/simple-step-by-step-setup-detox-for-react-native-android-e2e-testing-2026-ed497fd9d301)

---

## Summary

This research document provides comprehensive guidance for building a native features test app with Expo. Key takeaways:

1. **expo-camera**: Use for camera, photo capture, and barcode scanning with proper permission handling and memory management
2. **File Pickers**: Use expo-image-picker for media and expo-document-picker for documents, with manual file size validation
3. **expo-location**: Optimize for battery with Accuracy.Balanced, use proper permission flows for foreground/background
4. **Barcode Scanning**: Use expo-camera (not deprecated expo-barcode-scanner), limit barcode types for performance
5. **expo-sqlite**: Use next API with Drizzle ORM, implement migrations, optimize with transactions and indexes
6. **Testing**: Jest + React Native Testing Library for unit/integration, limited Detox for E2E, comprehensive mocking strategy

All technologies are production-ready, well-documented, and actively maintained within the Expo ecosystem. The test app should demonstrate best practices for permissions, error handling, performance optimization, and offline-first architecture.
