import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { CommunityStackParamList } from '../../navigation/CommunityStack';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Message = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    alias: string | null;
    profile_image_url: string | null;
  } | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarUrl(profileImageUrl: string | null): string | null {
  if (!profileImageUrl) return null;
  if (profileImageUrl.startsWith('http')) return profileImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/user_avatars/${profileImageUrl}`;
}

function getDisplayName(msg: Message): string {
  return msg.profiles?.alias ?? msg.profiles?.full_name ?? 'Quest Rider';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const name = getDisplayName(message);
  const initials = getInitials(name);
  const avatarUri = getAvatarUrl(message.profiles?.profile_image_url ?? null);

  if (isOwn) {
    return (
      <View style={styles.bubbleRowOwn}>
        <View style={styles.bubbleOwn}>
          <Text style={styles.bubbleTextOwn}>{message.content}</Text>
          {message.image_url ? (
            <Image
              source={{ uri: message.image_url.startsWith('http') ? message.image_url : `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${message.image_url}` }}
              style={styles.bubbleImage}
              resizeMode="cover"
            />
          ) : null}
          <Text style={styles.bubbleTimeOwn}>{formatTime(message.created_at)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bubbleRow}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.bubbleAvatar} />
      ) : (
        <View style={styles.bubbleAvatarPlaceholder}>
          <Text style={styles.bubbleAvatarInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.bubbleOther}>
        <Text style={styles.bubbleSender}>{name}</Text>
        <Text style={styles.bubbleTextOther}>{message.content}</Text>
        {message.image_url ? (
          <Image
            source={{ uri: message.image_url.startsWith('http') ? message.image_url : `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${message.image_url}` }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        ) : null}
        <Text style={styles.bubbleTimeOther}>{formatTime(message.created_at)}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function GroupChatScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CommunityStackParamList, 'GroupChat'>>();
  const { groupId, groupName } = route.params;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ---------------------------------------------------------------------------
  // Auth + membership check
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setCurrentUserId(uid);

      if (uid) {
        const { data: membership } = await supabase
          .from('community_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', uid)
          .maybeSingle();
        setIsMember(!!membership);
      }

      // Member count
      const { data: members } = await supabase
        .from('community_group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);
      setMemberCount((members as any)?.length ?? 0);
    };
    init();
  }, [groupId]);

  // ---------------------------------------------------------------------------
  // Load messages
  // ---------------------------------------------------------------------------

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from('community_group_messages')
      .select('*, profiles(full_name, alias, profile_image_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error) setMessages((data as Message[]) ?? []);
    setLoadingMessages(false);
  }, [groupId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ---------------------------------------------------------------------------
  // Realtime subscription
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const channel = supabase
      .channel(`group_messages_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async payload => {
          // Fetch the full message with profile join
          const { data } = await supabase
            .from('community_group_messages')
            .select('*, profiles(full_name, alias, profile_image_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  // Scroll to end on initial load
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [loadingMessages]);

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUserId || sending) return;

    setSending(true);
    setText('');

    const { error } = await supabase
      .from('community_group_messages')
      .insert({ group_id: groupId, user_id: currentUserId, content: trimmed });

    if (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setText(trimmed); // restore
    }

    // Update group's last_activity_at
    supabase
      .from('community_groups')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', groupId)
      .then(() => {});

    setSending(false);
  }, [text, currentUserId, groupId, sending]);

  // ---------------------------------------------------------------------------
  // Join / Leave
  // ---------------------------------------------------------------------------

  const handleJoin = useCallback(async () => {
    if (!currentUserId) return;
    const { error } = await supabase
      .from('community_group_members')
      .insert({ group_id: groupId, user_id: currentUserId, role: 'member' });
    if (error) {
      Alert.alert('Error', 'Failed to join group.');
      return;
    }
    setIsMember(true);
    setMemberCount(prev => prev + 1);
  }, [currentUserId, groupId]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave Group',
      `Leave "${groupName}"? You will lose access to the group chat.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('community_group_members')
              .delete()
              .eq('group_id', groupId)
              .eq('user_id', currentUserId);
            if (error) {
              Alert.alert('Error', 'Failed to leave group.');
              return;
            }
            setIsMember(false);
            setMemberCount(prev => Math.max(0, prev - 1));
          },
        },
      ],
    );
  }, [groupId, groupName, currentUserId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-back" size={22} color={Colors.blueGrey} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{groupName}</Text>
          <Text style={styles.headerMeta}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
        </View>
        {isMember ? (
          <TouchableOpacity style={styles.leaveHeaderBtn} onPress={handleLeave}>
            <Text style={styles.leaveHeaderText}>Leave</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.joinHeaderBtn} onPress={handleJoin}>
            <Text style={styles.joinHeaderText}>Join</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages */}
        {loadingMessages ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.orange} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Icon name="chatbubbles-outline" size={48} color="#9AA0A6" />
            <Text style={styles.emptyChatTitle}>No messages yet</Text>
            <Text style={styles.emptyChatBody}>
              {isMember ? 'Be the first to say hello!' : 'Join the group to start chatting.'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={item.user_id === currentUserId} />
            )}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input */}
        {isMember ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#9AA0A6"
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notMemberBar}>
            <Text style={styles.notMemberText}>Join this group to participate in the chat.</Text>
            <TouchableOpacity style={styles.joinBar} onPress={handleJoin}>
              <Text style={styles.joinBarText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    marginBottom: 1,
  },
  headerMeta: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  joinHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.orange,
  },
  joinHeaderText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: '#fff',
  },
  leaveHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  leaveHeaderText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
  },

  // Messages
  messagesList: { paddingVertical: 12, paddingHorizontal: 12 },

  // Bubble - own
  bubbleRowOwn: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bubbleOwn: {
    backgroundColor: Colors.orange,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  bubbleTextOwn: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
  },
  bubbleTimeOwn: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'right',
  },

  // Bubble - other
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  bubbleAvatar: { width: 32, height: 32, borderRadius: 16 },
  bubbleAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleAvatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 11,
    color: Colors.blueGrey,
  },
  bubbleOther: {
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  bubbleSender: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 11,
    color: Colors.orange,
    marginBottom: 3,
  },
  bubbleTextOther: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    lineHeight: 20,
  },
  bubbleTimeOther: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 10,
    color: '#9AA0A6',
    marginTop: 4,
  },

  // Bubble image
  bubbleImage: {
    width: 200,
    height: 140,
    borderRadius: 10,
    marginTop: 8,
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },

  // Not member bar
  notMemberBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  notMemberText: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
  },
  joinBar: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.orange,
  },
  joinBarText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: '#fff',
  },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyChatTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  emptyChatBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },
});
