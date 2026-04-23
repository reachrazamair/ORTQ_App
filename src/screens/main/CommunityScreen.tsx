import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { CommunityStackParamList } from '../../navigation/CommunityStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    alias: string | null;
    profile_image_url: string | null;
  } | null;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  header_image_url: string | null;
  is_private: boolean;
  created_by: string;
  last_activity_at: string | null;
  member_count: number;
  is_member: boolean;
  user_role: 'admin' | 'member' | null;
};

type Tab = 'feed' | 'groups' | 'discover';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGroupImageUrl(headerImageUrl: string | null): string | null {
  if (!headerImageUrl) return null;
  if (headerImageUrl.startsWith('http')) return headerImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${headerImageUrl}`;
}

function getAvatarUrl(profileImageUrl: string | null): string | null {
  if (!profileImageUrl) return null;
  if (profileImageUrl.startsWith('http')) return profileImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/user_avatars/${profileImageUrl}`;
}

function getDisplayName(post: Post): string {
  return post.profiles?.alias ?? post.profiles?.full_name ?? 'Quest Rider';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

function PostCard({ post, currentUserId, onDelete }: { post: Post; currentUserId: string | null; onDelete: (id: string) => void }) {
  const name = getDisplayName(post);
  const initials = getInitials(name);
  const avatarUri = getAvatarUrl(post.profiles?.profile_image_url ?? null);

  const handleLongPress = () => {
    if (post.user_id !== currentUserId) return;
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(post.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.postCard} onLongPress={handleLongPress} activeOpacity={0.95}>
      <View style={styles.postHeader}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.postAvatar} />
        ) : (
          <View style={styles.postAvatarPlaceholder}>
            <Text style={styles.postAvatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.postMeta}>
          <Text style={styles.postAuthor}>{name}</Text>
          <Text style={styles.postTime}>{formatRelativeTime(post.created_at)}</Text>
        </View>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.image_url ? (
        <Image
          source={{ uri: post.image_url.startsWith('http') ? post.image_url : `${Config.SUPABASE_URL}/storage/v1/object/public/community_posts/${post.image_url}` }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// GroupCard
// ---------------------------------------------------------------------------

function GroupCard({ group, onPress, onJoin, onLeave, currentUserId }: {
  group: Group;
  onPress: () => void;
  onJoin: (g: Group) => void;
  onLeave: (g: Group) => void;
  currentUserId: string | null;
}) {
  const imageUri = getGroupImageUrl(group.header_image_url);

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.groupImageWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.groupImage} />
        ) : (
          <View style={styles.groupImagePlaceholder}>
            <Icon name="people-outline" size={28} color="#9AA0A6" />
          </View>
        )}
        {group.is_private && (
          <View style={styles.privateBadge}>
            <Icon name="lock-closed" size={10} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
        {group.description ? (
          <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
        ) : null}
        <View style={styles.groupMeta}>
          <Icon name="people-outline" size={13} color="#9AA0A6" />
          <Text style={styles.groupMetaText}>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</Text>
        </View>
      </View>
      {!group.is_member ? (
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => onJoin(group)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.joinBtnText}>{group.is_private ? 'Request' : 'Join'}</Text>
        </TouchableOpacity>
      ) : group.user_role === 'admin' ? (
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Admin</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={() => onLeave(group)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.leaveBtnText}>Leave</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// ComposeModal
// ---------------------------------------------------------------------------

function ComposeModal({ visible, onClose, onSubmit }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setContent('');
    onClose();
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      Alert.alert('Too long', 'Posts cannot exceed 2000 characters.');
      return;
    }
    setLoading(true);
    await onSubmit(trimmed);
    setLoading(false);
    setContent('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.composeOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={styles.composeSheet}>
            <View style={styles.composeHeader}>
              <Text style={styles.composeTitle}>New Post</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={22} color={Colors.blueGrey} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.composeInput}
              value={content}
              onChangeText={setContent}
              placeholder="Share something with the community..."
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={2000}
              autoFocus
            />
            <Text style={styles.composeCount}>{content.length}/2000</Text>
            <View style={styles.composeActions}>
              <TouchableOpacity style={styles.composeCancelBtn} onPress={handleClose}>
                <Text style={styles.composeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.composeSubmitBtn, (!content.trim() || loading) && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!content.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.composeSubmitText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function CommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();

  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Feed state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCompose, setShowCompose] = useState(false);

  // My Groups state
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loadingMyGroups, setLoadingMyGroups] = useState(false);

  // Discover state
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [search, setSearch] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Feed
  // ---------------------------------------------------------------------------

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, profiles(full_name, alias, profile_image_url)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error) setPosts((data as Post[]) ?? []);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const handleCreatePost = useCallback(async (content: string) => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('community_posts')
      .insert({ user_id: currentUserId, content });
    if (error) {
      Alert.alert('Error', 'Failed to post. Please try again.');
      return;
    }
    await loadPosts();
  }, [currentUserId, loadPosts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);
    if (!error) setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  // ---------------------------------------------------------------------------
  // My Groups
  // ---------------------------------------------------------------------------

  const loadMyGroups = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingMyGroups(true);
    try {
      const { data, error } = await supabase
        .from('community_group_members')
        .select('role, community_groups(id, name, description, header_image_url, is_private, created_by, last_activity_at)')
        .eq('user_id', currentUserId);

      if (error || !data) return;

      const groupIds = data.map((m: any) => m.community_groups?.id).filter(Boolean);

      // Fetch member counts
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

  // ---------------------------------------------------------------------------
  // Discover
  // ---------------------------------------------------------------------------

  const loadAllGroups = useCallback(async () => {
    setLoadingDiscover(true);
    try {
      const { data: groups, error } = await supabase
        .from('community_groups')
        .select('id, name, description, header_image_url, is_private, created_by, last_activity_at')
        .order('last_activity_at', { ascending: false });

      if (error || !groups) return;

      const groupIds = groups.map((g: any) => g.id);

      // Fetch member counts
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

      // Fetch current user's memberships
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

  // ---------------------------------------------------------------------------
  // Group join / leave
  // ---------------------------------------------------------------------------

  const handleJoinGroup = useCallback(async (group: Group) => {
    if (!currentUserId) return;
    if (group.is_private) {
      Alert.alert(
        'Private Group',
        `Send a join request to "${group.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              const { error } = await supabase
                .from('community_group_join_requests')
                .insert({ group_id: group.id, user_id: currentUserId, status: 'pending' });
              if (error) {
                if (error.code === '23505') {
                  Alert.alert('Already Requested', 'Your request is pending approval.');
                } else {
                  Alert.alert('Error', 'Failed to send join request.');
                }
              } else {
                Alert.alert('Request Sent', 'Your request is pending approval from an admin.');
              }
            },
          },
        ],
      );
    } else {
      const { error } = await supabase
        .from('community_group_members')
        .insert({ group_id: group.id, user_id: currentUserId, role: 'member' });
      if (error) {
        Alert.alert('Error', 'Failed to join group.');
        return;
      }
      // Refresh both lists
      await Promise.all([loadMyGroups(), loadAllGroups()]);
      Alert.alert('Joined!', `You are now a member of "${group.name}".`);
    }
  }, [currentUserId, loadMyGroups, loadAllGroups]);

  const handleLeaveGroup = useCallback(async (group: Group) => {
    Alert.alert(
      'Leave Group',
      `Leave "${group.name}"?`,
      [
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
      ],
    );
  }, [currentUserId, loadMyGroups, loadAllGroups]);

  // ---------------------------------------------------------------------------
  // Focus effect — reload active tab
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'feed') loadPosts();
      if (activeTab === 'groups') loadMyGroups();
      if (activeTab === 'discover') loadAllGroups();
    }, [activeTab, loadPosts, loadMyGroups, loadAllGroups]),
  );

  // Reload when switching tabs
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

  // ---------------------------------------------------------------------------
  // Discover filtered results
  // ---------------------------------------------------------------------------

  const filteredGroups = search.trim()
    ? allGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : allGroups;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const listData = activeTab === 'feed' ? posts : activeTab === 'groups' ? myGroups : filteredGroups;

  const isLoadingTab = activeTab === 'feed' ? loadingPosts : activeTab === 'groups' ? loadingMyGroups : loadingDiscover;

  const emptyIcon = activeTab === 'feed' ? 'chatbubbles-outline' : activeTab === 'groups' ? 'people-outline' : 'compass-outline';
  const emptyTitle = activeTab === 'feed' ? 'No posts yet' : activeTab === 'groups' ? 'No groups yet' : 'No groups found';
  const emptyBody = activeTab === 'feed' ? 'Be the first to share something!' : activeTab === 'groups' ? 'Discover and join groups in the Discover tab.' : 'Try a different search term.';

  const ListHeader = (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>Connect with fellow riders</Text>
        </View>
        {activeTab === 'feed' && (
          <TouchableOpacity style={styles.composeBtn} onPress={() => setShowCompose(true)}>
            <Icon name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.segmentRow}>
        {(['feed', 'groups', 'discover'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && styles.segmentActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text style={[styles.segmentText, activeTab === tab && styles.segmentTextActive]}>
              {tab === 'feed' ? 'Feed' : tab === 'groups' ? 'My Groups' : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'discover' && (
        <View style={styles.searchWrap}>
          <Icon name="search-outline" size={16} color="#9AA0A6" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search groups..."
            placeholderTextColor="#9AA0A6"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close-circle" size={16} color="#9AA0A6" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      <FlatList
        data={listData as any[]}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemPad}>
            {activeTab === 'feed' ? (
              <PostCard post={item} currentUserId={currentUserId} onDelete={handleDeletePost} />
            ) : (
              <GroupCard
                group={item}
                onPress={() => navigation.navigate('GroupChat', { groupId: item.id, groupName: item.name })}
                onJoin={handleJoinGroup}
                onLeave={handleLeaveGroup}
                currentUserId={currentUserId}
              />
            )}
          </View>
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
        ListEmptyComponent={
          isLoadingTab ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.orange} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name={emptyIcon} size={48} color="#9AA0A6" />
              <Text style={styles.emptyTitle}>{emptyTitle}</Text>
              <Text style={styles.emptyBody}>{emptyBody}</Text>
            </View>
          )
        }
      />

      <ComposeModal
        visible={showCompose}
        onClose={() => setShowCompose(false)}
        onSubmit={handleCreatePost}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
    marginBottom: 2,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segment
  segmentRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#E9ECEF',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
  },
  segmentTextActive: {
    fontFamily: Fonts.firaSansBold,
    color: Colors.blueGrey,
  },

  // List
  listContent: { paddingBottom: 32 },
  itemPad: { paddingHorizontal: 16 },

  // Post card
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  postAvatar: { width: 38, height: 38, borderRadius: 19 },
  postAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  postMeta: { flex: 1 },
  postAuthor: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 1,
  },
  postTime: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  postContent: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    lineHeight: 21,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },

  // Group card
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  groupImageWrap: { position: 'relative' },
  groupImage: { width: 56, height: 56, borderRadius: 12 },
  groupImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.blueGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfo: { flex: 1 },
  groupName: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 3,
  },
  groupDesc: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
    lineHeight: 17,
    marginBottom: 4,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  groupMetaText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.orange,
  },
  joinBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: '#fff',
  },
  leaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  leaveBtnText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.orange + '20',
  },
  roleBadgeText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 11,
    color: Colors.orange,
  },

  // Discover search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    padding: 0,
  },

  // Compose modal
  composeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  composeSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  composeTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  composeInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 14,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  composeCount: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'right',
    marginBottom: 16,
  },
  composeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  composeCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  composeCancelText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  composeSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: 'center',
  },
  composeSubmitText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },

  // Empty / centered
  centered: { paddingVertical: 60, alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  emptyBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },
});
