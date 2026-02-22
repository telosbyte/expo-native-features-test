/**
 * Responsive utility functions for handling different screen sizes
 *
 * @module utils/responsive
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

/**
 * Get current screen dimensions
 */
export const getScreenDimensions = () => {
  return Dimensions.get('window');
};

/**
 * Check if device is a tablet
 */
export const isTablet = () => {
  const { width, height } = getScreenDimensions();
  const aspectRatio = height / width;

  // iPads and large Android tablets
  return Math.min(width, height) >= 600;
};

/**
 * Check if device is a small phone (like iPhone SE)
 */
export const isSmallDevice = () => {
  const { width } = getScreenDimensions();
  return width < 375;
};

/**
 * Normalize font size based on screen pixel density
 * Ensures consistent font sizes across different devices
 *
 * @param size - Base font size
 * @returns Normalized font size
 */
export const normalizeFont = (size: number): number => {
  const scale = getScreenDimensions().width / 375; // iPhone 11 Pro as baseline
  const newSize = size * scale;

  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

/**
 * Scale size proportionally to screen width
 *
 * @param size - Base size
 * @returns Scaled size
 */
export const scaleSize = (size: number): number => {
  const { width } = getScreenDimensions();
  const guidelineBaseWidth = 375; // iPhone 11 Pro width
  return (width / guidelineBaseWidth) * size;
};

/**
 * Get responsive spacing based on screen size
 */
export const getSpacing = () => {
  if (isTablet()) {
    return {
      xs: 8,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    };
  } else if (isSmallDevice()) {
    return {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    };
  } else {
    return {
      xs: 6,
      sm: 12,
      md: 16,
      lg: 24,
      xl: 32,
    };
  }
};

/**
 * Get minimum touch target size (accessibility)
 */
export const MIN_TOUCH_SIZE = Platform.select({
  ios: 44,
  android: 48,
  default: 44,
});

/**
 * Get responsive breakpoints
 */
export const breakpoints = {
  small: 375,   // iPhone SE, small Androids
  medium: 414,  // iPhone 11 Pro Max
  large: 768,   // iPad
  xlarge: 1024, // iPad Pro
};

/**
 * Get current breakpoint
 */
export const getCurrentBreakpoint = (): keyof typeof breakpoints => {
  const { width } = getScreenDimensions();

  if (width >= breakpoints.xlarge) return 'xlarge';
  if (width >= breakpoints.large) return 'large';
  if (width >= breakpoints.medium) return 'medium';
  return 'small';
};

/**
 * Calculate responsive width/height
 *
 * @param percentage - Percentage of screen width (0-100)
 * @returns Calculated width in pixels
 */
export const wp = (percentage: number): number => {
  const { width } = getScreenDimensions();
  return (percentage * width) / 100;
};

/**
 * Calculate responsive height
 *
 * @param percentage - Percentage of screen height (0-100)
 * @returns Calculated height in pixels
 */
export const hp = (percentage: number): number => {
  const { height } = getScreenDimensions();
  return (percentage * height) / 100;
};

/**
 * Get platform-specific shadow style
 *
 * @param elevation - Shadow elevation (1-5)
 * @returns Shadow style object
 */
export const getShadowStyle = (elevation: number = 2) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.1,
      shadowRadius: elevation * 2,
    };
  } else {
    return {
      elevation: elevation,
    };
  }
};
