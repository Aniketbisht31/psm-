// src/components/feed/SkeletonCard.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export const SkeletonCard: React.FC = () => {
  const shimmerValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerValue]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Animated.View style={[styles.avatar, { opacity: shimmerValue }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.titleLine, { opacity: shimmerValue }]} />
          <Animated.View style={[styles.subtitleLine, { opacity: shimmerValue }]} />
        </View>
        <Animated.View style={[styles.button, { opacity: shimmerValue }]} />
      </View>
      <View style={styles.body}>
        <Animated.View style={[styles.bodyLine, { opacity: shimmerValue }]} />
        <Animated.View style={[styles.bodyLineShort, { opacity: shimmerValue }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e2e8f0',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  titleLine: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  subtitleLine: {
    width: 140,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  button: {
    width: 70,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
  },
  body: {
    gap: 8,
    marginTop: 4,
  },
  bodyLine: {
    width: '100%',
    height: 18,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  bodyLineShort: {
    width: '60%',
    height: 18,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
});
