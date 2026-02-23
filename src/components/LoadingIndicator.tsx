/**
 * LoadingIndicator - Reusable loading spinner component
 *
 * @module components/LoadingIndicator
 */

import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

/**
 * Loading indicator size types
 */
export type LoadingSize = 'small' | 'large';

/**
 * LoadingIndicator component props
 */
export interface LoadingIndicatorProps extends ViewProps {
  /** Loading message text */
  message?: string;
  /** Spinner size */
  size?: LoadingSize;
  /** Spinner color */
  color?: string;
  /** Full screen overlay */
  fullScreen?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * LoadingIndicator component for displaying loading states
 *
 * Features:
 * - Configurable size and color
 * - Optional loading message
 * - Full screen overlay mode
 * - Accessible loading indicator
 *
 * @example
 * ```tsx
 * <LoadingIndicator
 *   message="Loading photos..."
 *   size="large"
 * />
 * ```
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message,
  size = 'large',
  color = '#007AFF',
  fullScreen = false,
  style,
  textStyle,
  testID,
  ...props
}) => {
  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View
      style={[containerStyle, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={message || 'Loading'}
      accessibilityLive="polite"
      testID={testID}
      {...props}
    >
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text
          style={[styles.message, textStyle]}
          accessibilityLabel={message}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },

  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});
