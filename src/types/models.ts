// src/types/models.ts
import { Database } from './database.types';

export type UserRow = Database['public']['Tables']['users']['Row'];
export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type CheckInRow = Database['public']['Tables']['check_ins']['Row'];
export type HabitFollowRow = Database['public']['Tables']['habit_follows']['Row'];
export type StreakRow = Database['public']['Tables']['streaks']['Row'];

export interface HabitWithStats extends HabitRow {
  users: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  streaks?: StreakRow[];
  follower_count: number;
  is_followed_by_me: boolean;
}
