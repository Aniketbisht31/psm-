// app/(tabs)/index.tsx
import React from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { usePublicHabits } from '../../hooks/useFeed';
import { HabitCard } from '../../components/feed/HabitCard';
import { SkeletonCard } from '../../components/feed/SkeletonCard';
import { StatusBar } from 'expo-status-bar';

export default function FeedScreen() {
  const { data: habits, isLoading, isRefetching, refetch, error } = usePublicHabits();

  const handleRefresh = async () => {
    await refetch();
  };

  const renderItem = ({ item }: { item: any }) => <HabitCard habit={item} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>HabitCircle</Text>
          <Text style={styles.headerSubtitle}>Discover habits & build streaks together</Text>
        </View>

        {isLoading ? (
          <FlatList
            data={[1, 2, 3]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item) => item.toString()}
            contentContainerStyle={styles.listContent}
          />
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Failed to load feed</Text>
            <Text style={styles.errorSubtext}>{(error as Error).message}</Text>
          </View>
        ) : habits && habits.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No habits found</Text>
            <Text style={styles.emptySubtext}>Be the first to share your habit publically!</Text>
          </View>
        ) : (
          <FlatList
            data={habits}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
