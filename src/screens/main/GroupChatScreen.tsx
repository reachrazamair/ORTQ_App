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
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { CommunityStackParamList } from '../../navigation/CommunityStack';
import { TermsModal } from '../../components/TermsModal';
import { reportContent, blockUser, getBlockedUsers, syncBlockedUsers, containsBlockedContent } from '../../utils/moderation';

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

type GroupDetails = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  header_image_url: string | null;
};

type MemberProfile = {
  member_id: string;
  user_id: string;
  role: 'admin' | 'member';
  alias: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  vehicle_type: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  rig_description: string | null;
  about_me: string | null;
  city: string | null;
  state: string | null;
};

type SearchUser = {
  id: string;
  alias: string | null;
  full_name: string | null;
  email: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarUrl(profileImageUrl: string | null): string | null {
  if (!profileImageUrl) return null;
  if (profileImageUrl.startsWith('http')) return profileImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/user_avatars/${profileImageUrl}`;
}

function getDisplayName(
  msg: Message | { profiles: { alias?: string | null; full_name?: string | null } | null },
): string {
  return (msg.profiles as any)?.alias ?? (msg.profiles as any)?.full_name ?? 'Quest Rider';
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
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Chat file validation (matching web's validateGroupMessageFile: jpg/png/gif/pdf/txt, max 10 MB)
const CHAT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const CHAT_DOC_TYPES = ['application/pdf', 'text/plain'];
const CHAT_FILE_MAX_SIZE = 10 * 1024 * 1024;

type SelectedFile = {
  uri: string;
  type: string;
  name: string;
  isImage: boolean;
};

// Group form validation (matching web's createGroupChatSchema)
function validateGroupForm(title: string, description: string): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!title.trim()) errs.title = 'Group title is required';
  else if (title.trim().length > 100) errs.title = 'Group title must be less than 100 characters';
  if (description.trim().length > 1000)
    errs.description = 'Description must be less than 1000 characters';
  return errs;
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

function MessageBubble({ 
  message, 
  isOwn, 
  currentUserId,
  onReport,
  onBlock
}: { 
  message: Message; 
  isOwn: boolean;
  currentUserId: string | null;
  onReport: (id: string) => void;
  onBlock: (userId: string) => void;
}) {
  const name = getDisplayName(message);
  const initials = getInitials(name);
  const avatarUri = getAvatarUrl(message.profiles?.profile_image_url ?? null);

  const fileKey = message.image_url ?? null;
  const fileUrl = fileKey
    ? fileKey.startsWith('http')
      ? fileKey
      : `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${fileKey}`
    : null;
  const isDocFile = fileKey
    ? fileKey.endsWith('.pdf') || fileKey.endsWith('.txt')
    : false;
  const docFileName = fileKey ? fileKey.split('/').pop() ?? fileKey : null;

  const FileAttachment = ({ dark }: { dark: boolean }) =>
    fileUrl && isDocFile ? (
      <View style={[styles.docAttachment, dark && styles.docAttachmentDark]}>
        <Icon
          name={fileKey!.endsWith('.pdf') ? 'document-text-outline' : 'document-outline'}
          size={20}
          color={dark ? 'rgba(255,255,255,0.85)' : Colors.blueGrey}
        />
        <Text
          style={[styles.docAttachmentName, dark && styles.docAttachmentNameDark]}
          numberOfLines={1}
        >
          {docFileName}
        </Text>
      </View>
    ) : null;

  const handleOptions = () => {
    const options = ['Report Message'];
    if (message.user_id !== currentUserId) options.push('Block User');
    options.push('Cancel');

    Alert.alert('Options', 'What would you like to do?', options.map(opt => ({
      text: opt,
      style: opt === 'Cancel' ? 'cancel' : 'default',
      onPress: () => {
        if (opt === 'Report Message') onReport(message.id);
        if (opt === 'Block User') onBlock(message.user_id);
      }
    })));
  };

  if (isOwn) {
    return (
      <TouchableOpacity style={styles.bubbleRowOwn} onLongPress={handleOptions} activeOpacity={0.9}>
        <View style={styles.bubbleOwn}>
          {message.content ? (
            <Text style={styles.bubbleTextOwn}>{message.content}</Text>
          ) : null}
          {fileUrl && !isDocFile ? (
            <Image source={{ uri: fileUrl }} style={styles.bubbleImage} resizeMode="cover" />
          ) : null}
          <FileAttachment dark />
          <Text style={styles.bubbleTimeOwn}>{formatTime(message.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.bubbleRow} onLongPress={handleOptions} activeOpacity={0.9}>
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.bubbleAvatar} />
      ) : (
        <View style={styles.bubbleAvatarPlaceholder}>
          <Text style={styles.bubbleAvatarInitials}>{initials}</Text>
        </View>
      )}
      <View style={styles.bubbleOther}>
        <Text style={styles.bubbleSender}>{name}</Text>
        {message.content ? (
          <Text style={styles.bubbleTextOther}>{message.content}</Text>
        ) : null}
        {fileUrl && !isDocFile ? (
          <Image source={{ uri: fileUrl }} style={styles.bubbleImage} resizeMode="cover" />
        ) : null}
        <FileAttachment dark={false} />
        <Text style={styles.bubbleTimeOther}>{formatTime(message.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// InviteModal — search users by alias or email, send invitation email
// ---------------------------------------------------------------------------

function InviteModal({
  visible,
  onClose,
  groupId,
  groupName,
  groupDescription,
  currentUserId,
  currentUserAlias,
}: {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  groupDescription: string | null;
  currentUserId: string | null;
  currentUserAlias: string | null;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [sending, setSending] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = () => {
    setSearch('');
    setResults([]);
    setSelected([]);
    onClose();
  };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const term = text.toLowerCase().trim();
      const { data } = await supabase
        .from('profiles')
        .select('id, alias, full_name, email')
        .or(`alias.ilike.%${term}%,email.ilike.%${term}%`)
        .eq('status', 'active')
        .limit(20);
      setResults(
        (data ?? []).map((p: any) => ({
          id: p.id,
          alias: p.alias,
          full_name: p.full_name,
          email: p.email,
        })),
      );
      setSearching(false);
    }, 400);
  };

  const toggleUser = (user: SearchUser) => {
    setSelected(prev =>
      prev.some(u => u.id === user.id) ? prev.filter(u => u.id !== user.id) : [...prev, user],
    );
  };

  const handleSend = async () => {
    if (!selected.length || !currentUserId) return;
    setSending(true);
    try {
      for (const user of selected) {
        const { data: inviteData, error: inviteError } = await supabase
          .from('community_group_invitations')
          .insert({
            group_id: groupId,
            email: user.email,
            invited_by: currentUserId,
            status: 'pending',
          })
          .select('id, token')
          .single();

        if (inviteError) throw new Error(inviteError.message);

        const invitationLink = `ortq://community/invite?token=${inviteData.token}&groupId=${groupId}`;

        await supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            templateType: 'group_invitation',
            data: {
              groupName,
              inviterName: currentUserAlias ?? 'A member',
              invitationLink,
              groupDescription,
            },
          },
        });
      }

      handleClose();
      Alert.alert(
        'Invitations Sent!',
        selected.length === 1 ? 'Invitation has been sent.' : 'Invitations have been sent.',
      );
    } catch {
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite to Group</Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Search by alias or email to invite users to join "{groupName}".
          </Text>

          {/* Search input */}
          <View style={styles.inviteSearchWrap}>
            <Icon name="search-outline" size={16} color="#9AA0A6" />
            <TextInput
              style={styles.inviteSearchInput}
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search by alias or email..."
              placeholderTextColor="#9AA0A6"
              autoFocus
            />
            {searching && <ActivityIndicator size="small" color={Colors.orange} />}
          </View>

          {/* Selected users chips */}
          {selected.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectedScrollRow}
            >
              {selected.map(u => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.selectedChip}
                  onPress={() => toggleUser(u)}
                >
                  <Text style={styles.selectedChipText}>{u.alias ?? u.email}</Text>
                  <Icon name="close" size={12} color={Colors.orange} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Results */}
          <ScrollView style={styles.inviteResultsList} keyboardShouldPersistTaps="handled">
            {results.map(user => {
              const isSelected = selected.some(u => u.id === user.id);
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.inviteResultRow, isSelected && styles.inviteResultRowSelected]}
                  onPress={() => toggleUser(user)}
                >
                  <View style={styles.inviteResultAvatar}>
                    <Text style={styles.inviteResultAvatarText}>
                      {getInitials(user.alias ?? user.full_name ?? user.email)}
                    </Text>
                  </View>
                  <View style={styles.inviteResultInfo}>
                    <Text style={styles.inviteResultName}>{user.alias ?? user.full_name ?? 'User'}</Text>
                    <Text style={styles.inviteResultEmail}>{user.email}</Text>
                  </View>
                  {isSelected && <Icon name="checkmark-circle" size={20} color={Colors.orange} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                (!selected.length || sending) && { opacity: 0.5 },
              ]}
              onPress={handleSend}
              disabled={!selected.length || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalSubmitText}>
                  {selected.length <= 1 ? 'Send Invitation' : 'Send Invitations'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// EditGroupModal — edit name, description, header image (admin only)
// ---------------------------------------------------------------------------

function EditGroupModal({
  visible,
  onClose,
  group,
  onUpdated,
}: {
  visible: boolean;
  onClose: () => void;
  group: GroupDetails;
  onUpdated: (updated: { name: string; description: string | null; header_image_url: string | null }) => void;
}) {
  const [title, setTitle] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [headerImageUri, setHeaderImageUri] = useState<string | null>(null);
  const [headerImageType, setHeaderImageType] = useState<string>('image/jpeg');
  const [keepExistingImage, setKeepExistingImage] = useState(!!group.header_image_url);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setTitle(group.name);
    setDescription(group.description ?? '');
    setHeaderImageUri(null);
    setKeepExistingImage(!!group.header_image_url);
    setErrors({});
    onClose();
  };

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || !response.assets?.length) return;
      const asset = response.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum allowed file size is 5 MB.');
        return;
      }
      setHeaderImageUri(asset.uri ?? null);
      setHeaderImageType(asset.type ?? 'image/jpeg');
      setKeepExistingImage(false);
    });
  };

  const handleUpdate = async () => {
    const fieldErrors = validateGroupForm(title, description);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    let headerImageUrl: string | null | undefined;

    if (headerImageUri) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const ext = headerImageType.split('/')[1] ?? 'jpg';
        const fileName = `${Date.now()}-header.${ext}`;
        const formData = new FormData();
        formData.append('file', { uri: headerImageUri, type: headerImageType, name: fileName } as any);
        const uploadResponse = await fetch(
          `${Config.SUPABASE_URL}/storage/v1/object/community_groups/${fileName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: Config.SUPABASE_KEY!,
            },
            body: formData,
          },
        );
        if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
        headerImageUrl = fileName;
      } catch (err) {
        Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Failed to upload header image.');
        setLoading(false);
        return;
      }
    } else if (keepExistingImage) {
      headerImageUrl = group.header_image_url;
    } else {
      headerImageUrl = null;
    }

    const updateData: Record<string, any> = {
      name: title.trim(),
      description: description.trim() || '',
    };
    if (headerImageUrl !== undefined) updateData.header_image_url = headerImageUrl;

    const { error } = await supabase
      .from('community_groups')
      .update(updateData)
      .eq('id', group.id);

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    Alert.alert('Success!', `Group "${title.trim()}" has been updated.`);
    onUpdated({
      name: title.trim(),
      description: description.trim() || null,
      header_image_url: headerImageUrl ?? null,
    });
    onClose();
  };

  const currentHeaderUri =
    headerImageUri ??
    (keepExistingImage && group.header_image_url
      ? group.header_image_url.startsWith('http')
        ? group.header_image_url
        : `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${group.header_image_url}`
      : null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <TouchableOpacity onPress={handleClose}>
                <Icon name="close" size={22} color={Colors.blueGrey} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Group Title</Text>
              <TextInput
                style={[styles.fieldInput, errors.title ? styles.fieldInputError : null]}
                value={title}
                onChangeText={t => {
                  setTitle(t);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                placeholder="Group title"
                placeholderTextColor="#9AA0A6"
                maxLength={100}
                editable={!loading}
              />
              {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[
                  styles.fieldInput,
                  styles.fieldInputMultiline,
                  errors.description ? styles.fieldInputError : null,
                ]}
                value={description}
                onChangeText={d => {
                  setDescription(d);
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                }}
                placeholder="Description (optional)"
                placeholderTextColor="#9AA0A6"
                multiline
                maxLength={1000}
                editable={!loading}
              />
              {errors.description ? (
                <Text style={styles.fieldError}>{errors.description}</Text>
              ) : null}

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Header Image (Optional)</Text>
              {currentHeaderUri ? (
                <View style={styles.headerImagePreviewWrap}>
                  <Image
                    source={{ uri: currentHeaderUri }}
                    style={styles.headerImagePreview}
                    resizeMode="cover"
                  />
                  <View style={styles.headerImageActions}>
                    <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
                      <Text style={styles.changeImageText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeHeaderBtn}
                      onPress={() => {
                        setHeaderImageUri(null);
                        setKeepExistingImage(false);
                      }}
                    >
                      <Icon name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerBtn}
                  onPress={handlePickImage}
                  disabled={loading}
                >
                  <Icon name="image-outline" size={20} color="#9AA0A6" />
                  <Text style={styles.imagePickerText}>Choose a header image</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, loading && { opacity: 0.6 }]}
                onPress={handleUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Update Group</Text>
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
// UserProfileModal — view a member's profile (tap on their avatar)
// ---------------------------------------------------------------------------

function UserProfileModal({
  member,
  visible,
  onClose,
}: {
  member: MemberProfile | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!member) return null;
  const name = member.alias ?? member.full_name ?? 'Quest Rider';
  const avatarUri = getAvatarUrl(member.profile_image_url);
  const initials = getInitials(name);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar */}
            <View style={styles.profileAvatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Text style={styles.profileAvatarInitials}>{initials}</Text>
                </View>
              )}
              <Text style={styles.profileName}>{name}</Text>
              {member.city || member.state ? (
                <Text style={styles.profileLocation}>
                  {[member.city, member.state].filter(Boolean).join(', ')}
                </Text>
              ) : null}
            </View>

            {/* Vehicle info */}
            {(member.vehicle_type || member.make || member.model || member.year) && (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Vehicle</Text>
                <Text style={styles.profileSectionText}>
                  {[member.year, member.make, member.model, member.vehicle_type]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              </View>
            )}

            {/* Rig description */}
            {member.rig_description ? (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>Rig</Text>
                <Text style={styles.profileSectionText}>{member.rig_description}</Text>
              </View>
            ) : null}

            {/* About */}
            {member.about_me ? (
              <View style={styles.profileSection}>
                <Text style={styles.profileSectionTitle}>About</Text>
                <Text style={styles.profileSectionText}>{member.about_me}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function GroupChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<CommunityStackParamList>>();
  const route = useRoute<RouteProp<CommunityStackParamList, 'GroupChat'>>();
  const { groupId, groupName } = route.params;

  // Core state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAlias, setCurrentUserAlias] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isQuestParticipant, setIsQuestParticipant] = useState(false);

  // Input
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<MemberProfile | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const isCreator = group?.created_by === currentUserId;
  const currentMember = members.find(m => m.user_id === currentUserId);
  const isAdmin = isCreator || currentMember?.role === 'admin';
  const canViewMessages = !group?.is_private || isMember;
  const canSendMessages = isMember && isQuestParticipant;
  const canLeave = isMember && !isCreator;
  const canInvite = isMember && (group?.is_private ? isAdmin : true);

  // ---------------------------------------------------------------------------
  // Init — load everything
  // ---------------------------------------------------------------------------

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('community_group_members')
      .select(`
        id, user_id, role,
        profile:profiles!community_group_members_user_id_fkey(
          alias, full_name, profile_image_url,
          vehicle_type, make, model, year, rig_description, about_me,
          city:cities(name),
          state:states(abbreviation)
        )
      `)
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });

    if (data) {
      const mapped: MemberProfile[] = data.map((m: any) => {
        const profile = Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile;
        const city = profile?.city
          ? Array.isArray(profile.city)
            ? profile.city[0]?.name ?? null
            : profile.city?.name ?? null
          : null;
        const state = profile?.state
          ? Array.isArray(profile.state)
            ? profile.state[0]?.abbreviation ?? null
            : profile.state?.abbreviation ?? null
          : null;
        return {
          member_id: m.id,
          user_id: m.user_id,
          role: m.role,
          alias: profile?.alias ?? null,
          full_name: profile?.full_name ?? null,
          profile_image_url: profile?.profile_image_url ?? null,
          vehicle_type: profile?.vehicle_type ?? null,
          make: profile?.make ?? null,
          model: profile?.model ?? null,
          year: profile?.year ?? null,
          rig_description: profile?.rig_description ?? null,
          about_me: profile?.about_me ?? null,
          city,
          state,
        };
      });
      setMembers(mapped);
      return mapped;
    }
    return [];
  }, [groupId]);

  useEffect(() => {
    const init = async () => {
      setLoadingInit(true);

      // Auth
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? null;
      setCurrentUserId(uid);

      if (uid) {
        // Current user alias
        const { data: profileData } = await supabase
          .from('profiles')
          .select('alias, full_name')
          .eq('id', uid)
          .single();
        setCurrentUserAlias(profileData?.alias ?? profileData?.full_name ?? null);

        // Quest participation
        const { data: questData } = await supabase
          .from('user_quests')
          .select('id')
          .eq('user_id', uid)
          .eq('status', 'active')
          .limit(1);
        setIsQuestParticipant((questData?.length ?? 0) > 0);

        // Membership check
        const { data: membershipData } = await supabase
          .from('community_group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', uid)
          .maybeSingle();
        setIsMember(!!membershipData);

        // Sync blocked users from cloud
        const synced = await syncBlockedUsers(uid);
        setBlockedUsers(synced);
      }

      const blocked = await getBlockedUsers();
      setBlockedUsers(blocked);

      // Group details
      const { data: groupData } = await supabase
        .from('community_groups')
        .select('id, name, description, is_private, created_by, header_image_url')
        .eq('id', groupId)
        .single();
      if (groupData) setGroup(groupData as GroupDetails);

      // Members with profiles
      const loadedMembers = await loadMembers();

      // Pending requests count (admin only)
      const isAdminNow =
        groupData?.created_by === uid ||
        loadedMembers.find(m => m.user_id === uid)?.role === 'admin';
      if (isAdminNow) {
        const { count } = await supabase
          .from('community_group_join_requests')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .eq('status', 'pending');
        setPendingRequestsCount(count ?? 0);
      }

      setLoadingInit(false);

      // Show EULA if not yet accepted — required by App Store Guideline 1.2
      const accepted = await AsyncStorage.getItem('ortq_terms_accepted');
      if (!accepted) setShowTerms(true);
    };
    init();
  }, [groupId, loadMembers]);

  // ---------------------------------------------------------------------------
  // Messages
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

  // Realtime subscription
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
          const { data } = await supabase
            .from('community_group_messages')
            .select('*, profiles(full_name, alias, profile_image_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.id)) return prev;
              return [...prev, data as Message];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [groupId]);

  // Scroll to end on initial load
  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [loadingMessages]);

  const handleReportMessage = useCallback((msgId: string) => {
    if (!currentUserId) return;
    reportContent('message', msgId, currentUserId);
  }, [currentUserId]);

  const handleBlockUser = useCallback(async (userId: string) => {
    await blockUser(userId, currentUserId);
    const blocked = await getBlockedUsers();
    setBlockedUsers(blocked);
  }, [currentUserId]);

  const filteredMessages = messages.filter(m => !blockedUsers.includes(m.user_id));

  // ---------------------------------------------------------------------------
  // Send message with optional image
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;
    if (!currentUserId || sending) return;

    if (trimmed && containsBlockedContent(trimmed)) {
      Alert.alert(
        'Objectionable Content',
        'Your message contains content that violates our community guidelines. Please edit before sending.',
      );
      return;
    }

    if (!isQuestParticipant) {
      Alert.alert(
        'Quest Participation Required',
        'You must be participating in a quest to send messages.',
      );
      return;
    }

    setSending(true);
    let fileUrl: string | null = null;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const ext = selectedFile.type.split('/')[1]?.replace('plain', 'txt') ?? 'bin';
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `messages/${groupId}/${Date.now()}-${safeName}`;
        const formData = new FormData();
        formData.append('file', { uri: selectedFile.uri, type: selectedFile.type, name: safeName } as any);
        const uploadResponse = await fetch(
          `${Config.SUPABASE_URL}/storage/v1/object/community_groups/${filePath}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: Config.SUPABASE_KEY!,
            },
            body: formData,
          },
        );
        if (!uploadResponse.ok) throw new Error(await uploadResponse.text());
        fileUrl = filePath;
      } catch (err) {
        Alert.alert('Upload Failed', err instanceof Error ? err.message : 'Failed to upload file. Please try again.');
        setSending(false);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const messageContent = trimmed;
    setText('');
    setSelectedFile(null);

    const { error } = await supabase.from('community_group_messages').insert({
      group_id: groupId,
      user_id: currentUserId,
      content: messageContent,
      image_url: fileUrl,
    });

    if (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setText(messageContent);
    }

    supabase
      .from('community_groups')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', groupId)
      .then(() => {});

    setSending(false);
  }, [text, selectedFile, currentUserId, groupId, sending, isQuestParticipant]);

  // ---------------------------------------------------------------------------
  // Pick file for chat (image or document)
  // ---------------------------------------------------------------------------

  const handlePickChatFile = () => {
    Alert.alert('Attach File', 'Choose file type', [
      {
        text: 'Photo (JPG / PNG / GIF)',
        onPress: () => {
          launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, response => {
            if (response.didCancel || !response.assets?.length) return;
            const asset = response.assets[0];
            const type = asset.type?.toLowerCase() ?? '';
            if (!CHAT_IMAGE_TYPES.includes(type)) {
              Alert.alert('Unsupported file type', 'Only JPG, PNG, and GIF images are allowed.');
              return;
            }
            if ((asset.fileSize ?? 0) > CHAT_FILE_MAX_SIZE) {
              Alert.alert('File too large', 'Maximum allowed file size is 10 MB.');
              return;
            }
            const name = asset.fileName ?? `photo.${type.split('/')[1] ?? 'jpg'}`;
            setSelectedFile({ uri: asset.uri!, type, name, isImage: true });
          });
        },
      },
      {
        text: 'Document (PDF / TXT)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.pick({
              type: [DocumentPicker.types.pdf, DocumentPicker.types.plainText],
              copyTo: 'cachesDirectory',
            });
            const file = result[0];
            const type = file.type ?? 'application/octet-stream';
            if (!CHAT_DOC_TYPES.includes(type)) {
              Alert.alert('Unsupported file type', 'Only PDF and TXT files are allowed.');
              return;
            }
            if ((file.size ?? 0) > CHAT_FILE_MAX_SIZE) {
              Alert.alert('File too large', 'Maximum allowed file size is 10 MB.');
              return;
            }
            const uri = file.fileCopyUri ?? file.uri;
            setSelectedFile({ uri, type, name: file.name ?? 'document', isImage: false });
          } catch (err) {
            if (!DocumentPicker.isCancel(err)) {
              Alert.alert('Error', 'Failed to pick document.');
            }
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ---------------------------------------------------------------------------
  // Join / Leave
  // ---------------------------------------------------------------------------

  const handleJoin = useCallback(async () => {
    if (!currentUserId || !group || isMember) return;

    if (!isQuestParticipant) {
      Alert.alert(
        'Quest Participation Required',
        'You must be participating in a quest to join a group.',
      );
      return;
    }

    const { error } = await supabase
      .from('community_group_members')
      .insert({ group_id: groupId, user_id: currentUserId, role: 'member' });
    if (error) {
      Alert.alert('Error', 'Failed to join group.');
      return;
    }
    setIsMember(true);
    await loadMembers();
    Alert.alert('Success!', `You've joined "${group.name}".`);
  }, [currentUserId, group, groupId, isMember, isQuestParticipant, loadMembers]);

  const handleLeave = useCallback(() => {
    if (!canLeave) return;
    Alert.alert('Leave Group', `Leave "${groupName}"? You will lose access to the group chat.`, [
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
          navigation.goBack();
        },
      },
    ]);
  }, [canLeave, groupName, groupId, currentUserId, navigation]);

  // ---------------------------------------------------------------------------
  // Render header — name, member count, member avatars, action buttons
  // ---------------------------------------------------------------------------

  const visibleMembers = members.slice(0, 7);
  const overflowCount = Math.max(0, members.length - 7);

  const renderHeader = () => (
    <View style={styles.chatHeader}>
      {/* Row 1: back + name + action icons */}
      <View style={styles.chatHeaderRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={22} color={Colors.blueGrey} />
        </TouchableOpacity>

        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName} numberOfLines={1}>
            {groupName}
          </Text>
          <Text style={styles.chatHeaderMeta}>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <View style={styles.chatHeaderActions}>
          {canInvite && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setIsInviteOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Icon name="person-add-outline" size={20} color={Colors.blueGrey} />
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => setIsEditOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Icon name="pencil-outline" size={20} color={Colors.blueGrey} />
            </TouchableOpacity>
          )}
          {isAdmin && pendingRequestsCount > 0 && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => navigation.navigate('JoinRequests', { groupId, groupName })}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <View>
                <Icon name="notifications-outline" size={20} color={Colors.blueGrey} />
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>{pendingRequestsCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          {canLeave && (
            <TouchableOpacity
              style={styles.leaveHeaderBtn}
              onPress={handleLeave}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text style={styles.leaveHeaderText}>Leave</Text>
            </TouchableOpacity>
          )}
          {!isMember && !group?.is_private && (
            <TouchableOpacity style={styles.joinHeaderBtn} onPress={handleJoin}>
              <Text style={styles.joinHeaderText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Row 2: member avatars (tappable) */}
      {members.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.membersRow}
          contentContainerStyle={styles.membersRowContent}
        >
          {visibleMembers.map(member => {
            const avatarUri = getAvatarUrl(member.profile_image_url);
            const name = member.alias ?? member.full_name ?? 'Quest Rider';
            return (
              <TouchableOpacity
                key={member.user_id}
                style={styles.memberAvatarWrap}
                onPress={() => setSelectedMemberProfile(member)}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.memberAvatar} />
                ) : (
                  <View style={styles.memberAvatarPlaceholder}>
                    <Text style={styles.memberAvatarInitials}>{getInitials(name)}</Text>
                  </View>
                )}
                {member.user_id === group?.created_by && (
                  <View style={styles.creatorBadge}>
                    <Icon name="star" size={8} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          {overflowCount > 0 && (
            <View style={styles.memberOverflow}>
              <Text style={styles.memberOverflowText}>+{overflowCount}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loadingInit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {renderHeader()}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Messages area */}
        {!canViewMessages ? (
          // Private group — non-members cannot see messages
          <View style={styles.privateGate}>
            <Icon name="lock-closed-outline" size={40} color="#9AA0A6" />
            <Text style={styles.privateGateTitle}>Private Group</Text>
            <Text style={styles.privateGateBody}>
              You must be a member to view messages in this private group.
            </Text>
          </View>
        ) : loadingMessages ? (
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
            data={filteredMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwn={item.user_id === currentUserId}
                currentUserId={currentUserId}
                onReport={handleReportMessage}
                onBlock={handleBlockUser}
              />
            )}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input area */}
        {isMember ? (
          <View style={styles.inputArea}>
            {/* Selected file preview */}
            {selectedFile && (
              <View style={styles.selectedImageWrap}>
                {selectedFile.isImage ? (
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={styles.selectedImagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.selectedDocPreview}>
                    <Icon
                      name={selectedFile.name.endsWith('.pdf') ? 'document-text-outline' : 'document-outline'}
                      size={28}
                      color={Colors.blueGrey}
                    />
                    <Text style={styles.selectedDocName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeSelectedImage}
                  onPress={() => setSelectedFile(null)}
                >
                  <Icon name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.allowedFormatsHint}>Allowed: JPG, PNG, GIF, PDF, TXT · Max 10 MB</Text>
              </View>
            )}
            <View style={styles.inputRow}>
              {/* Attach button */}
              <TouchableOpacity
                style={[
                  styles.attachBtn,
                  (!canSendMessages || isUploading) && { opacity: 0.4 },
                ]}
                onPress={handlePickChatFile}
                disabled={!canSendMessages || isUploading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="attach-outline" size={22} color={Colors.blueGrey} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, !canSendMessages && { opacity: 0.6 }]}
                value={text}
                onChangeText={setText}
                placeholder={
                  canSendMessages
                    ? 'Type a message...'
                    : isQuestParticipant
                    ? 'Join the group to chat.'
                    : 'Quest participation required to send messages.'
                }
                placeholderTextColor="#9AA0A6"
                multiline
                maxLength={1000}
                returnKeyType="default"
                editable={canSendMessages}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  ((!text.trim() && !selectedFile) || sending || isUploading) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={handleSend}
                disabled={(!text.trim() && !selectedFile) || sending || isUploading}
              >
                {sending || isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : !group?.is_private ? (
          // Not a member of public group — show join bar
          <View style={styles.notMemberBar}>
            <Text style={styles.notMemberText}>
              Join this group to participate in the chat.
            </Text>
            <TouchableOpacity style={styles.joinBar} onPress={handleJoin}>
              <Text style={styles.joinBarText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* Modals */}
      {group && (
        <InviteModal
          visible={isInviteOpen}
          onClose={() => setIsInviteOpen(false)}
          groupId={groupId}
          groupName={group.name}
          groupDescription={group.description}
          currentUserId={currentUserId}
          currentUserAlias={currentUserAlias}
        />
      )}
      {group && isEditOpen && (
        <EditGroupModal
          visible={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          group={group}
          onUpdated={updated => {
            setGroup(prev =>
              prev ? { ...prev, ...updated } : prev,
            );
          }}
        />
      )}
      <UserProfileModal
        member={selectedMemberProfile}
        visible={!!selectedMemberProfile}
        onClose={() => setSelectedMemberProfile(null)}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // Header
  chatHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  chatHeaderInfo: { flex: 1, minWidth: 0 },
  chatHeaderName: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.blueGrey },
  chatHeaderMeta: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#9AA0A6' },
  chatHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerActionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: Colors.orange,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  requestBadgeText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 9,
    color: '#fff',
  },
  joinHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.orange,
  },
  joinHeaderText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: '#fff' },
  leaveHeaderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  leaveHeaderText: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: '#9AA0A6' },

  // Member avatars row
  membersRow: { maxHeight: 48 },
  membersRowContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarWrap: { position: 'relative' },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarInitials: { fontFamily: Fonts.gothamBold, fontSize: 11, color: Colors.blueGrey },
  creatorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOverflow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberOverflowText: { fontFamily: Fonts.firaSansRegular, fontSize: 10, color: '#687076' },

  // Messages
  messagesList: { paddingVertical: 12, paddingHorizontal: 12 },

  // Bubble — own
  bubbleRowOwn: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
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

  // Bubble — other
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
  bubbleAvatarInitials: { fontFamily: Fonts.gothamBold, fontSize: 11, color: Colors.blueGrey },
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
  bubbleImage: { width: 200, height: 140, borderRadius: 10, marginTop: 6 },

  // Input area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  selectedImageWrap: {
    margin: 10,
    marginBottom: 0,
    position: 'relative',
  },
  selectedImagePreview: {
    width: 120,
    height: 80,
    borderRadius: 10,
  },
  removeSelectedImage: {
    position: 'absolute',
    top: 4,
    left: 100,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowedFormatsHint: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 4,
  },
  selectedDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 260,
  },
  selectedDocName: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  docAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    maxWidth: 200,
  },
  docAttachmentDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  docAttachmentName: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: Colors.blueGrey,
  },
  docAttachmentNameDark: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  joinBarText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: '#fff' },

  // Private gate
  privateGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
  },
  privateGateTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  privateGateBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
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
  emptyChatTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  emptyChatBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
  },

  // Modals shared
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  modalSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    marginBottom: 16,
  },
  modalFooter: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: 'center',
  },
  modalSubmitText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // Invite modal
  inviteSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  inviteSearchInput: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    padding: 0,
  },
  selectedScrollRow: { maxHeight: 40, marginBottom: 10 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.orange + '18',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  selectedChipText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: Colors.orange },
  inviteResultsList: { maxHeight: 240 },
  inviteResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  inviteResultRowSelected: { backgroundColor: Colors.orange + '08' },
  inviteResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteResultAvatarText: { fontFamily: Fonts.gothamBold, fontSize: 12, color: Colors.blueGrey },
  inviteResultInfo: { flex: 1 },
  inviteResultName: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  inviteResultEmail: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076' },

  // Group form fields
  fieldLabel: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey, marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  fieldInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  fieldInputError: { borderColor: '#EF4444' },
  fieldError: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#EF4444', marginTop: 4 },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
  },
  imagePickerText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#9AA0A6' },
  headerImagePreviewWrap: { position: 'relative', marginBottom: 4 },
  headerImagePreview: { width: '100%', height: 100, borderRadius: 12 },
  headerImageActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  changeImageBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeImageText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#fff' },
  removeHeaderBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // User profile modal
  profileAvatarWrap: { alignItems: 'center', paddingVertical: 16 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  profileAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileAvatarInitials: { fontFamily: Fonts.gothamBold, fontSize: 28, color: Colors.blueGrey },
  profileName: { fontFamily: Fonts.gothamBold, fontSize: 20, color: Colors.blueGrey },
  profileLocation: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    marginTop: 4,
  },
  profileSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  profileSectionTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: '#9AA0A6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  profileSectionText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    lineHeight: 20,
  },
});
