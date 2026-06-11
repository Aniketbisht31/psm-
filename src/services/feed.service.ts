// src/services/feed.service.ts
import { supabase } from '../lib/supabase';
import { HabitWithStats } from '../types/models';

export const FeedService = {
  /**
   * Fetches public habits ordered by follower count descending.
   * Uses raw supabase subqueries to calculate follow counts and user-follows.
   */
  async getPublicHabits(currentUserId: string | null): Promise<HabitWithStats[]> {
    // We select details, profile, count of follows, and if current user follows
    const { data, error } = await supabase
      .from('habits')
      .select(`
        *,
        users:user_id (
          username,
          avatar_url,
          full_name
        ),
        streaks (
          current_streak,
          longest_streak,
          last_checkin
        ),
        habit_follows (
          follower_id
        )
      `)
      .eq('visibility', 'public')
      .eq('is_active', true);

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return [];

    // Map counts and self-followed status locally
    const habitsWithStats: HabitWithStats[] = data.map((item: any) => {
      const follows = item.habit_follows || [];
      const is_followed_by_me = currentUserId
        ? follows.some((f: any) => f.follower_id === currentUserId)
        : false;

      return {
        ...item,
        follower_count: follows.length,
        is_followed_by_me,
      };
    });

    // Sort by follower count descending, limit 20
    return habitsWithStats
      .sort((a, b) => b.follower_count - a.follower_count)
      .slice(0, 20);
  },

  /**
   * Follow a habit.
   */
  async followHabit(followerId: string, habitId: string): Promise<void> {
    const { error } = await supabase
      .from('habit_follows')
      .insert({
        follower_id: followerId,
        habit_id: habitId,
      });

    if (error) {
      throw new Error(error.message);
    }
  },

  /**
   * Unfollow a habit.
   */
  async unfollowHabit(followerId: string, habitId: string): Promise<void> {
    const { error } = await supabase
      .from('habit_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('habit_id', habitId);

    if (error) {
      throw new Error(error.message);
    }
  }
};
