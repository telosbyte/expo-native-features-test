/**
 * PhotoList Screen - Route for displaying saved photos
 *
 * @module app/photoList
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { PhotoList } from '@/src/screens/PhotoList/PhotoList';

/**
 * PhotoList screen route
 *
 * Displays all saved photos with delete functionality
 */
export default function PhotoListScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: '저장된 사진',
          headerShown: true,
        }}
      />
      <PhotoList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
