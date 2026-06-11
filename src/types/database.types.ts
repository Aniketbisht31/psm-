// src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          category: 'health' | 'fitness' | 'productivity' | 'mindfulness' | 'education' | 'finance' | 'social' | 'nutrition' | 'creativity' | 'other'
          type: 'positive' | 'negative'
          target_value: number
          unit: string
          frequency: 'daily' | 'weekly' | 'monthly'
          visibility: 'public' | 'followers' | 'private'
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          category?: 'health' | 'fitness' | 'productivity' | 'mindfulness' | 'education' | 'finance' | 'social' | 'nutrition' | 'creativity' | 'other'
          type?: 'positive' | 'negative'
          target_value?: number
          unit?: string
          frequency?: 'daily' | 'weekly' | 'monthly'
          visibility?: 'public' | 'followers' | 'private'
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          category?: 'health' | 'fitness' | 'productivity' | 'mindfulness' | 'education' | 'finance' | 'social' | 'nutrition' | 'creativity' | 'other'
          type?: 'positive' | 'negative'
          target_value?: number
          unit?: string
          frequency?: 'daily' | 'weekly' | 'monthly'
          visibility?: 'public' | 'followers' | 'private'
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      check_ins: {
        Row: {
          id: string
          habit_id: string
          user_id: string
          value: number
          note: string | null
          image_url: string | null
          logged_at: string
          created_at: string
        }
        Insert: {
          id?: string
          habit_id: string
          user_id: string
          value?: number
          note?: string | null
          image_url?: string | null
          logged_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          habit_id?: string
          user_id?: string
          value?: number
          note?: string | null
          image_url?: string | null
          logged_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_habit_id_fkey"
            columns: ["habit_id"]
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      habit_follows: {
        Row: {
          follower_id: string
          habit_id: string
          followed_at: string
        }
        Insert: {
          follower_id: string
          habit_id: string
          followed_at?: string
        }
        Update: {
          follower_id?: string
          habit_id?: string
          followed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_follows_follower_id_fkey"
            columns: ["follower_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_follows_habit_id_fkey"
            columns: ["habit_id"]
            referencedRelation: "habits"
            referencedColumns: ["id"]
          }
        ]
      }
      streaks: {
        Row: {
          habit_id: string
          user_id: string
          current_streak: number
          longest_streak: number
          last_checkin: string | null
        }
        Insert: {
          habit_id: string
          user_id: string
          current_streak?: number
          longest_streak?: number
          last_checkin?: string | null
        }
        Update: {
          habit_id?: string
          user_id?: string
          current_streak?: number
          longest_streak?: number
          last_checkin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_stats: {
        Args: {
          profile_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      habit_category: Database["public"]["Tables"]["habits"]["Row"]["category"]
      habit_type: Database["public"]["Tables"]["habits"]["Row"]["type"]
      habit_frequency: Database["public"]["Tables"]["habits"]["Row"]["frequency"]
      habit_visibility: Database["public"]["Tables"]["habits"]["Row"]["visibility"]
    }
  }
}
