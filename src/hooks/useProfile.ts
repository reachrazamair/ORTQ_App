import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getProfile, getCachedProfile, saveProfileToCache, UserProfile } from '../lib/profile';
import { ProfileData } from '../types/profile';
import { getStorageUrl } from '../utils/profileHelpers';

export function useProfile() {
  const [data, setData] = useState<ProfileData>({
    email: '',
    userId: null,
    displayName: '',
    avatarUrl: null,
    keys: 0,
    totalPoints: 0,
    totalTrails: 0,
    totalQuests: 0,
    region: null,
    memberSince: null,
    isUserParticipant: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [buyKeysVisible, setBuyKeysVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        return;
      }

      const newData: ProfileData = {
        email: user.email ?? '',
        userId: user.id,
        displayName: '',
        avatarUrl: null,
        keys: 0,
        totalPoints: 0,
        totalTrails: 0,
        totalQuests: 0,
        region: null,
        memberSince: null,
        isUserParticipant: false,
      };

      const [profile, questRows, questCheck] = await Promise.all([
        getProfile(user.id).catch((err: any) => {
          console.error('[useProfile] getProfile failed:', err);
          return null;
        }),
        (async () => {
          try {
            const { data, error } = await supabase
              .from('user_quests')
              .select('points_earned, trails_completed_count')
              .eq('user_id', user.id);
            if (error) throw error;
            return data as
              | { points_earned: number; trails_completed_count: number }[]
              | null;
          } catch (err) {
            console.error('[useProfile] user_quests fetch failed:', err);
            return null;
          }
        })(),
        supabase.rpc('get_active_quests_and_check_user', {
          input_user_id: user.id,
        }),
      ]);

      if (profile) {
        newData.displayName = profile.alias ?? profile.full_name ?? '';
        const rawAvatar = profile.profile_image_url ?? null;
        newData.avatarUrl = rawAvatar
          ? rawAvatar.startsWith('http')
            ? rawAvatar
            : getStorageUrl('user_avatars', rawAvatar)
          : null;
        newData.keys = profile.keys ?? 0;
        newData.region = (profile.state as any)?.region?.name ?? null;
        newData.memberSince = profile.created_at ?? null;
      }

      if (questRows) {
        newData.totalPoints = questRows.reduce(
          (s: number, q: { points_earned: number }) => s + (q.points_earned || 0),
          0,
        );
        newData.totalTrails = questRows.reduce(
          (s: number, q: { trails_completed_count: number }) => s + (q.trails_completed_count || 0),
          0,
        );
        newData.totalQuests = questRows.length;
      }

      if (questCheck?.data) {
        newData.isUserParticipant = !!questCheck.data.isUserParticipant;
      }

      setData(newData);
      // Save to cache (we need to convert ProfileData to UserProfile-like or just save ProfileData)
      // Actually, let's save the raw profile in getProfile and use it.
      // For now, let's just use the hook's setData and save the whole newData as the cache.
      await saveProfileToCache(newData as any);
    } catch (err) {
      console.error('[useProfile] load failed:', err);
      // Try to load from cache on failure
      const cached = await getCachedProfile();
      if (cached) {
        setData(cached as any);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
        },
      },
    ]);
  }, []);

  return {
    ...data,
    loading,
    refreshing,
    signingOut,
    buyKeysVisible,
    setBuyKeysVisible,
    handleRefresh,
    handleSignOut,
    load,
  };
}
