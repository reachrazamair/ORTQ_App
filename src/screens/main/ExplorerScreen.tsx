import React, { useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrailStatus = 'locked' | 'unlocked' | 'completed';

type HiddenPoint = {
  latitude: number;
  longitude: number;
  keys_awarded: number;
  points_awarded: number;
};

type Trail = {
  id: string;
  name: string;
  image_url: string;
  user_trail_status: TrailStatus;
  trail_types: Array<{ name: string; color: string }>;
  difficulty: string;
  difficulty_color: string;
  city: string;
  state: string;
  distance_meters: number | null;
  vehicle_types: string[];
  overview: string;
  permit_requierd: string | null;
  trail_shape: string;
  typically_open: string;
  distance_tolerance: number;
  navigation_details: string | null;
  keys_to_unlock: number;
  hidden_point: HiddenPoint | null;
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_TRAILS: Trail[] = [
  {
    id: '1',
    name: 'Black Bear Pass',
    image_url: 'https://picsum.photos/seed/trail1/600/300',
    user_trail_status: 'completed',
    trail_types: [{ name: 'Rock Crawling', color: '#7C3AED' }],
    difficulty: 'Expert',
    difficulty_color: '#DC2626',
    city: 'Telluride',
    state: 'CO',
    distance_meters: 4800,
    vehicle_types: ['4x4', 'High Clearance'],
    overview:
      'One of the most infamous trails in Colorado. Black Bear Pass offers stunning views of Telluride and a technical descent that challenges even experienced off-roaders.',
    permit_requierd: null,
    trail_shape: 'Point to Point',
    typically_open: 'July – September',
    distance_tolerance: 50,
    navigation_details:
      'From Telluride, head south on Hwy 145. Turn at the Black Bear Pass sign. The descent is one-way — do not attempt in poor weather.',
    keys_to_unlock: 2,
    hidden_point: { latitude: 37.9358, longitude: -107.8123, keys_awarded: 3, points_awarded: 500 },
  },
  {
    id: '2',
    name: 'Moab Rim Trail',
    image_url: 'https://picsum.photos/seed/trail2/600/300',
    user_trail_status: 'unlocked',
    trail_types: [
      { name: 'Rock Crawling', color: '#7C3AED' },
      { name: 'Scenic', color: '#059669' },
    ],
    difficulty: 'Hard',
    difficulty_color: '#D97706',
    city: 'Moab',
    state: 'UT',
    distance_meters: 9600,
    vehicle_types: ['4x4', 'Jeep', 'SUV'],
    overview:
      'The Moab Rim Trail offers challenging rock crawling with breathtaking views of the Colorado River. A must-do for serious off-roaders visiting Moab.',
    permit_requierd: 'https://www.recreation.gov/permits/moab',
    trail_shape: 'Loop',
    typically_open: 'March – November',
    distance_tolerance: 75,
    navigation_details:
      'Trailhead is located on Kane Creek Blvd. The first obstacle is a steep ledge climb. Lockers recommended.',
    keys_to_unlock: 1,
    hidden_point: {
      latitude: 38.5733,
      longitude: -109.5498,
      keys_awarded: 2,
      points_awarded: 350,
    },
  },
  {
    id: '3',
    name: 'Rubicon Trail',
    image_url: 'https://picsum.photos/seed/trail3/600/300',
    user_trail_status: 'locked',
    trail_types: [{ name: 'Rock Crawling', color: '#7C3AED' }],
    difficulty: 'Expert',
    difficulty_color: '#DC2626',
    city: 'Georgetown',
    state: 'CA',
    distance_meters: 22500,
    vehicle_types: ['4x4', 'High Clearance'],
    overview:
      'The legendary Rubicon Trail is considered one of the most challenging off-road trails in the US. This 22-mile adventure through the Sierra Nevada is iconic.',
    permit_requierd: null,
    trail_shape: 'Point to Point',
    typically_open: 'July – October',
    distance_tolerance: 100,
    navigation_details: null,
    keys_to_unlock: 3,
    hidden_point: null,
  },
  {
    id: '4',
    name: 'Imogene Pass',
    image_url: 'https://picsum.photos/seed/trail4/600/300',
    user_trail_status: 'locked',
    trail_types: [
      { name: 'Scenic', color: '#059669' },
      { name: 'High Altitude', color: '#0284C7' },
    ],
    difficulty: 'Moderate',
    difficulty_color: '#CA8A04',
    city: 'Ouray',
    state: 'CO',
    distance_meters: 6400,
    vehicle_types: ['4x4', 'SUV', 'Truck'],
    overview:
      'Imogene Pass connects Ouray and Telluride at 13,114 feet. The views are spectacular and the drive is manageable for most 4x4 vehicles.',
    permit_requierd: null,
    trail_shape: 'Point to Point',
    typically_open: 'July – September',
    distance_tolerance: 60,
    navigation_details: null,
    keys_to_unlock: 1,
    hidden_point: null,
  },
  {
    id: '5',
    name: 'Fins & Things',
    image_url: 'https://picsum.photos/seed/trail5/600/300',
    user_trail_status: 'locked',
    trail_types: [
      { name: 'Rock Crawling', color: '#7C3AED' },
      { name: 'Sand', color: '#B45309' },
    ],
    difficulty: 'Hard',
    difficulty_color: '#D97706',
    city: 'Moab',
    state: 'UT',
    distance_meters: 11200,
    vehicle_types: ['4x4', 'Jeep'],
    overview:
      'Fins & Things is a classic Moab trail offering a variety of slickrock obstacles, ledges, and scenic desert terrain. Great for intermediate to advanced drivers.',
    permit_requierd: null,
    trail_shape: 'Loop',
    typically_open: 'Year Round',
    distance_tolerance: 80,
    navigation_details: null,
    keys_to_unlock: 2,
    hidden_point: null,
  },
];

const STATUS_FILTERS = ['All', 'locked', 'unlocked', 'completed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const MOCK_USER_KEYS = 4;
const HAS_LOCATION = true; // set false to preview no-location state

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metersToMiles(meters: number) {
  return meters / 1609.344;
}

function getStatusColor(status: TrailStatus) {
  if (status === 'completed') return Colors.green;
  if (status === 'unlocked') return '#3B82F6';
  return '#9AA0A6';
}

function getStatusIconName(status: TrailStatus) {
  if (status === 'completed') return 'checkmark-circle';
  if (status === 'unlocked') return 'lock-open';
  return 'lock-closed';
}

function getContrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1C1C1C' : '#FFFFFF';
}

// ---------------------------------------------------------------------------
// No Access Location
// ---------------------------------------------------------------------------

function NoAccessLocation() {
  return (
    <View style={styles.noLocationWrap}>
      <Icon name="location-outline" size={48} color="#9AA0A6" />
      <Text style={styles.noLocationTitle}>We need your location</Text>
      <Text style={styles.noLocationBody}>
        To show nearby trails, allow location access or add your address in Profile.
      </Text>
      <TouchableOpacity style={styles.noLocationBtn}>
        <Text style={styles.noLocationBtnText}>Add Address in Profile</Text>
      </TouchableOpacity>
      <Text style={styles.noLocationNote}>We never sell your data.</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trail Detail Modal
// ---------------------------------------------------------------------------

function TrailDetailModal({
  trail,
  visible,
  onClose,
}: {
  trail: Trail | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!trail) return null;

  const isLocked = trail.user_trail_status === 'locked';
  const { hidden_point } = trail;

  const handleOpenMaps = () => {
    if (!hidden_point) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${hidden_point.latitude},${hidden_point.longitude}`;
    Linking.openURL(url);
  };

  const handleCopyCoords = () => {
    if (!hidden_point) return;
    Alert.alert('Copied', `${hidden_point.latitude.toFixed(4)}, ${hidden_point.longitude.toFixed(4)}`);
  };

  const handleOpenPermit = () => {
    if (trail.permit_requierd && trail.permit_requierd.startsWith('http')) {
      Linking.openURL(trail.permit_requierd);
    }
  };

  const isPermitUrl =
    trail.permit_requierd && trail.permit_requierd.startsWith('http');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.detailSheet}>
          {/* Image */}
          <View style={styles.detailImageWrap}>
            <Image source={{ uri: trail.image_url }} style={styles.detailImage} />
            {isLocked && (
              <View style={styles.detailImageOverlay}>
                <Icon name="lock-closed" size={40} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            {/* Close button */}
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Icon name="close" size={20} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScroll}
          >
            {/* Title + status */}
            <View style={styles.detailTitleRow}>
              <Text style={[styles.detailTitle, isLocked && styles.detailTitleLocked]}>
                {isLocked ? 'Locked Trail — Unlock for Details' : trail.name}
              </Text>
              <Icon
                name={getStatusIconName(trail.user_trail_status)}
                size={20}
                color={getStatusColor(trail.user_trail_status)}
              />
            </View>

            {/* Badges */}
            <View style={styles.detailBadgeRow}>
              {trail.trail_types.map(tt => (
                <View
                  key={tt.name}
                  style={[styles.badge, { backgroundColor: tt.color }]}
                >
                  <Icon name="triangle-outline" size={11} color={getContrastColor(tt.color)} />
                  <Text style={[styles.badgeText, { color: getContrastColor(tt.color) }]}>
                    {tt.name}
                  </Text>
                </View>
              ))}
              <View style={[styles.badge, { backgroundColor: trail.difficulty_color }]}>
                <Icon name="flash-outline" size={11} color={getContrastColor(trail.difficulty_color)} />
                <Text style={[styles.badgeText, { color: getContrastColor(trail.difficulty_color) }]}>
                  {trail.difficulty}
                </Text>
              </View>
            </View>

            {/* Info rows */}
            <DetailRow icon="location-outline" color={Colors.orange}>
              {trail.city}, {trail.state}
            </DetailRow>

            {trail.distance_meters !== null && (
              <DetailRow icon="compass-outline" color={Colors.orange}>
                Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)} miles away
              </DetailRow>
            )}

            {trail.vehicle_types.length > 0 && (
              <DetailRow icon="car-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Vehicles: </Text>
                {trail.vehicle_types.join(', ')}
              </DetailRow>
            )}

            <View style={styles.detailSection}>
              <View style={styles.detailSectionHeader}>
                <Icon name="document-text-outline" size={16} color={Colors.orange} />
                <Text style={styles.detailSectionTitle}>Overview</Text>
              </View>
              <Text style={styles.detailBody}>{trail.overview}</Text>
            </View>

            {!isLocked && trail.permit_requierd && (
              <DetailRow icon="ticket-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Permit: </Text>
                {isPermitUrl ? (
                  <TouchableOpacity onPress={handleOpenPermit}>
                    <Text style={styles.detailLink}>Required — View Details</Text>
                  </TouchableOpacity>
                ) : (
                  trail.permit_requierd
                )}
              </DetailRow>
            )}

            <DetailRow icon="shapes-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Shape: </Text>
              {trail.trail_shape}
            </DetailRow>

            <DetailRow icon="calendar-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Open: </Text>
              {trail.typically_open}
            </DetailRow>

            {!isLocked && (
              <DetailRow icon="radio-button-on-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Tolerance: </Text>
                {trail.distance_tolerance} m
              </DetailRow>
            )}

            {!isLocked && hidden_point && (
              <DetailRow icon="key-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Keys: </Text>
                {hidden_point.keys_awarded}
                {'   '}
                <Icon name="trophy-outline" size={14} color="#CA8A04" />
                {'  '}
                <Text style={styles.detailLabel}>Points: </Text>
                {hidden_point.points_awarded}
              </DetailRow>
            )}

            {!isLocked && hidden_point && (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Icon name="globe-outline" size={16} color={Colors.orange} />
                  <Text style={styles.detailSectionTitle}>Points Location</Text>
                </View>
                <View style={styles.coordsRow}>
                  <TouchableOpacity onPress={handleOpenMaps} style={{ flex: 1 }}>
                    <Text style={styles.detailLink}>
                      {hidden_point.latitude.toFixed(4)}, {hidden_point.longitude.toFixed(4)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCoords}>
                    <Icon name="copy-outline" size={16} color={Colors.blueGrey} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isLocked && trail.navigation_details && (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Icon name="map-outline" size={16} color={Colors.orange} />
                  <Text style={styles.detailSectionTitle}>Navigation Tips</Text>
                </View>
                <Text style={styles.detailBody}>{trail.navigation_details}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  color,
  children,
}: {
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={16} color={color} style={styles.detailRowIcon} />
      <Text style={styles.detailRowText}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Trail Card
// ---------------------------------------------------------------------------

function TrailCard({
  trail,
  onShowMore,
}: {
  trail: Trail;
  onShowMore: (trail: Trail) => void;
}) {
  const isLocked = trail.user_trail_status === 'locked';
  const { hidden_point } = trail;
  const canUnlock = MOCK_USER_KEYS >= trail.keys_to_unlock;

  const handleOpenMaps = () => {
    if (!hidden_point) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${hidden_point.latitude},${hidden_point.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: trail.image_url }} style={styles.cardImage} />
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

      {/* Header */}
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

      {/* Badges */}
      <View style={styles.cardBadgeRow}>
        {trail.trail_types.map(tt => (
          <View key={tt.name} style={[styles.badge, { backgroundColor: tt.color }]}>
            <Icon name="triangle-outline" size={10} color={getContrastColor(tt.color)} />
            <Text style={[styles.badgeText, { color: getContrastColor(tt.color) }]}>
              {tt.name}
            </Text>
          </View>
        ))}
        <View style={[styles.badge, { backgroundColor: trail.difficulty_color }]}>
          <Icon
            name="flash-outline"
            size={10}
            color={getContrastColor(trail.difficulty_color)}
          />
          <Text
            style={[styles.badgeText, { color: getContrastColor(trail.difficulty_color) }]}
          >
            {trail.difficulty}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <CardRow icon="location-outline">
          {trail.city}, {trail.state}
        </CardRow>

        {trail.distance_meters !== null && (
          <CardRow icon="compass-outline">
            Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)} miles away
          </CardRow>
        )}

        {trail.vehicle_types.length > 0 && (
          <CardRow icon="car-outline">
            <Text style={styles.cardRowLabel}>Vehicles: </Text>
            {trail.vehicle_types.join(', ')}
          </CardRow>
        )}

        {/* Overview */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Icon name="document-text-outline" size={14} color={Colors.orange} />
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

        {!isLocked && hidden_point && (
          <View style={styles.cardSection}>
            <View style={styles.cardSectionHeader}>
              <Icon name="globe-outline" size={14} color={Colors.orange} />
              <Text style={styles.cardSectionTitle}>Points Location</Text>
            </View>
            <TouchableOpacity onPress={handleOpenMaps}>
              <Text style={[styles.cardOverview, styles.detailLink]}>
                {hidden_point.latitude.toFixed(4)}, {hidden_point.longitude.toFixed(4)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLocked && trail.navigation_details && (
          <View style={styles.cardSection}>
            <View style={styles.cardSectionHeader}>
              <Icon name="map-outline" size={14} color={Colors.orange} />
              <Text style={styles.cardSectionTitle}>Navigation Tips</Text>
            </View>
            <Text style={styles.cardOverview} numberOfLines={2}>
              {trail.navigation_details}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={() => onShowMore(trail)}>
          <Text style={styles.showMoreBtn}>Show More</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Footer actions */}
      <View style={styles.cardFooter}>
        {trail.user_trail_status === 'completed' && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary]}>
            <Icon name="location-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>View on Map</Text>
          </TouchableOpacity>
        )}

        {trail.user_trail_status === 'unlocked' && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary]}>
            <Icon name="location-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Verify Location</Text>
          </TouchableOpacity>
        )}

        {isLocked && canUnlock && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnUnlock]}>
            <Icon name="key-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>
              Unlock Trail ({trail.keys_to_unlock} Key{trail.keys_to_unlock > 1 ? 's' : ''})
            </Text>
          </TouchableOpacity>
        )}

        {isLocked && !canUnlock && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnOutline]}>
            <Icon name="add-circle-outline" size={15} color={Colors.blueGrey} />
            <Text style={styles.footerBtnOutlineText}>Buy More Keys</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function CardRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.cardRow}>
      <Icon name={icon} size={14} color={Colors.orange} style={styles.cardRowIcon} />
      <Text style={styles.cardRowText}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

function FilterSection({
  selectedStatus,
  onStatusChange,
}: {
  selectedStatus: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
}) {
  return (
    <View style={styles.filterWrap}>
      <Text style={styles.filterLabel}>Trail Status</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, selectedStatus === s && styles.chipActive]}
            onPress={() => onStatusChange(s)}
          >
            <Text
              style={[styles.chipText, selectedStatus === s && styles.chipTextActive]}
            >
              {s === 'All' ? 'Any Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ExplorerScreen() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('All');
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const isLoading = false;

  const filteredTrails = useMemo(() => {
    if (selectedStatus === 'All') return MOCK_TRAILS;
    return MOCK_TRAILS.filter(t => t.user_trail_status === selectedStatus);
  }, [selectedStatus]);

  const renderTrail = useCallback(
    ({ item }: { item: Trail }) => (
      <TrailCard trail={item} onShowMore={t => setSelectedTrail(t)} />
    ),
    [],
  );

  const ListHeader = (
    <View>
      {/* Header card */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Explore Trails</Text>
            <Text style={styles.headerSubtitle}>Discover your next off-road adventure</Text>
          </View>
          <View style={styles.keysBadge}>
            <Icon name="key-outline" size={14} color={Colors.orange} />
            <Text style={styles.keysBadgeText}>{MOCK_USER_KEYS}</Text>
            <Text style={styles.keysBadgeLabel}>Keys</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setShowFilters(p => !p)}
          activeOpacity={0.8}
        >
          <Icon name={showFilters ? 'close-circle-outline' : 'search-outline'} size={17} color="#fff" />
          <Text style={styles.searchBtnText}>
            {showFilters ? 'Hide Filters' : 'Search Trails'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible filter */}
      {showFilters && (
        <FilterSection
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />
      )}

      {/* No location state */}
      {!HAS_LOCATION && !isLoading && <NoAccessLocation />}

      {/* Empty state */}
      {HAS_LOCATION && filteredTrails.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Icon name="sad-outline" size={48} color="#9AA0A6" />
          <Text style={styles.emptyTitle}>No trails found</Text>
          <Text style={styles.emptyBody}>
            Try adjusting your search filters to find your next adventure.
          </Text>
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.loadingText}>Loading nearby trails...</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        style={styles.container}
        data={HAS_LOCATION && !isLoading ? filteredTrails : []}
        keyExtractor={item => item.id}
        renderItem={renderTrail}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          HAS_LOCATION && filteredTrails.length > 0 && !isLoading ? (
            <View style={styles.loadMoreWrap}>
              <TouchableOpacity style={styles.loadMoreBtn}>
                <Text style={styles.loadMoreText}>Load More Trails</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <TrailDetailModal
        trail={selectedTrail}
        visible={!!selectedTrail}
        onClose={() => setSelectedTrail(null)}
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
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingBottom: 40,
  },

  // Header card
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleGroup: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 26,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },
  keysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF4EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE0C2',
  },
  keysBadgeText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
  },
  keysBadgeLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 12,
  },
  searchBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },

  // Filter section
  filterWrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  filterChips: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
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

  // States
  noLocationWrap: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  noLocationTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  noLocationBtn: {
    backgroundColor: Colors.blueGrey,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  noLocationBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
  noLocationNote: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
  },

  // Trail card
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageWrap: {
    height: 180,
    width: '100%',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  lockedImageBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
  },
  lockedImageBannerText: {
    color: '#fff',
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    letterSpacing: 2.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
  },
  cardTitleLocked: {
    color: '#9AA0A6',
  },
  cardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 11,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardRowIcon: {
    marginRight: 6,
  },
  cardRowText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  cardRowLabel: {
    fontFamily: Fonts.firaSansBold,
    color: Colors.blueGrey,
  },
  cardSection: {
    marginTop: 4,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  cardSectionTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  cardOverview: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  showMoreBtn: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 12,
    color: Colors.blueGrey,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 12,
  },
  cardFooter: {
    padding: 14,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  footerBtnPrimary: {
    backgroundColor: Colors.blueGrey,
  },
  footerBtnUnlock: {
    backgroundColor: Colors.orange,
  },
  footerBtnOutline: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: 'transparent',
  },
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

  // Load more
  loadMoreWrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  loadMoreBtn: {
    backgroundColor: '#F6B223',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: '#1C1C1C',
  },

  // Trail detail modal
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  detailImageWrap: {
    height: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 8,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  detailTitle: {
    flex: 1,
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  detailTitleLocked: {
    fontStyle: 'italic',
  },
  detailBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRowIcon: {
    marginRight: 8,
  },
  detailRowText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  detailLabel: {
    fontFamily: Fonts.firaSansBold,
    color: Colors.blueGrey,
  },
  detailSection: {
    marginTop: 4,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailSectionTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  detailBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
  detailLink: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#3B82F6',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
