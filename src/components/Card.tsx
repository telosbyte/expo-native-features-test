/**
 * Card - Reusable card container component
 *
 * @module components/Card
 */

import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';
import { getSpacing, getShadowStyle } from '@/src/utils/responsive';

/**
 * Card component props
 */
export interface CardProps extends ViewProps {
  /** Card content */
  children: React.ReactNode;
  /** Enable card shadow */
  elevated?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Test ID for testing */
  testID?: string;
}

/**
 * Card container component with elevation and padding options
 *
 * Features:
 * - Optional elevation/shadow
 * - Configurable padding
 * - Rounded corners
 * - Accessible container
 *
 * @example
 * ```tsx
 * <Card elevated padding="medium">
 *   <Text>Card content</Text>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  children,
  elevated = true,
  padding = 'medium',
  style,
  testID,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.card_elevated,
        styles[`card_padding_${padding}`],
        style,
      ]}
      testID={testID}
      {...props}
    >
      {children}
    </View>
  );
};

const spacing = getSpacing();

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  card_elevated: {
    ...getShadowStyle(3),
  },

  card_padding_none: {
    padding: 0,
  },
  card_padding_small: {
    padding: spacing.xs,
  },
  card_padding_medium: {
    padding: spacing.sm,
  },
  card_padding_large: {
    padding: spacing.md,
  },
});
