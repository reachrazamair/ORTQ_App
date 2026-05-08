import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { useExplorer } from '../../hooks/useExplorer';
import TrailCard from '../../components/explorer/TrailCard';
import FilterModal from '../../components/explorer/FilterModal';
import TrailDetailModal from '../../components/explorer/TrailDetailModal';
import JoinQuestModal from '../../components/explorer/JoinQuestModal';
import NoAccessLocation from '../../components/explorer/NoAccessLocation';
import { styles } from '../../styles/explorerStyles';
import { Trail } from '../../types/explorer';

export default function ExplorerScreen() {
  const navigation = useNavigation<any>();
  const {
    trails,
    variants,
    cities,
    userKeys,
    userId,
    userLat,
    userLon,
    isUserParticipant,
    activeQuests,
    showJoinQuest,
    hasLocation,
    loadingLocation,
    locationPermissionDenied,
    loadingTrails,
    totalCount,
    page,
    filters,
    showFilters,
    selectedTrail,
    hasAttemptedLoad,
    refreshing,
    hasMore,
    setShowJoinQuest,
    setShowFilters,
    setSelectedTrail,
    handleApplyFilters,
    handleStateChange,
    handleRefresh,
    handleLoadMore,
    handleUnlock,
    getLocation,
  } = useExplorer();

  const handleJoinQuest = useCallback(() => {
    if (!userId) {
      navigation.navigate('Profile');
      return;
    }
    setShowJoinQuest(true);
  }, [userId, navigation, setShowJoinQuest]);

  const renderTrail = useCallback(
    ({ item }: { item: Trail }) => (
      <TrailCard
        trail={item}
        variants={variants}
        userKeys={userKeys}
        isUserParticipant={isUserParticipant}
        activeQuests={activeQuests}
        onShowMore={t => setSelectedTrail(t)}
        onUnlock={handleUnlock}
        onJoinQuest={handleJoinQuest}
        onViewOnMap={trailId => navigation.navigate('Map', { trailId })}
      />
    ),
    [
      variants,
      userKeys,
      isUserParticipant,
      activeQuests,
      handleUnlock,
      handleJoinQuest,
      setSelectedTrail,
      navigation,
    ],
  );

  const isLoading = loadingLocation || loadingTrails;

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Explore Trails
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              Discover your next off-road adventure
            </Text>
          </View>
          <View style={styles.keysBadge}>
            <Icon name="key-outline" size={14} color={Colors.orange} />
            <Text style={styles.keysBadgeText}>{userKeys}</Text>
            <Text style={styles.keysBadgeLabel}>Keys</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setShowFilters(!showFilters)}
          activeOpacity={0.8}
        >
          <Icon
            name={showFilters ? 'close-circle-outline' : 'search-outline'}
            size={17}
            color="#fff"
          />
          <Text style={styles.searchBtnText}>
            {showFilters ? 'Hide Filters' : 'Search Trails'}
          </Text>
        </TouchableOpacity>
      </View>

      {!hasLocation && !loadingLocation && locationPermissionDenied && (
        <NoAccessLocation onSettings={() => Linking.openSettings()} />
      )}

      {!hasLocation && !loadingLocation && !locationPermissionDenied && (
        <View style={styles.noLocationWrap}>
          <Icon name="location-outline" size={48} color="#9AA0A6" />
          <Text style={styles.noLocationTitle}>Location is off</Text>
          <Text style={styles.noLocationBody}>
            Turn on your device location to discover nearby trails.
          </Text>
          <TouchableOpacity
            style={styles.noLocationBtn}
            onPress={() => getLocation()}
          >
            <Text style={styles.noLocationBtnText}>Turn On Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {loadingLocation && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>Detecting your location...</Text>
        </View>
      )}

      {hasLocation && loadingTrails && trails.length === 0 && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>Loading nearby trails...</Text>
        </View>
      )}

      {hasLocation && !isLoading && hasAttemptedLoad && trails.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="sad-outline" size={48} color="#9AA0A6" />
          <Text style={styles.emptyTitle}>No trails found</Text>
          <Text style={styles.emptyBody}>
            Try adjusting your filters to find your next adventure.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        style={styles.container}
        data={hasLocation && !loadingLocation ? trails : []}
        keyExtractor={item => item.id}
        renderItem={renderTrail}
        ListHeaderComponent={ListHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator
              size="small"
              color={Colors.orange}
              style={{ paddingVertical: 20 }}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <FilterModal
        visible={showFilters}
        variants={variants}
        cities={cities}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilters(false)}
        onStateChange={handleStateChange}
      />

      <TrailDetailModal
        trail={selectedTrail}
        variants={variants}
        visible={!!selectedTrail}
        onClose={() => setSelectedTrail(null)}
      />

      <JoinQuestModal
        visible={showJoinQuest}
        quests={activeQuests}
        userId={userId}
        onClose={() => setShowJoinQuest(false)}
      />
    </SafeAreaView>
  );
}
