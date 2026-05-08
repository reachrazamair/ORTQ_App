import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../theme/colors';
import { RankedUser } from '../../types/leaderboard';
import {
  getUserName,
  getInitials,
  getAvatarUrl,
  getCompletedTrailsText,
  MEDAL_COLORS,
} from '../../utils/leaderboardHelpers';
import { styles } from '../../styles/leaderboardStyles';

export function PositionBadge({ position }: { position: number }) {
  const medalColor = MEDAL_COLORS[position];
  return (
    <View
      style={[
        styles.positionBadge,
        medalColor
          ? { backgroundColor: medalColor }
          : styles.positionBadgeDefault,
      ]}
    >
      <Text
        style={[
          styles.positionBadgeText,
          !medalColor && styles.positionBadgeTextDefault,
        ]}
      >
        {position}
      </Text>
    </View>
  );
}

interface UserRowProps {
  rankedUser: RankedUser;
  isCurrentUser: boolean;
  isLast: boolean;
  onPress: () => void;
}

export function UserRow({
  rankedUser,
  isCurrentUser,
  isLast,
  onPress,
}: UserRowProps) {
  const medalColor = MEDAL_COLORS[rankedUser.position];
  const name = getUserName(rankedUser);
  const initials = getInitials(name);

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[
          styles.row,
          isCurrentUser && styles.rowCurrentUser,
          medalColor
            ? { borderLeftWidth: 4, borderLeftColor: medalColor }
            : undefined,
        ]}
      >
        <PositionBadge position={rankedUser.position} />

        <View style={styles.avatarWrap}>
          {rankedUser.profile_image_url ? (
            <Image
              source={{ uri: getAvatarUrl(rankedUser.profile_image_url)! }}
              style={styles.avatarImg}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                medalColor && { borderWidth: 2, borderColor: medalColor },
              ]}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
            {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
          </Text>
          <Text style={styles.location}>
            {rankedUser.city || 'N/A'}, {rankedUser.state_abbreviation || 'N/A'}
          </Text>
          <Text style={styles.trailsText}>
            {getCompletedTrailsText(rankedUser.trails_completed_count)}
          </Text>
        </View>

        <View style={styles.pointsWrap}>
          <Text style={styles.points}>
            {rankedUser.points_earned.toLocaleString()} pts
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}
