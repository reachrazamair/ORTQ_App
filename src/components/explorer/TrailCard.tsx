import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Trail, Variants, Quest } from '../../types/explorer';
import {
  getDifficultyColor,
  getStatusIconName,
  getStatusColor,
  getTrailTypeColor,
  getContrastColor,
  getTrailImageUrl,
  metersToMiles,
} from '../../utils/explorerHelpers';

export function CardRow({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.cardRow}>
      <Icon
        name={icon}
        size={14}
        color={Colors.orange}
        style={styles.cardRowIcon}
      />
      <Text style={styles.cardRowText}>{children}</Text>
    </View>
  );
}

interface TrailCardProps {
  trail: Trail;
  variants: Variants;
  userKeys: number;
  isUserParticipant: boolean;
  activeQuests: Quest[];
  onShowMore: (t: Trail) => void;
  onUnlock: (t: Trail) => void;
  onJoinQuest: () => void;
  onViewOnMap: (trailId: string) => void;
}

export default function TrailCard({
  trail,
  variants,
  userKeys,
  isUserParticipant,
  activeQuests,
  onShowMore,
  onUnlock,
  onJoinQuest,
  onViewOnMap,
}: TrailCardProps) {
  const isLocked = trail.user_trail_status === 'locked';
  const { hidden_point } = trail;
  const canUnlock = userKeys >= trail.keys_to_unlock;
  const diffColor = getDifficultyColor(trail.difficulty, variants);

  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Image
          source={{ uri: getTrailImageUrl(trail.image_url) }}
          style={styles.cardImage}
        />
        {isLocked && (
          <>
            <View style={styles.cardImageOverlay} />
            <View style={styles.lockedImageBanner}>
              <Icon name="lock-closed" size={13} color="#fff" />
              <Text style={styles.lockedImageBannerText}>LOCKED</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.cardHeader}>
        <Text
          style={[styles.cardTitle, isLocked && styles.cardTitleLocked]}
          numberOfLines={2}
        >
          {isLocked ? 'Locked Trail' : trail.name}
        </Text>
        <Icon
          name={getStatusIconName(trail.user_trail_status)}
          size={18}
          color={getStatusColor(trail.user_trail_status)}
        />
      </View>

      <View style={styles.cardBadgeRow}>
        {trail.trail_types.map(typeName => {
          const color = getTrailTypeColor(typeName, variants);
          return (
            <View
              key={typeName}
              style={[styles.badge, { backgroundColor: color }]}
            >
              <Icon
                name="triangle-outline"
                size={10}
                color={getContrastColor(color)}
              />
              <Text
                style={[styles.badgeText, { color: getContrastColor(color) }]}
              >
                {typeName}
              </Text>
            </View>
          );
        })}
        <View style={[styles.badge, { backgroundColor: diffColor }]}>
          <Icon
            name="flash-outline"
            size={10}
            color={getContrastColor(diffColor)}
          />
          <Text
            style={[styles.badgeText, { color: getContrastColor(diffColor) }]}
          >
            {trail.difficulty}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <CardRow icon="location-outline">
          {trail.city}, {trail.state}
        </CardRow>

        {trail.distance_meters !== null && (
          <CardRow icon="compass-outline">
            Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)} miles
            away
          </CardRow>
        )}

        {trail.vehicle_types.length > 0 && (
          <CardRow icon="car-outline">
            <Text style={styles.cardRowLabel}>Vehicles: </Text>
            {trail.vehicle_types.join(', ')}
          </CardRow>
        )}

        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Icon
              name="document-text-outline"
              size={14}
              color={Colors.orange}
            />
            <Text style={styles.cardSectionTitle}>Overview</Text>
          </View>
          <Text style={styles.cardOverview} numberOfLines={2}>
            {trail.overview}
          </Text>
        </View>

        <CardRow icon="shapes-outline">
          <Text style={styles.cardRowLabel}>Shape: </Text>
          {trail.trail_shape}
        </CardRow>

        <CardRow icon="calendar-outline">
          <Text style={styles.cardRowLabel}>Open: </Text>
          {trail.typically_open}
        </CardRow>

        {!isLocked && hidden_point && (
          <CardRow icon="key-outline">
            <Text style={styles.cardRowLabel}>Keys: </Text>
            {hidden_point.keys_awarded}
            {'   '}
            <Icon name="trophy-outline" size={13} color="#CA8A04" />
            {'  '}
            <Text style={styles.cardRowLabel}>Points: </Text>
            {hidden_point.points_awarded}
          </CardRow>
        )}

        <TouchableOpacity onPress={() => onShowMore(trail)}>
          <Text style={styles.showMoreBtn}>Show More</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        {trail.user_trail_status === 'unlocked' && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnPrimary]}
            onPress={() => onViewOnMap(trail.id)}
          >
            <Icon name="location-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Verify</Text>
          </TouchableOpacity>
        )}

        {isLocked && !isUserParticipant && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnUnlock]}
            onPress={onJoinQuest}
          >
            <Icon name="ticket-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Join Quest</Text>
          </TouchableOpacity>
        )}

        {isLocked && isUserParticipant && canUnlock && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnUnlock]}
            onPress={() => onUnlock(trail)}
          >
            <Icon name="key-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Unlock</Text>
          </TouchableOpacity>
        )}

        {isLocked && isUserParticipant && !canUnlock && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.footerBtnOutline]}
            onPress={onJoinQuest}
          >
            <Icon name="add-circle-outline" size={15} color={Colors.blueGrey} />
            <Text style={styles.footerBtnOutlineText}>Buy More Keys</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrap: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  lockedImageBanner: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  lockedImageBannerText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    flex: 1,
  },
  cardTitleLocked: { fontStyle: 'italic', color: '#9AA0A6' },
  cardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: { fontFamily: Fonts.firaSansBold, fontSize: 11 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardRowIcon: { marginTop: 1 },
  cardRowText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
    flex: 1,
  },
  cardRowLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  cardSection: { gap: 4 },
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSectionTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  cardOverview: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
    lineHeight: 18,
  },
  showMoreBtn: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.orange,
    marginTop: 4,
  },
  cardDivider: { height: 1, backgroundColor: '#F0F0F0' },
  cardFooter: { padding: 14 },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  footerBtnPrimary: { backgroundColor: Colors.orange },
  footerBtnUnlock: { backgroundColor: '#D97706' },
  footerBtnOutline: { borderWidth: 1, borderColor: '#E9ECEF' },
  footerBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
  footerBtnOutlineText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
});
