/**
 * Barcode List Screen Route
 *
 * @module app/barcode/list
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { BarcodeList } from '@/src/screens/BarcodeList/BarcodeList';

/**
 * Barcode List Screen
 */
export default function BarcodeListScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '스캔 기록',
          headerBackTitle: '뒤로',
        }}
      />
      <BarcodeList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
