import React from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Post } from '../../types/community';
import {
  getAvatarUrl,
  getDisplayName,
  getInitials,
  formatRelativeTime,
} from '../../utils/communityHelpers';
import { styles } from '../../styles/communityStyles';

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
  onBlock: (userId: string) => void;
}

export default function PostCard({
  post,
  currentUserId,
  onDelete,
  onReport,
  onBlock,
}: PostCardProps) {
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
    <TouchableOpacity
      style={styles.postCard}
      onLongPress={handleLongPress}
      activeOpacity={0.95}
    >
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
          <Text style={styles.postTime}>
            {formatRelativeTime(post.created_at)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.postMenuBtn}
          onPress={() => {
            const options = ['Report Content'];
            if (post.user_id !== currentUserId) options.push('Block User');
            if (post.user_id === currentUserId) options.push('Delete Post');
            options.push('Cancel');

            Alert.alert(
              'Options',
              'What would you like to do?',
              options.map(opt => ({
                text: opt,
                style:
                  opt === 'Delete Post'
                    ? 'destructive'
                    : opt === 'Cancel'
                    ? 'cancel'
                    : 'default',
                onPress: () => {
                  if (opt === 'Report Content') onReport(post.id);
                  if (opt === 'Block User') onBlock(post.user_id);
                  if (opt === 'Delete Post') onDelete(post.id);
                },
              })),
            );
          }}
        >
          <Icon name="ellipsis-horizontal" size={20} color={Colors.blueGrey} />
        </TouchableOpacity>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.image_url ? (
        <Image
          source={{
            uri: post.image_url.startsWith('http')
              ? post.image_url
              : `${Config.SUPABASE_URL}/storage/v1/object/public/community_posts/${post.image_url}`,
          }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : null}
    </TouchableOpacity>
  );
}
