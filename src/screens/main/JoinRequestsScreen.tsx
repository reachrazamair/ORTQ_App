import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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

type JoinRequest = {
  id: string;
  user_id: string;
  requested_at: string;
  user: {
    alias: string | null;
    full_name: string | null;
    email: string;
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function JoinRequestsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CommunityStackParamList, 'JoinRequests'>>();
  const { groupId, groupName } = route.params;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_group_join_requests')
      .select(`
        id, user_id, requested_at,
        user:profiles!community_group_join_requests_user_id_fkey(
          alias, full_name, email, profile_image_url
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (!error && data) {
      const mapped: JoinRequest[] = data.map((r: any) => {
        const profile = Array.isArray(r.user) ? (r.user[0] ?? null) : r.user;
        return {
          id: r.id,
          user_id: r.user_id,
          requested_at: r.requested_at,
          user: profile,
        };
      });
      setRequests(mapped);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
    loadRequests();
  }, [loadRequests]);

  // ---------------------------------------------------------------------------
  // Approve / Reject
  // ---------------------------------------------------------------------------

  const handleApprove = async (requestId: string) => {
    if (!currentUserId) return;
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const { error } = await supabase
        .from('community_group_join_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw new Error(error.message);

      if (request.user?.email) {
        supabase.functions
          .invoke('send-email', {
            body: {
              to: request.user.email,
              templateType: 'group_join_request_approved',
              data: {
                groupName,
                groupLink: `ortq://community/group?groupId=${groupId}`,
              },
            },
          })
          .catch(() => {});
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      Alert.alert('Request Approved', 'The user has been added to the group.');
    } catch {
      Alert.alert('Error', 'Failed to approve request. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleReject = async (requestId: string) => {
    if (!currentUserId) return;
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const { error } = await supabase
        .from('community_group_join_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUserId,
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw new Error(error.message);

      if (request.user?.email) {
        supabase.functions
          .invoke('send-email', {
            body: {
              to: request.user.email,
              templateType: 'group_join_request_rejected',
              data: { groupName },
            },
          })
          .catch(() => {});
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      Alert.alert('Request Rejected', 'The join request has been rejected.');
    } catch {
      Alert.alert('Error', 'Failed to reject request. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={22} color={Colors.blueGrey} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Join Requests</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            "{groupName}"
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={48} color="#9AA0A6" />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptyBody}>All join requests have been processed.</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const name = item.user?.alias ?? item.user?.full_name ?? 'Quest Rider';
            const email = item.user?.email ?? '';
            const avatarUri = getAvatarUrl(item.user?.profile_image_url ?? null);
            const initials = getInitials(name);
            const isProcessing = processingIds.has(item.id);
            const requestedDate = new Date(item.requested_at).toLocaleDateString();

            return (
              <View style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{name}</Text>
                    {email ? (
                      <Text style={styles.requestEmail} numberOfLines={1}>
                        {email}
                      </Text>
                    ) : null}
                    <Text style={styles.requestDate}>Requested {requestedDate}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, isProcessing && styles.dimmed]}
                    onPress={() => handleReject(item.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#9AA0A6" />
                    ) : (
                      <Icon name="close" size={18} color="#9AA0A6" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, isProcessing && styles.dimmed]}
                    onPress={() => handleApprove(item.id)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  headerSub: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: '#687076' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  emptyBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },

  list: { padding: 16, gap: 12 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitials: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.blueGrey },
  requestInfo: { flex: 1, minWidth: 0 },
  requestName: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 2,
  },
  requestEmail: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
    marginBottom: 2,
  },
  requestDate: { fontFamily: Fonts.firaSansRegular, fontSize: 11, color: '#9AA0A6' },

  requestActions: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.5 },
});
