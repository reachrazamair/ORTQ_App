import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../../theme/colors';
import { CommunityStackParamList } from '../../navigation/CommunityStack';
import { TermsModal } from '../../components/TermsModal';
import { useResponsive } from '../../hooks/useResponsive';
import { useCommunity } from '../../hooks/useCommunity';
import { Tab } from '../../types/community';
import { styles } from '../../styles/communityStyles';

// Extracted Components
import PostCard from '../../components/community/PostCard';
import GroupCard from '../../components/community/GroupCard';
import ComposeModal from '../../components/community/ComposeModal';
import CreateGroupModal from '../../components/community/CreateGroupModal';

export default function CommunityScreen() {
  const { isNarrow } = useResponsive();
  const navigation =
    useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();

  const {
    activeTab,
    currentUserId,
    isQuestParticipant,
    showTerms,
    setShowTerms,
    posts,
    loadingPosts,
    showCompose,
    setShowCompose,
    myGroups,
    loadingMyGroups,
    allGroups,
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
  } = useCommunity();

  const listData =
    activeTab === 'feed' ? posts : activeTab === 'groups' ? myGroups : allGroups;

  const isLoadingTab =
    activeTab === 'feed'
      ? loadingPosts
      : activeTab === 'groups'
      ? loadingMyGroups
      : loadingDiscover;

  const emptyIcon =
    activeTab === 'feed'
      ? 'chatbubbles-outline'
      : activeTab === 'groups'
      ? 'people-outline'
      : 'compass-outline';
  const emptyTitle =
    activeTab === 'feed'
      ? 'No posts yet'
      : activeTab === 'groups'
      ? 'No groups yet'
      : 'No groups found';
  const emptyBody =
    activeTab === 'feed'
      ? 'Be the first to share something!'
      : activeTab === 'groups'
      ? 'Discover and join groups in the Discover tab.'
      : 'Try a different search term.';

  const ListHeader = (
    <>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Community
          </Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Connect with fellow riders
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.createGroupBtn,
              !isQuestParticipant && styles.createGroupBtnDisabled,
            ]}
            onPress={() => {
              if (!isQuestParticipant) {
                Alert.alert(
                  'Quest Participation Required',
                  'You must be participating in a quest to create a group.',
                );
                return;
              }
              setShowCreateGroup(true);
            }}
          >
            <Icon
              name="people-outline"
              size={14}
              color={isQuestParticipant ? '#fff' : '#9AA0A6'}
            />
            {!isNarrow && (
              <Text
                style={[
                  styles.createGroupBtnText,
                  !isQuestParticipant && styles.createGroupBtnTextDisabled,
                ]}
              >
                New Group
              </Text>
            )}
          </TouchableOpacity>

          {activeTab === 'feed' && (
            <TouchableOpacity
              style={styles.composeBtn}
              onPress={() => setShowCompose(true)}
            >
              <Icon name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.segmentRow}>
        {(['feed', 'groups', 'discover'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.segment, activeTab === tab && styles.segmentActive]}
            onPress={() => handleTabChange(tab)}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === tab && styles.segmentTextActive,
              ]}
            >
              {tab === 'feed'
                ? 'Feed'
                : tab === 'groups'
                ? 'My Groups'
                : 'Discover'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'discover' && (
        <View style={styles.searchWrap}>
          <Icon name="search-outline" size={16} color="#9AA0A6" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search groups..."
            placeholderTextColor="#9AA0A6"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
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
              <PostCard
                post={item}
                currentUserId={currentUserId}
                onDelete={handleDeletePost}
                onReport={handleReportPost}
                onBlock={handleBlockUser}
              />
            ) : (
              <GroupCard
                group={item}
                onPress={() =>
                  navigation.navigate('GroupChat', {
                    groupId: item.id,
                    groupName: item.name,
                  })
                }
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
        isQuestParticipant={isQuestParticipant}
      />

      <CreateGroupModal
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        currentUserId={currentUserId}
        onGroupCreated={(groupId, groupName) => {
          navigation.navigate('GroupChat', { groupId, groupName });
          loadMyGroups();
        }}
      />
      <TermsModal
        visible={showTerms}
        onAccept={async () => {
          await AsyncStorage.setItem('ortq_terms_accepted', 'true');
          setShowTerms(false);
        }}
      />
    </SafeAreaView>
  );
}
