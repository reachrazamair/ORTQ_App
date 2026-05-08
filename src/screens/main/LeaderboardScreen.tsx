import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '../../theme/colors';
import { styles } from '../../styles/leaderboardStyles';
import { useLeaderboard } from '../../hooks/useLeaderboard';

// Extracted Components
import { UserRow } from '../../components/leaderboard/LeaderboardItem';
import UserProfileModal from '../../components/leaderboard/UserProfileModal';

export default function LeaderboardScreen() {
  const {
    selectedRegion,
    setSelectedRegion,
    selectedUser,
    setSelectedUser,
    users,
    regions,
    currentUserId,
    isLoading,
    refreshing,
    initialized,
    handleRefresh,
  } = useLeaderboard();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
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
          {initialized &&
            [{ id: 'all', name: 'All Regions' }, ...regions].map(region => (
              <TouchableOpacity
                key={region.id}
                style={[
                  styles.chip,
                  selectedRegion === region.id && styles.chipActive,
                ]}
                onPress={() => setSelectedRegion(region.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedRegion === region.id && styles.chipTextActive,
                  ]}
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
              : regions.find(r => r.id === selectedRegion)?.name ??
                'Selected Region'}
          </Text>

          <View style={styles.card}>
            {/* Loading state */}
            {isLoading && (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color={Colors.orange} />
                <Text style={styles.centeredStateText}>Loading Ranks...</Text>
              </View>
            )}

            {/* Empty state */}
            {!isLoading && users.length === 0 && (
              <View style={styles.centeredState}>
                <Text style={styles.centeredStateText}>
                  No users found for this region or selection.
                </Text>
              </View>
            )}

            {/* List */}
            {!isLoading &&
              users.map((rankedUser, index) => (
                <UserRow
                  key={rankedUser.user_id}
                  rankedUser={rankedUser}
                  isCurrentUser={rankedUser.user_id === currentUserId}
                  isLast={index === users.length - 1}
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
