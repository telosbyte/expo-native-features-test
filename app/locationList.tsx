/**
 * LocationList Screen - Route for displaying saved location records
 *
 * @module app/locationList
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LocationList } from '@/src/screens/LocationList/LocationList';

/**
 * LocationList screen route
 *
 * Displays all saved location records with delete functionality
 */
export default function LocationListScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: '저장된 위치',
          headerShown: true,
        }}
      />
      <LocationList />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
