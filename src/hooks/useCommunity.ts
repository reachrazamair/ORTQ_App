import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Post, Group, Tab } from '../types/community';
import {
  reportContent,
  blockUser,
  getBlockedUsers,
  syncBlockedUsers,
} from '../utils/moderation';

export function useCommunity() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isQuestParticipant, setIsQuestParticipant] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // Feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // My Groups
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingMyGroups, setLoadingMyGroups] = useState(false);

  // Discover
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [search, setSearch] = useState('');

  const [refreshing, setRefreshing] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Auth + quest participation
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) {
        const { data: questData } = await supabase
          .from('user_quests')
          .select('id')
          .eq('user_id', uid)
          .eq('status', 'active')
          .limit(1);
        setIsQuestParticipant((questData?.length ?? 0) > 0);

        // Sync blocked users from cloud
        const synced = await syncBlockedUsers(uid);
        setBlockedUsers(synced);
      }
    });

    const checkTerms = async () => {
      const accepted = await AsyncStorage.getItem('ortq_terms_accepted');
      if (!accepted) setShowTerms(true);
    };
    checkTerms();

    const loadBlocks = async () => {
      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);
    };
    loadBlocks();
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, alias, profile_image_url)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) setPosts((data as Post[]) ?? []);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const handleCreatePost = useCallback(
    async (content: string, imageUrl: string | null) => {
      if (!currentUserId) return;
      const { error } = await supabase
        .from('community_posts')
        .insert({ user_id: currentUserId, content, image_url: imageUrl });
      if (error) {
        Alert.alert('Error', 'Failed to post. Please try again.');
        return;
      }
      await loadPosts();
    },
    [currentUserId, loadPosts],
  );

  const handleDeletePost = useCallback(async (postId: string) => {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const handleReportPost = useCallback(
    (postId: string) => {
      if (!currentUserId) {
        Alert.alert('Sign In Required', 'Please sign in to report content.');
        return;
      }
      reportContent('post', postId, currentUserId);
    },
    [currentUserId],
  );

  const handleBlockUser = useCallback(
    async (userId: string) => {
      await blockUser(userId, currentUserId);
      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);
    },
    [currentUserId],
  );

  const loadMyGroups = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingMyGroups(true);
    try {
      const { data, error } = await supabase
        .from('community_group_members')
        .select(
          'role, community_groups(id, name, description, header_image_url, is_private, created_by, last_activity_at)',
        )
        .eq('user_id', currentUserId);

      if (error || !data) return;

      const groupIds = data
        .map((m: any) => m.community_groups?.id)
        .filter(Boolean);
      let countMap: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: counts } = await supabase
          .from('community_group_members')
          .select('group_id')
          .in('group_id', groupIds);
        (counts ?? []).forEach((row: any) => {
          countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
        });
      }

      const groups: Group[] = data
        .filter((m: any) => m.community_groups)
        .map((m: any) => ({
          ...m.community_groups,
          member_count: countMap[m.community_groups.id] ?? 0,
          is_member: true,
          user_role: m.role,
        }));
      setMyGroups(groups);
    } finally {
      setLoadingMyGroups(false);
    }
  }, [currentUserId]);

  const loadAllGroups = useCallback(async () => {
    setLoadingDiscover(true);
    try {
      const { data: groups, error } = await supabase
        .from('community_groups')
        .select(
          'id, name, description, header_image_url, is_private, created_by, last_activity_at',
        )
        .order('last_activity_at', { ascending: false });

      if (error || !groups) return;

      const groupIds = groups.map((g: any) => g.id);
      let countMap: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: counts } = await supabase
          .from('community_group_members')
          .select('group_id')
          .in('group_id', groupIds);
        (counts ?? []).forEach((row: any) => {
          countMap[row.group_id] = (countMap[row.group_id] ?? 0) + 1;
        });
      }

      let memberSet: Set<string> = new Set();
      let roleMap: Record<string, 'admin' | 'member'> = {};
      if (currentUserId && groupIds.length > 0) {
        const { data: memberships } = await supabase
          .from('community_group_members')
          .select('group_id, role')
          .eq('user_id', currentUserId)
          .in('group_id', groupIds);
        (memberships ?? []).forEach((m: any) => {
          memberSet.add(m.group_id);
          roleMap[m.group_id] = m.role;
        });
      }

      const result: Group[] = groups.map((g: any) => ({
        ...g,
        member_count: countMap[g.id] ?? 0,
        is_member: memberSet.has(g.id),
        user_role: roleMap[g.id] ?? null,
      }));
      setAllGroups(result);
    } finally {
      setLoadingDiscover(false);
    }
  }, [currentUserId]);

  const handleJoinGroup = useCallback(
    async (group: Group) => {
      if (!currentUserId) return;

      if (!isQuestParticipant) {
        Alert.alert(
          'Quest Participation Required',
          'You must be participating in a quest to join a group.',
        );
        return;
      }

      if (group.is_private) {
        Alert.alert('Private Group', `Send a join request to "${group.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              const { error } = await supabase
                .from('community_group_join_requests')
                .insert({
                  group_id: group.id,
                  user_id: currentUserId,
                  status: 'pending',
                });
              if (error) {
                if (error.code === '23505') {
                  Alert.alert('Already Requested', 'Your request is pending approval.');
                } else {
                  Alert.alert('Error', 'Failed to send join request.');
                }
              } else {
                Alert.alert(
                  'Request Sent',
                  'Your request is pending approval from an admin.',
                );
              }
            },
          },
        ]);
      } else {
        const { error } = await supabase
          .from('community_group_members')
          .insert({ group_id: group.id, user_id: currentUserId, role: 'member' });
        if (error) {
          Alert.alert('Error', 'Failed to join group.');
          return;
        }
        await Promise.all([loadMyGroups(), loadAllGroups()]);
        Alert.alert('Joined!', `You are now a member of "${group.name}".`);
      }
    },
    [currentUserId, isQuestParticipant, loadMyGroups, loadAllGroups],
  );

  const handleLeaveGroup = useCallback(
    async (group: Group) => {
      Alert.alert('Leave Group', `Leave "${group.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('community_group_members')
              .delete()
              .eq('group_id', group.id)
              .eq('user_id', currentUserId);
            if (error) {
              Alert.alert('Error', 'Failed to leave group.');
              return;
            }
            await Promise.all([loadMyGroups(), loadAllGroups()]);
          },
        },
      ]);
    },
    [currentUserId, loadMyGroups, loadAllGroups],
  );

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'feed') loadPosts();
      if (activeTab === 'groups') loadMyGroups();
      if (activeTab === 'discover') loadAllGroups();
    }, [activeTab, loadPosts, loadMyGroups, loadAllGroups]),
  );

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'feed') loadPosts();
    if (tab === 'groups') loadMyGroups();
    if (tab === 'discover') loadAllGroups();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'feed') await loadPosts();
    if (activeTab === 'groups') await loadMyGroups();
    if (activeTab === 'discover') await loadAllGroups();
    setRefreshing(false);
  }, [activeTab, loadPosts, loadMyGroups, loadAllGroups]);

  const filteredGroups = search.trim()
    ? allGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : allGroups;

  const filteredPosts = posts.filter(p => !blockedUsers.includes(p.user_id));

  return {
    activeTab,
    currentUserId,
    isQuestParticipant,
    showTerms,
    setShowTerms,
    posts: filteredPosts,
    loadingPosts,
    showCompose,
    setShowCompose,
    myGroups,
    loadingMyGroups,
    allGroups: filteredGroups,
    loadingDiscover,
    search,
    setSearch,
    refreshing,
    showCreateGroup,
    setShowCreateGroup,
    handleCreatePost,
    handleDeletePost,
    handleReportPost,
    handleBlockUser,
    handleJoinGroup,
    handleLeaveGroup,
    handleTabChange,
    handleRefresh,
    loadMyGroups,
  };
}
