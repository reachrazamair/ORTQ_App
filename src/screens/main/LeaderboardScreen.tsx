import React, { useState } from 'react';
import {
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

type LeaderboardUser = {
  user_id: string;
  full_name: string;
  alias: string | null;
  leaderboard_rank: number;
  points_earned: number;
  trails_completed_count: number;
  city: string;
  state_abbreviation: string;
  profile_image_url: string | null;
};

const MOCK_USERS: LeaderboardUser[] = [
  {
    user_id: '1',
    full_name: 'Jake Morrison',
    alias: 'TrailBlazer',
    leaderboard_rank: 1,
    points_earned: 4850,
    trails_completed_count: 32,
    city: 'Denver',
    state_abbreviation: 'CO',
    profile_image_url: null,
  },
  {
    user_id: '2',
    full_name: 'Sarah Kim',
    alias: 'DesertRider',
    leaderboard_rank: 2,
    points_earned: 4210,
    trails_completed_count: 28,
    city: 'Phoenix',
    state_abbreviation: 'AZ',
    profile_image_url: null,
  },
  {
    user_id: '3',
    full_name: 'Marcus Webb',
    alias: 'MudKing',
    leaderboard_rank: 3,
    points_earned: 3980,
    trails_completed_count: 25,
    city: 'Salt Lake City',
    state_abbreviation: 'UT',
    profile_image_url: null,
  },
  {
    user_id: '4',
    full_name: 'Aliya Nasser',
    alias: null,
    leaderboard_rank: 4,
    points_earned: 3450,
    trails_completed_count: 22,
    city: 'Boise',
    state_abbreviation: 'ID',
    profile_image_url: null,
  },
  {
    user_id: '5',
    full_name: 'Chris Delgado',
    alias: 'HighClearance',
    leaderboard_rank: 5,
    points_earned: 3100,
    trails_completed_count: 20,
    city: 'Albuquerque',
    state_abbreviation: 'NM',
    profile_image_url: null,
  },
  {
    user_id: '6',
    full_name: 'Priya Patel',
    alias: 'RockyRider',
    leaderboard_rank: 6,
    points_earned: 2870,
    trails_completed_count: 18,
    city: 'Tucson',
    state_abbreviation: 'AZ',
    profile_image_url: null,
  },
  {
    user_id: '7',
    full_name: 'Tom Erikson',
    alias: 'IronWheels',
    leaderboard_rank: 7,
    points_earned: 2540,
    trails_completed_count: 16,
    city: 'Reno',
    state_abbreviation: 'NV',
    profile_image_url: null,
  },
];

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const REGIONS = ['All Regions', 'Southwest', 'Rocky Mountain', 'Pacific'];

const displayName = (user: LeaderboardUser) => user.alias ?? user.full_name;

const getInitials = (user: LeaderboardUser) =>
  displayName(user).charAt(0).toUpperCase();

function PodiumCard({
  user,
  position,
}: {
  user: LeaderboardUser;
  position: number;
}) {
  const isFirst = position === 0;
  return (
    <View style={[styles.podiumCard, isFirst && styles.podiumCardFirst]}>
      <View
        style={[
          styles.podiumAvatar,
          isFirst && styles.podiumAvatarFirst,
          { borderColor: MEDAL_COLORS[position] },
        ]}
      >
        {user.profile_image_url ? (
          <Image
            source={{ uri: user.profile_image_url }}
            style={styles.podiumAvatarImg}
          />
        ) : (
          <Text
            style={[styles.podiumInitial, isFirst && styles.podiumInitialFirst]}
          >
            {getInitials(user)}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.medalBadge,
          { backgroundColor: MEDAL_COLORS[position] },
        ]}
      >
        <Text style={styles.medalText}>{position + 1}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>
        {displayName(user)}
      </Text>
      <Text style={styles.podiumPoints}>
        {user.points_earned.toLocaleString()} pts
      </Text>
    </View>
  );
}

function RankRow({ user, isMe }: { user: LeaderboardUser; isMe: boolean }) {
  return (
    <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
      <Text style={[styles.rankNumber, isMe && styles.rankNumberMe]}>
        #{user.leaderboard_rank}
      </Text>

      <View style={styles.rankAvatar}>
        {user.profile_image_url ? (
          <Image
            source={{ uri: user.profile_image_url }}
            style={styles.rankAvatarImg}
          />
        ) : (
          <View
            style={[
              styles.rankAvatarPlaceholder,
              isMe && styles.rankAvatarPlaceholderMe,
            ]}
          >
            <Text style={styles.rankAvatarInitial}>{getInitials(user)}</Text>
          </View>
        )}
      </View>

      <View style={styles.rankInfo}>
        <Text style={[styles.rankName, isMe && styles.rankNameMe]} numberOfLines={1}>
          {displayName(user)}
        </Text>
        <Text style={styles.rankLocation}>
          {user.city}, {user.state_abbreviation}
        </Text>
      </View>

      <View style={styles.rankStats}>
        <Text style={[styles.rankPoints, isMe && styles.rankPointsMe]}>
          {user.points_earned.toLocaleString()}
          <Text style={styles.rankPtLabel}> pts</Text>
        </Text>
        <Text style={styles.rankTrails}>
          {user.trails_completed_count} trails
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const [selectedRegion, setSelectedRegion] = useState('All Regions');

  const topThree = MOCK_USERS.slice(0, 3);
  const rest = MOCK_USERS.slice(3);

  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = [topThree[1], topThree[0], topThree[2]];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <Text style={styles.headerSub}>Top explorers this season</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Region filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region}
              style={[
                styles.filterChip,
                selectedRegion === region && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRegion(region)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedRegion === region && styles.filterChipTextActive,
                ]}
              >
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Podium — top 3 */}
        <View style={styles.podium}>
          {podiumOrder.map((user, i) => {
            const originalIndex = topThree.indexOf(user);
            return (
              <PodiumCard key={user.user_id} user={user} position={originalIndex} />
            );
          })}
        </View>

        {/* Rank list — 4th onwards */}
        <View style={styles.rankList}>
          <Text style={styles.rankListTitle}>Rankings</Text>
          {rest.map(user => (
            <RankRow key={user.user_id} user={user} isMe={false} />
          ))}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    backgroundColor: Colors.blueGrey,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: '#fff',
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },

  // Region filter
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  filterChipText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  filterChipTextActive: {
    color: '#fff',
    fontFamily: Fonts.firaSansBold,
  },

  // Podium
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  podiumCardFirst: {
    paddingTop: 24,
    shadowOpacity: 0.1,
    elevation: 6,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  podiumAvatarFirst: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
  },
  podiumAvatarImg: {
    width: '100%',
    height: '100%',
  },
  podiumInitial: {
    fontFamily: Fonts.gothamBold,
    fontSize: 22,
    color: Colors.blueGrey,
  },
  podiumInitialFirst: {
    fontSize: 28,
  },
  medalBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  medalText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#fff',
  },
  podiumName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: Colors.blueGrey,
    textAlign: 'center',
    marginBottom: 4,
  },
  podiumPoints: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: Colors.orange,
  },

  // Rank list
  rankList: {
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  rankListTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  rankRowMe: {
    backgroundColor: '#FFF8F3',
  },
  rankNumber: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#9AA0A6',
    width: 28,
  },
  rankNumberMe: {
    color: Colors.orange,
  },
  rankAvatar: {
    width: 40,
    height: 40,
  },
  rankAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rankAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankAvatarPlaceholderMe: {
    backgroundColor: Colors.orange,
  },
  rankAvatarInitial: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 2,
  },
  rankNameMe: {
    color: Colors.orange,
  },
  rankLocation: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  rankStats: {
    alignItems: 'flex-end',
  },
  rankPoints: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  rankPointsMe: {
    color: Colors.orange,
  },
  rankPtLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  rankTrails: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },

  bottomPad: {
    height: 32,
  },
});
