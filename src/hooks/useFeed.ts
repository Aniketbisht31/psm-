// src/hooks/useFeed.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FeedService } from '../services/feed.service';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return userId;
}

export function usePublicHabits() {
  const userId = useCurrentUser();
  
  return useQuery({
    queryKey: ['public-habits', userId],
    queryFn: () => FeedService.getPublicHabits(userId),
    refetchOnWindowFocus: true,
  });
}

export function useFollowHabit() {
  const queryClient = useQueryClient();
  const userId = useCurrentUser();

  return useMutation({
    mutationFn: async (habitId: string) => {
      if (!userId) throw new Error('Must be logged in to follow habits');
      await FeedService.followHabit(userId, habitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-habits'] });
    },
  });
}

export function useUnfollowHabit() {
  const queryClient = useQueryClient();
  const userId = useCurrentUser();

  return useMutation({
    mutationFn: async (habitId: string) => {
      if (!userId) throw new Error('Must be logged in to unfollow habits');
      await FeedService.unfollowHabit(userId, habitId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-habits'] });
    },
  });
}
