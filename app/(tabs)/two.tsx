import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Card } from '@/src/components/Card';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>앱 정보</Text>
      </View>

      <View style={styles.content}>
        <Card>
          <Text style={styles.label}>버전</Text>
          <Text style={styles.value}>1.0.0</Text>
        </Card>

        <Card>
          <Text style={styles.label}>기술 스택</Text>
          <Text style={styles.value}>React Native + Expo SDK 54</Text>
          <Text style={styles.value}>TypeScript 5.x</Text>
          <Text style={styles.value}>SQLite Database</Text>
        </Card>

        <Card>
          <Text style={styles.label}>지원 플랫폼</Text>
          <Text style={styles.value}>iOS / Android</Text>
        </Card>

        <Card>
          <Text style={styles.label}>네이티브 기능</Text>
          <Text style={styles.feature}>• 카메라 촬영 (expo-camera)</Text>
          <Text style={styles.feature}>• 파일 선택 (expo-document-picker)</Text>
          <Text style={styles.feature}>• GPS 위치 (expo-location)</Text>
          <Text style={styles.feature}>• 바코드 스캔 (expo-barcode-scanner)</Text>
          <Text style={styles.feature}>• SQLite 데이터베이스 (expo-sqlite)</Text>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Native Features Test App
          </Text>
          <Text style={styles.footerSubtext}>
            Built with ❤️ using Expo
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  value: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  feature: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
  },
});
