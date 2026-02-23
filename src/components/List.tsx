/**
 * List - Reusable list container with item separation
 *
 * @module components/List
 */

import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';

/**
 * List component props
 */
export interface ListProps extends ViewProps {
  /** List items */
  children: React.ReactNode;
  /** Show separator between items */
  separator?: boolean;
  /** Custom separator color */
  separatorColor?: string;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * List container component with optional item separators
 *
 * Features:
 * - Optional separators between items
 * - Customizable separator color
 * - Accessible list container
 *
 * @example
 * ```tsx
 * <List separator>
 *   <ListItem>Item 1</ListItem>
 *   <ListItem>Item 2</ListItem>
 *   <ListItem>Item 3</ListItem>
 * </List>
 * ```
 */
export const List: React.FC<ListProps> = ({
  children,
  separator = true,
  separatorColor = '#E5E5EA',
  style,
  testID,
  ...props
}) => {
  const childArray = React.Children.toArray(children);

  return (
    <View style={[styles.list, style]} testID={testID} {...props}>
      {childArray.map((child, index) => (
        <React.Fragment key={index}>
          {child}
          {separator && index < childArray.length - 1 && (
            <View
              style={[
                styles.separator,
                { backgroundColor: separatorColor },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

/**
 * List item component props
 */
export interface ListItemProps extends ViewProps {
  /** Item content */
  children: React.ReactNode;
  /** Custom container style */
  style?: ViewStyle;
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Test ID for testing */
  testID?: string;
}

/**
 * List item component
 *
 * @example
 * ```tsx
 * <ListItem padding="medium">
 *   <Text>Item content</Text>
 * </ListItem>
 * ```
 */
export const ListItem: React.FC<ListItemProps> = ({
  children,
  padding = 'medium',
  style,
  testID,
  ...props
}) => {
  return (
    <View
      style={[styles.listItem, styles[`listItem_padding_${padding}`], style]}
      testID={testID}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#FFFFFF',
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  listItem_padding_none: {
    padding: 0,
  },
  listItem_padding_small: {
    padding: 8,
  },
  listItem_padding_medium: {
    padding: 16,
  },
  listItem_padding_large: {
    padding: 24,
  },
});
