'use client';

import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  // profile modal fields
  vehicle_type?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  rig_description?: string | null;
  about_me?: string | null;
};

type RankedUser = LeaderboardUser & { position: number };

// ---------------------------------------------------------------------------
// Mock data (replace with real API call)
// ---------------------------------------------------------------------------

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
    vehicle_type: 'Truck',
    make: 'Ford',
    model: 'Bronco',
    year: '2022',
    rig_description: 'Lifted 4" with 35s, ARB bumpers front and rear.',
    about_me: 'Obsessed with high-altitude trails and chasing sunsets from ridge lines.',
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
    vehicle_type: 'SUV',
    make: 'Toyota',
    model: '4Runner',
    year: '2021',
    rig_description: null,
    about_me: 'Desert trails and canyon runs are my happy place.',
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
    vehicle_type: 'Jeep',
    make: 'Jeep',
    model: 'Wrangler',
    year: '2020',
    rig_description: 'Full rock sliders, Dana 44 axle swaps, and 37" Terraflex.',
    about_me: null,
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
    vehicle_type: null,
    make: null,
    model: null,
    year: null,
    rig_description: null,
    about_me: 'Weekend explorer, lover of remote roads.',
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
    vehicle_type: null,
    make: null,
    model: null,
    year: null,
    rig_description: null,
    about_me: null,
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
    vehicle_type: null,
    make: null,
    model: null,
    year: null,
    rig_description: null,
    about_me: null,
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
    vehicle_type: null,
    make: null,
    model: null,
    year: null,
    rig_description: null,
    about_me: null,
  },
];

const MOCK_CURRENT_USER_ID = '3'; // simulate logged-in user

const REGIONS = [
  { id: 'all', name: 'All Regions' },
  { id: 'southwest', name: 'Southwest' },
  { id: 'rocky-mountain', name: 'Rocky Mountain' },
  { id: 'pacific', name: 'Pacific' },
];

// ---------------------------------------------------------------------------
// Medal colors
// ---------------------------------------------------------------------------

const MEDAL_COLORS: Record<number, string> = {
  1: '#F59E0B', // gold
  2: '#9CA3AF', // silver
  3: '#B45309', // bronze
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUserName(user: LeaderboardUser) {
  return user.alias ?? user.full_name ?? 'Quest Participant';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .join('');
}

function getCompletedTrailsText(count: number) {
  return count === 1 ? '1 Completed Trail' : `${count} Completed Trails`;
}

// ---------------------------------------------------------------------------
// Position badge
// ---------------------------------------------------------------------------

function PositionBadge({ position }: { position: number }) {
  const medalColor = MEDAL_COLORS[position];
  return (
    <View
      style={[
        styles.positionBadge,
        medalColor ? { backgroundColor: medalColor } : styles.positionBadgeDefault,
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

// ---------------------------------------------------------------------------
// UserProfileModal
// ---------------------------------------------------------------------------

function UserProfileModal({
  user,
  isOpen,
  onClose,
}: {
  user: RankedUser | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!user) return null;

  const name = getUserName(user);
  const initials = getInitials(name);
  const hasVehicle = user.vehicle_type || user.make || user.model || user.year || user.rig_description;

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScroll}
          >
            {/* Avatar */}
            <View style={styles.modalAvatarWrap}>
              <View style={styles.modalAvatarRing}>
                {user.profile_image_url ? (
                  <Image
                    source={{ uri: user.profile_image_url }}
                    style={styles.modalAvatarImg}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Name + location */}
            <Text style={styles.modalName}>{name}</Text>
            <Text style={styles.modalLocation}>
              {user.city || 'N/A'}, {user.state_abbreviation || 'N/A'}
            </Text>

            {/* Stats row */}
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>{user.points_earned.toLocaleString()}</Text>
                <Text style={styles.modalStatLabel}>Points</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>{user.trails_completed_count}</Text>
                <Text style={styles.modalStatLabel}>Completed Trails</Text>
              </View>
            </View>

            {/* Vehicle section */}
            {hasVehicle && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Vehicle</Text>
                <View style={styles.modalGrid}>
                  <Text style={styles.modalGridLabel}>Type</Text>
                  <Text style={styles.modalGridValue}>{user.vehicle_type || 'N/A'}</Text>

                  <Text style={styles.modalGridLabel}>Make</Text>
                  <Text style={styles.modalGridValue}>{user.make || 'N/A'}</Text>

                  <Text style={styles.modalGridLabel}>Model</Text>
                  <Text style={styles.modalGridValue}>{user.model || 'N/A'}</Text>

                  <Text style={styles.modalGridLabel}>Year</Text>
                  <Text style={styles.modalGridValue}>{user.year || 'N/A'}</Text>
                </View>
                {user.rig_description && (
                  <View style={styles.modalRigWrap}>
                    <Text style={styles.modalRigLabel}>Rig Description</Text>
                    <Text style={styles.modalRigText}>{user.rig_description}</Text>
                  </View>
                )}
              </View>
            )}

            {/* About Me section */}
            {user.about_me && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>About Me</Text>
                <Text style={styles.modalAboutText}>{user.about_me}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// UserRow
// ---------------------------------------------------------------------------

function UserRow({
  rankedUser,
  isCurrentUser,
  isLast,
  onPress,
}: {
  rankedUser: RankedUser;
  isCurrentUser: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
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
          medalColor ? { borderLeftWidth: 4, borderLeftColor: medalColor } : undefined,
        ]}
      >
        {/* Position badge */}
        <PositionBadge position={rankedUser.position} />

        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {rankedUser.profile_image_url ? (
            <Image source={{ uri: rankedUser.profile_image_url }} style={styles.avatarImg} />
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

        {/* Info */}
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

        {/* Points */}
        <View style={styles.pointsWrap}>
          <Text style={styles.points}>{rankedUser.points_earned.toLocaleString()} pts</Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function LeaderboardScreen() {
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedUser, setSelectedUser] = useState<RankedUser | null>(null);
  const isLoading = false; // replace with real loading state

  // Tie-aware position calculation (mirrors web logic)
  const usersWithPosition = useMemo<RankedUser[]>(() => {
    let position = 1;
    return MOCK_USERS.map((user, index) => {
      if (index > 0) {
        const prevRank = MOCK_USERS[index - 1].leaderboard_rank;
        const prevPosition = position;
        if (user.leaderboard_rank === prevRank) {
          position = prevPosition;
        } else {
          position = prevPosition + 1;
        }
      }
      return { ...user, position };
    });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Text style={styles.headerSub}>Top Questers</Text>
        </View>

        {/* Region filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region.id}
              style={[styles.chip, selectedRegion === region.id && styles.chipActive]}
              onPress={() => setSelectedRegion(region.id)}
            >
              <Text
                style={[styles.chipText, selectedRegion === region.id && styles.chipTextActive]}
              >
                {region.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Card title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Top Questers —{' '}
            {selectedRegion === 'all'
              ? 'All Regions'
              : REGIONS.find(r => r.id === selectedRegion)?.name ?? 'Selected Region'}
          </Text>

          <View style={styles.card}>
            {/* Loading state */}
            {isLoading && (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color={Colors.orange} />
                <Text style={styles.centeredStateText}>Loading Leaderboard...</Text>
              </View>
            )}

            {/* Empty state */}
            {!isLoading && usersWithPosition.length === 0 && (
              <View style={styles.centeredState}>
                <Text style={styles.centeredStateText}>
                  No users found for this region or selection.
                </Text>
              </View>
            )}

            {/* List */}
            {!isLoading &&
              usersWithPosition.map((rankedUser, index) => (
                <UserRow
                  key={rankedUser.user_id}
                  rankedUser={rankedUser}
                  isCurrentUser={rankedUser.user_id === MOCK_CURRENT_USER_ID}
                  isLast={index === usersWithPosition.length - 1}
                  onPress={() => setSelectedUser(rankedUser)}
                />
              ))}
          </View>
        </View>
      </ScrollView>

      <UserProfileModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 15,
    color: '#687076',
  },

  // Region chips
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  chipText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  chipTextActive: {
    color: '#fff',
    fontFamily: Fonts.firaSansBold,
  },

  // Section
  section: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // States
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  centeredStateText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowCurrentUser: {
    backgroundColor: 'rgba(242, 118, 32, 0.08)',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },

  // Position badge
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeDefault: {
    backgroundColor: '#EEF0F2',
  },
  positionBadgeText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#fff',
  },
  positionBadgeTextDefault: {
    color: '#687076',
  },

  // Avatar
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 15,
    color: Colors.blueGrey,
  },

  // Info
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 2,
  },
  youBadge: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: Colors.orange,
  },
  location: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  trailsText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 1,
  },

  // Points
  pointsWrap: {
    alignItems: 'flex-end',
  },
  points: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: Colors.orange,
  },

  // ---------------------------------------------------------------------------
  // Profile modal
  // ---------------------------------------------------------------------------
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Avatar
  modalAvatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: 2,
  },
  modalAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  modalAvatarPlaceholder: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
  },

  // Name / location
  modalName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 20,
    color: Colors.blueGrey,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalLocation: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Stats row
  modalStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  modalStatValue: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.orange,
    marginBottom: 2,
  },
  modalStatLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },

  // Section
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  // Vehicle grid
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  modalGridLabel: {
    width: '35%',
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: '#9AA0A6',
  },
  modalGridValue: {
    width: '65%',
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  modalRigWrap: {
    marginTop: 12,
  },
  modalRigLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: '#9AA0A6',
    marginBottom: 4,
  },
  modalRigText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
    lineHeight: 20,
  },

  // About
  modalAboutText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
    lineHeight: 20,
  },

  // Close button
  modalCloseBtn: {
    marginHorizontal: 24,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
});
