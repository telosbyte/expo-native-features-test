/**
 * ErrorMessage - Reusable error message display component
 *
 * @module components/ErrorMessage
 */

import React from 'react';
import { View, Text, StyleSheet, ViewProps, TextStyle, ViewStyle } from 'react-native';
import { getSpacing, normalizeFont } from '@/src/utils/responsive';

/**
 * Error message variant types
 */
export type ErrorVariant = 'error' | 'warning' | 'info';

/**
 * ErrorMessage component props
 */
export interface ErrorMessageProps extends ViewProps {
  /** Error message text */
  message: string;
  /** Error variant (affects color) */
  variant?: ErrorVariant;
  /** Show icon */
  showIcon?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ErrorMessage component for displaying error, warning, or info messages
 *
 * Features:
 * - Multiple variants (error, warning, info)
 * - Optional icon display
 * - Accessible error message
 * - Color-coded by severity
 *
 * @example
 * ```tsx
 * <ErrorMessage
 *   message="Failed to save photo"
 *   variant="error"
 * />
 * ```
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'error',
  showIcon = true,
  style,
  textStyle,
  testID,
  ...props
}) => {
  const icons = {
    error: '⚠️',
    warning: '⚠️',
    info: 'ℹ️',
  };

  return (
    <View
      style={[styles.container, styles[`container_${variant}`], style]}
      accessibilityRole="alert"
      accessibilityLive="polite"
      testID={testID}
      {...props}
    >
      {showIcon && (
        <Text style={styles.icon} accessibilityLabel={`${variant} icon`}>
          {icons[variant]}
        </Text>
      )}
      <Text
        style={[styles.text, styles[`text_${variant}`], textStyle]}
        accessibilityLabel={message}
      >
        {message}
      </Text>
    </View>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },

  container_error: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF3B30',
  },
  container_warning: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FF9500',
  },
  container_info: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },

  icon: {
    fontSize: normalizeFont(20),
    marginRight: spacing.xs,
  },

  text: {
    flex: 1,
    fontSize: normalizeFont(14),
    lineHeight: normalizeFont(20),
  },

  text_error: {
    color: '#C62828',
  },
  text_warning: {
    color: '#E65100',
  },
  text_info: {
    color: '#01579B',
  },
});
