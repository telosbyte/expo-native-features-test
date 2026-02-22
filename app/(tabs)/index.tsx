import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/src/components/Card';
import { getSpacing, normalizeFont } from '@/src/utils/responsive';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Native Features Test App</Text>
        <Text style={styles.subtitle}>네이티브 기능 테스트 앱</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/camera')}
          accessibilityLabel="카메라 화면으로 이동"
          accessibilityRole="button"
        >
          <Card>
            <Text style={styles.cardTitle}>📷 카메라</Text>
            <Text style={styles.cardDescription}>
              디바이스 카메라로 사진을 촬영하고 로컬 데이터베이스에 저장합니다.
            </Text>
            <Text style={styles.cardLink}>탭하여 시작 →</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/files')}
          accessibilityLabel="파일 화면으로 이동"
          accessibilityRole="button"
        >
          <Card>
            <Text style={styles.cardTitle}>📁 파일</Text>
            <Text style={styles.cardDescription}>
              문서 또는 이미지 파일을 선택하고 메타데이터를 저장합니다.
            </Text>
            <Text style={styles.cardLink}>탭하여 시작 →</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/location')}
          accessibilityLabel="위치 화면으로 이동"
          accessibilityRole="button"
        >
          <Card>
            <Text style={styles.cardTitle}>📍 위치</Text>
            <Text style={styles.cardDescription}>
              GPS를 사용하여 현재 위치 좌표를 가져오고 저장합니다.
            </Text>
            <Text style={styles.cardLink}>탭하여 시작 →</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/barcode')}
          accessibilityLabel="바코드 화면으로 이동"
          accessibilityRole="button"
        >
          <Card>
            <Text style={styles.cardTitle}>🔍 바코드</Text>
            <Text style={styles.cardDescription}>
              QR 코드와 바코드를 스캔하고 데이터를 저장합니다.
            </Text>
            <Text style={styles.cardLink}>탭하여 시작 →</Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/records')}
          accessibilityLabel="기록 화면으로 이동"
          accessibilityRole="button"
        >
          <Card>
            <Text style={styles.cardTitle}>💾 기록</Text>
            <Text style={styles.cardDescription}>
              저장된 모든 데이터를 확인하고 관리합니다.
            </Text>
            <Text style={styles.cardLink}>탭하여 시작 →</Text>
          </Card>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            위 카드를 탭하거나 하단 탭 바를 사용하여 기능을 테스트하세요.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const spacing = getSpacing();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: spacing.md,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: normalizeFont(24),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: normalizeFont(16),
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    padding: spacing.sm,
  },
  cardTitle: {
    fontSize: normalizeFont(18),
    fontWeight: '600',
    marginBottom: spacing.xs,
    color: '#333',
  },
  cardDescription: {
    fontSize: normalizeFont(14),
    color: '#666',
    lineHeight: normalizeFont(20),
    marginBottom: spacing.xs,
  },
  cardLink: {
    fontSize: normalizeFont(14),
    color: '#007AFF',
    fontWeight: '600',
    marginTop: spacing.xs / 2,
  },
  footer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  footerText: {
    fontSize: normalizeFont(14),
    color: '#999',
    textAlign: 'center',
  },
});
