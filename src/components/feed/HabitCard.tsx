// src/components/feed/HabitCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { HabitWithStats } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { useFollowHabit, useUnfollowHabit, useCurrentUser } from '../../hooks/useFeed';

interface HabitCardProps {
  habit: HabitWithStats;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit }) => {
  const currentUserId = useCurrentUser();
  const followMutation = useFollowHabit();
  const unfollowMutation = useUnfollowHabit();

  const currentStreak = habit.streaks?.[0]?.current_streak ?? 0;
  const isOwner = currentUserId === habit.user_id;

  const handleFollowToggle = () => {
    if (habit.is_followed_by_me) {
      unfollowMutation.mutate(habit.id);
    } else {
      followMutation.mutate(habit.id);
    }
  };

  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar url={habit.users.avatar_url} name={habit.users.full_name || habit.users.username} size={42} />
        <View style={styles.headerText}>
          <Text style={styles.username}>@{habit.users.username}</Text>
          <Text style={styles.fullName}>{habit.users.full_name || 'HabitCircle Member'}</Text>
        </View>
        {!isOwner && currentUserId && (
          <TouchableOpacity
            style={[
              styles.followButton,
              habit.is_followed_by_me && styles.followingButton,
              isPending && styles.disabledButton,
            ]}
            onPress={handleFollowToggle}
            disabled={isPending}
          >
            <Text
              style={[
                styles.followButtonText,
                habit.is_followed_by_me && styles.followingButtonText,
              ]}
            >
              {habit.is_followed_by_me ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.habitName}>{habit.name}</Text>
        {habit.description && <Text style={styles.description}>{habit.description}</Text>}

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{habit.category.toUpperCase()}</Text>
          </View>
          <View style={styles.targetContainer}>
            <Text style={styles.targetText}>
              Goal: {habit.target_value} {habit.unit} / {habit.frequency}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>🔥 Current Streak</Text>
          <Text style={styles.statValue}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>👥 Followers</Text>
          <Text style={styles.statValue}>{habit.follower_count}</Text>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  fullName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  followButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  disabledButton: {
    opacity: 0.6,
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#475569',
  },
  body: {
    marginBottom: 14,
  },
  habitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  targetContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'flex-start',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
});
