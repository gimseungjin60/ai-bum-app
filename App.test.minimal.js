// 최소 테스트: 이 파일을 App.js에 복사해서 에러가 사라지는지 확인
// 에러가 사라지면 → 우리 코드 문제
// 에러가 남아있으면 → 라이브러리 문제
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.text}>AI-bum 테스트</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFAF5' },
  text: { fontSize: 24, fontWeight: '700', color: '#1E1B17' },
});
