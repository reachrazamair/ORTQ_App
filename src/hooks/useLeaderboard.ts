import { useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { LeaderboardUser, RankedUser, Region } from '../types/leaderboard';

export function useLeaderboard() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedUser, setSelectedUser] = useState<RankedUser | null>(null);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch regions + current user once on mount, default to user's own region
  useEffect(() => {
    const init = async () => {
      const [{ data: authData }, { data: regionRows }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('regions').select('id, name').order('name'),
      ]);

      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);
      setRegions(regionRows ?? []);

      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('state:states(region:regions(id))')
          .eq('id', userId)
          .single();

        const regionId = (profile?.state as any)?.region?.id;
        if (regionId) setSelectedRegion(regionId);
      }

      setInitialized(true);
    };
    init();
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    const regionId = selectedRegion === 'all' ? null : selectedRegion;
    const { data, error } = await supabase.rpc('get_top_quests_by_region', {
      input_region_id: regionId,
    });
    if (!error) setUsers(data ?? []);
    setIsLoading(false);
  }, [selectedRegion]);

  useFocusEffect(
    useCallback(() => {
      if (!initialized) return;
      loadLeaderboard();
    }, [loadLeaderboard, initialized]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  const usersWithPosition = useMemo<RankedUser[]>(() => {
    let position = 1;
    return users.map((user, index) => {
      if (index > 0) {
        const prevRank = users[index - 1].leaderboard_rank;
        const prevPosition = position;
        if (user.leaderboard_rank === prevRank) {
          position = prevPosition;
        } else {
          position = prevPosition + 1;
        }
      }
      return { ...user, position };
    });
  }, [users]);

  return {
    selectedRegion,
    setSelectedRegion,
    selectedUser,
    setSelectedUser,
    users: usersWithPosition,
    regions,
    currentUserId,
    isLoading,
    refreshing,
    initialized,
    handleRefresh,
    loadLeaderboard,
  };
}
