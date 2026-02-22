/**
 * Button - Reusable button component with accessibility support
 *
 * @module components/Button
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MIN_TOUCH_SIZE, getSpacing, normalizeFont } from '@/src/utils/responsive';

/**
 * Button variant types
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Button size types
 */
export type ButtonSize = 'small' | 'medium' | 'large';

/**
 * Button component props
 */
export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  /** Button text (can use children instead) */
  title?: string;
  /** Button content (alternative to title) */
  children?: React.ReactNode;
  /** Click handler */
  onPress: () => void;
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Accessibility label (defaults to title) */
  accessibilityLabel?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Reusable Button component with variants, sizes, and loading states
 *
 * Features:
 * - Multiple variants (primary, secondary, danger, ghost)
 * - Multiple sizes (small, medium, large)
 * - Loading state with spinner
 * - Disabled state
 * - Full accessibility support
 *
 * @example
 * ```tsx
 * <Button
 *   title="Save"
 *   onPress={handleSave}
 *   variant="primary"
 *   loading={isLoading}
 *   disabled={!isValid}
 * />
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  testID,
  ...props
}) => {
  const isDisabled = disabled || loading;
  const buttonText = children || title;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        fullWidth && styles.button_fullWidth,
        isDisabled && styles.button_disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel || (typeof buttonText === 'string' ? buttonText : undefined)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : '#007AFF'}
          size="small"
        />
      ) : typeof buttonText === 'string' ? (
        <Text
          style={[
            styles.text,
            styles[`text_${variant}`],
            styles[`text_${size}`],
            isDisabled && styles.text_disabled,
            textStyle,
          ]}
        >
          {buttonText}
        </Text>
      ) : (
        buttonText
      )}
    </TouchableOpacity>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  // Base button styles
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Variant styles
  button_primary: {
    backgroundColor: '#007AFF',
  },
  button_secondary: {
    backgroundColor: '#E5E5EA',
  },
  button_danger: {
    backgroundColor: '#FF3B30',
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },

  // Size styles - 반응형 적용
  button_small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_SIZE,
  },
  button_medium: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_SIZE,
  },
  button_large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: MIN_TOUCH_SIZE + 12,
  },

  // State styles
  button_disabled: {
    opacity: 0.5,
  },
  button_fullWidth: {
    width: '100%',
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#000000',
  },
  text_danger: {
    color: '#FFFFFF',
  },
  text_ghost: {
    color: '#007AFF',
  },

  // Text size styles - 반응형 폰트
  text_small: {
    fontSize: normalizeFont(14),
  },
  text_medium: {
    fontSize: normalizeFont(16),
  },
  text_large: {
    fontSize: normalizeFont(18),
  },

  // Text disabled state
  text_disabled: {
    opacity: 1, // Parent already has opacity
  },
});
