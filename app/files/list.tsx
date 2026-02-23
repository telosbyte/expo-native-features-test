/**
 * File List Screen Route
 *
 * @module app/files/list
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { FileList } from '@/src/screens/FileList/FileList';

/**
 * File List Screen
 *
 * Displays saved files with filtering and management capabilities
 */
export default function FileListScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '저장된 파일',
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#007AFF',
        }}
      />
      <FileList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
