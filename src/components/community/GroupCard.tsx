import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Group } from '../../types/community';
import { getGroupImageUrl } from '../../utils/communityHelpers';
import { styles } from '../../styles/communityStyles';

interface GroupCardProps {
  group: Group;
  onPress: () => void;
  onJoin: (g: Group) => void;
  onLeave: (g: Group) => void;
  currentUserId: string | null;
}

export default function GroupCard({
  group,
  onPress,
  onJoin,
  onLeave,
  currentUserId,
}: GroupCardProps) {
  const imageUri = getGroupImageUrl(group.header_image_url);

  return (
    <TouchableOpacity
      style={styles.groupCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
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
        <Text style={styles.groupName} numberOfLines={1}>
          {group.name}
        </Text>
        {group.description ? (
          <Text style={styles.groupDesc} numberOfLines={2}>
            {group.description}
          </Text>
        ) : null}
        <View style={styles.groupMeta}>
          <Icon name="people-outline" size={13} color="#9AA0A6" />
          <Text style={styles.groupMetaText}>
            {group.member_count}{' '}
            {group.member_count === 1 ? 'member' : 'members'}
          </Text>
        </View>
      </View>
      {!group.is_member ? (
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={() => onJoin(group)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.joinBtnText}>
            {group.is_private ? 'Request' : 'Join'}
          </Text>
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
