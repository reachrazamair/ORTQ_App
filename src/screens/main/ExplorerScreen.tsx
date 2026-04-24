import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/profile';
import { downloadOfflinePack, deleteOfflinePack } from '../../lib/offlineMap';
import { saveTrailToCache, getCachedTrails } from '../../lib/trailCache';
import { emitTrailUnlocked, onTrailCompleted } from '../../lib/trailEvents';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;
const STORAGE_BASE = `${Config.SUPABASE_URL}/storage/v1/object/public/trails_images/`;
const DISTANCE_OPTIONS = [50, 100, 150, 200, 250, 300, 350, 400];
const STATUS_OPTIONS = ['All', 'locked', 'unlocked'] as const;

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

// Matches what get_trails_nearby_paginated actually returns
type Trail = {
  id: string;
  name: string;
  image_url: string | null;
  user_trail_status: TrailStatus;
  trail_types: string[];
  difficulty: string;
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

type Variant = { id: string; name: string; color: string };
type BaseVariant = { id: string; name: string };
type CityVariant = { id: string; name: string; latitude: number | null; longitude: number | null };

type Quest = {
  id: string;
  title: string;
  description: string;
  price: number;
  keys_provided: number;
  start_date: string;
  end_date: string;
  status: string;
};

type Variants = {
  trail_types: Variant[];
  difficulty_levels: Variant[];
  states: BaseVariant[];
};

type Filters = {
  stateId: string | null;
  cityId: string | null;
  cityLat: number | null;
  cityLon: number | null;
  difficultyId: string | null;
  trailTypeId: string | null;
  status: string | null;
  distanceMeters: number | null;
};

const DEFAULT_FILTERS: Filters = {
  stateId: null,
  cityId: null,
  cityLat: null,
  cityLon: null,
  difficultyId: null,
  trailTypeId: null,
  status: null,
  distanceMeters: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metersToMiles(m: number) {
  return m / 1609.344;
}

function milesToMeters(miles: number) {
  return Math.round(miles * 1609.344);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrailImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return 'https://placehold.co/600x300/e2e8f0/94a3b8?text=Trail';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${STORAGE_BASE}${imageUrl}`;
}

function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '#fff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1C1C1C' : '#FFFFFF';
}

function getStatusColor(status: TrailStatus) {
  if (status === 'completed') return '#22C55E';
  if (status === 'unlocked') return '#3B82F6';
  return '#9AA0A6';
}

function getStatusIconName(status: TrailStatus) {
  if (status === 'completed') return 'checkmark-circle';
  if (status === 'unlocked') return 'lock-open';
  return 'lock-closed';
}

function getTrailTypeColor(name: string, variants: Variants): string {
  return variants.trail_types.find(t => t.name.toLowerCase() === name.toLowerCase())?.color ?? '#9AA0A6';
}

function getDifficultyColor(name: string, variants: Variants): string {
  return variants.difficulty_levels.find(d => d.name.toLowerCase() === name.toLowerCase())?.color ?? '#9AA0A6';
}

// ---------------------------------------------------------------------------
// Location helpers
// ---------------------------------------------------------------------------

async function requestAndroidLocationPermission(): Promise<boolean> {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'ORTQ needs your location to show nearby trails.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NoAccessLocation({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.noLocationWrap}>
      <Icon name="location-outline" size={48} color="#9AA0A6" />
      <Text style={styles.noLocationTitle}>We need your location</Text>
      <Text style={styles.noLocationBody}>
        To show nearby trails, allow location access or enable it in Settings.
      </Text>
      <TouchableOpacity style={styles.noLocationBtn} onPress={onSettings}>
        <Text style={styles.noLocationBtnText}>Open Settings</Text>
      </TouchableOpacity>
      <Text style={styles.noLocationNote}>We never sell your data.</Text>
    </View>
  );
}

function DetailRow({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={16} color={color} style={styles.detailRowIcon} />
      <Text style={styles.detailRowText}>{children}</Text>
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
// Join Quest Modal
// ---------------------------------------------------------------------------

function JoinQuestModal({
  visible,
  quests,
  onClose,
}: {
  visible: boolean;
  quests: Quest[];
  onClose: () => void;
}) {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');

  const handleClose = () => {
    setSelectedQuestId(null);
    setPromoCode('');
    setPromoError('');
    onClose();
  };

  const handleConfirmPurchase = () => {
    if (!selectedQuestId) {
      Alert.alert('No Quest Selected', 'Please select a quest to join.');
      return;
    }
    Alert.alert('Payment', 'Stripe payment integration coming soon.');
    handleClose();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.filterOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="ticket-outline" size={20} color={Colors.orange} />
              <Text style={styles.filterTitle}>Join a Quest</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Text style={styles.joinQuestSubtitle}>Select an available quest to begin your adventure.</Text>

            {quests.length === 0 ? (
              <Text style={styles.joinQuestEmpty}>
                There are no active or upcoming quests available to join.
              </Text>
            ) : (
              quests.map(quest => (
                <TouchableOpacity
                  key={quest.id}
                  style={[styles.questCard, selectedQuestId === quest.id && styles.questCardSelected]}
                  onPress={() => setSelectedQuestId(quest.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.questCardRadio}>
                    <View style={[styles.radioOuter, selectedQuestId === quest.id && styles.radioOuterActive]}>
                      {selectedQuestId === quest.id && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questDescription}>{quest.description}</Text>
                    <View style={styles.questMeta}>
                      <Icon name="calendar-outline" size={12} color="#9AA0A6" />
                      <Text style={styles.questMetaText}>
                        {formatDate(quest.start_date)} – {formatDate(quest.end_date)}
                      </Text>
                    </View>
                    <View style={styles.questMeta}>
                      <Icon name="key-outline" size={12} color="#9AA0A6" />
                      <Text style={styles.questMetaText}>{quest.keys_provided} Keys</Text>
                    </View>
                    <Text style={styles.questPrice}>${quest.price}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {selectedQuestId && (
              <View style={styles.promoWrap}>
                <Text style={styles.promoLabel}>Promo Code</Text>
                <View style={styles.promoRow}>
                  <TextInput
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={t => { setPromoCode(t.toUpperCase()); setPromoError(''); }}
                    placeholder="Enter Promo Code"
                    placeholderTextColor="#9AA0A6"
                    autoCapitalize="characters"
                    maxLength={20}
                  />
                  <TouchableOpacity style={styles.promoApplyBtn} onPress={() => {
                    if (!promoCode) { setPromoError('Promo code cannot be empty.'); return; }
                    Alert.alert('Promo Code', 'Promo code validation coming soon.');
                  }}>
                    <Text style={styles.promoApplyText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                {promoError ? <Text style={styles.promoError}>{promoError}</Text> : null}
              </View>
            )}
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterResetBtn} onPress={handleClose}>
              <Text style={styles.filterResetText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterApplyBtn, !selectedQuestId && { opacity: 0.5 }]}
              onPress={handleConfirmPurchase}
              disabled={!selectedQuestId}
            >
              <Text style={styles.filterApplyText}>Confirm & Pay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Trail Detail Modal
// ---------------------------------------------------------------------------

function TrailDetailModal({
  trail,
  variants,
  visible,
  onClose,
}: {
  trail: Trail | null;
  variants: Variants;
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
    Alert.alert('Coordinates', `${hidden_point.latitude.toFixed(4)}, ${hidden_point.longitude.toFixed(4)}`);
  };

  const isPermitUrl = trail.permit_requierd?.startsWith('http');
  const diffColor = getDifficultyColor(trail.difficulty, variants);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailImageWrap}>
            <Image source={{ uri: getTrailImageUrl(trail.image_url) }} style={styles.detailImage} />
            {isLocked && (
              <View style={styles.detailImageOverlay}>
                <Icon name="lock-closed" size={40} color="rgba(255,255,255,0.7)" />
              </View>
            )}
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Icon name="close" size={20} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
            <View style={styles.detailTitleRow}>
              <Text style={[styles.detailTitle, isLocked && styles.detailTitleLocked]} numberOfLines={2}>
                {isLocked ? 'Locked Trail — Unlock for Details' : trail.name}
              </Text>
              <Icon name={getStatusIconName(trail.user_trail_status)} size={20} color={getStatusColor(trail.user_trail_status)} />
            </View>

            <View style={styles.detailBadgeRow}>
              {trail.trail_types.map(typeName => {
                const color = getTrailTypeColor(typeName, variants);
                return (
                  <View key={typeName} style={[styles.badge, { backgroundColor: color }]}>
                    <Icon name="triangle-outline" size={11} color={getContrastColor(color)} />
                    <Text style={[styles.badgeText, { color: getContrastColor(color) }]}>{typeName}</Text>
                  </View>
                );
              })}
              <View style={[styles.badge, { backgroundColor: diffColor }]}>
                <Icon name="flash-outline" size={11} color={getContrastColor(diffColor)} />
                <Text style={[styles.badgeText, { color: getContrastColor(diffColor) }]}>{trail.difficulty}</Text>
              </View>
            </View>

            <DetailRow icon="location-outline" color={Colors.orange}>{trail.city}, {trail.state}</DetailRow>

            {trail.distance_meters !== null && (
              <DetailRow icon="compass-outline" color={Colors.orange}>
                Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)} miles away
              </DetailRow>
            )}

            {trail.vehicle_types.length > 0 && (
              <DetailRow icon="car-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Vehicles: </Text>{trail.vehicle_types.join(', ')}
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
                  <TouchableOpacity onPress={() => Linking.openURL(trail.permit_requierd!)}>
                    <Text style={styles.detailLink}>Required — View Details</Text>
                  </TouchableOpacity>
                ) : trail.permit_requierd}
              </DetailRow>
            )}

            <DetailRow icon="shapes-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Shape: </Text>{trail.trail_shape}
            </DetailRow>

            <DetailRow icon="calendar-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Open: </Text>{trail.typically_open}
            </DetailRow>

            {!isLocked && (
              <DetailRow icon="radio-button-on-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Tolerance: </Text>{trail.distance_tolerance} m
              </DetailRow>
            )}

            {!isLocked && hidden_point && (
              <DetailRow icon="key-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Keys: </Text>{hidden_point.keys_awarded}
                {'   '}
                <Icon name="trophy-outline" size={14} color="#CA8A04" />{'  '}
                <Text style={styles.detailLabel}>Points: </Text>{hidden_point.points_awarded}
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

// ---------------------------------------------------------------------------
// Trail Card
// ---------------------------------------------------------------------------

function TrailCard({
  trail,
  variants,
  userKeys,
  isUserParticipant,
  activeQuests,
  onShowMore,
  onUnlock,
  onJoinQuest,
  onViewOnMap,
}: {
  trail: Trail;
  variants: Variants;
  userKeys: number;
  isUserParticipant: boolean;
  activeQuests: Quest[];
  onShowMore: (t: Trail) => void;
  onUnlock: (t: Trail) => void;
  onJoinQuest: () => void;
  onViewOnMap: (trailId: string) => void;
}) {
  const isLocked = trail.user_trail_status === 'locked';
  const { hidden_point } = trail;
  const canUnlock = userKeys >= trail.keys_to_unlock;
  const diffColor = getDifficultyColor(trail.difficulty, variants);

  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: getTrailImageUrl(trail.image_url) }} style={styles.cardImage} />
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
        <Text style={[styles.cardTitle, isLocked && styles.cardTitleLocked]} numberOfLines={2}>
          {isLocked ? 'Locked Trail' : trail.name}
        </Text>
        <Icon name={getStatusIconName(trail.user_trail_status)} size={18} color={getStatusColor(trail.user_trail_status)} />
      </View>

      <View style={styles.cardBadgeRow}>
        {trail.trail_types.map(typeName => {
          const color = getTrailTypeColor(typeName, variants);
          return (
            <View key={typeName} style={[styles.badge, { backgroundColor: color }]}>
              <Icon name="triangle-outline" size={10} color={getContrastColor(color)} />
              <Text style={[styles.badgeText, { color: getContrastColor(color) }]}>{typeName}</Text>
            </View>
          );
        })}
        <View style={[styles.badge, { backgroundColor: diffColor }]}>
          <Icon name="flash-outline" size={10} color={getContrastColor(diffColor)} />
          <Text style={[styles.badgeText, { color: getContrastColor(diffColor) }]}>{trail.difficulty}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <CardRow icon="location-outline">{trail.city}, {trail.state}</CardRow>

        {trail.distance_meters !== null && (
          <CardRow icon="compass-outline">
            Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)} miles away
          </CardRow>
        )}

        {trail.vehicle_types.length > 0 && (
          <CardRow icon="car-outline">
            <Text style={styles.cardRowLabel}>Vehicles: </Text>{trail.vehicle_types.join(', ')}
          </CardRow>
        )}

        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Icon name="document-text-outline" size={14} color={Colors.orange} />
            <Text style={styles.cardSectionTitle}>Overview</Text>
          </View>
          <Text style={styles.cardOverview} numberOfLines={2}>{trail.overview}</Text>
        </View>

        <CardRow icon="shapes-outline">
          <Text style={styles.cardRowLabel}>Shape: </Text>{trail.trail_shape}
        </CardRow>

        <CardRow icon="calendar-outline">
          <Text style={styles.cardRowLabel}>Open: </Text>{trail.typically_open}
        </CardRow>

        {!isLocked && hidden_point && (
          <CardRow icon="key-outline">
            <Text style={styles.cardRowLabel}>Keys: </Text>{hidden_point.keys_awarded}
            {'   '}
            <Icon name="trophy-outline" size={13} color="#CA8A04" />{'  '}
            <Text style={styles.cardRowLabel}>Points: </Text>{hidden_point.points_awarded}
          </CardRow>
        )}

        {!isLocked && hidden_point && (
          <View style={styles.cardSection}>
            <View style={styles.cardSectionHeader}>
              <Icon name="globe-outline" size={14} color={Colors.orange} />
              <Text style={styles.cardSectionTitle}>Points Location</Text>
            </View>
            <TouchableOpacity onPress={() => {
              const url = `https://www.google.com/maps/search/?api=1&query=${hidden_point.latitude},${hidden_point.longitude}`;
              Linking.openURL(url);
            }}>
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
            <Text style={styles.cardOverview} numberOfLines={2}>{trail.navigation_details}</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => onShowMore(trail)}>
          <Text style={styles.showMoreBtn}>Show More</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardFooter}>
        {trail.user_trail_status === 'unlocked' && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnPrimary]} onPress={() => onViewOnMap(trail.id)}>
            <Icon name="location-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Verify</Text>
          </TouchableOpacity>
        )}

        {isLocked && !isUserParticipant && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnUnlock]} onPress={onJoinQuest}>
            <Icon name="ticket-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Join Quest</Text>
          </TouchableOpacity>
        )}

        {isLocked && isUserParticipant && canUnlock && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnUnlock]} onPress={() => onUnlock(trail)}>
            <Icon name="key-outline" size={15} color="#fff" />
            <Text style={styles.footerBtnText}>Unlock</Text>
          </TouchableOpacity>
        )}

        {isLocked && isUserParticipant && !canUnlock && (
          <TouchableOpacity style={[styles.footerBtn, styles.footerBtnOutline]} onPress={onJoinQuest}>
            <Icon name="add-circle-outline" size={15} color={Colors.blueGrey} />
            <Text style={styles.footerBtnOutlineText}>Buy More Keys</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Filter Modal
// ---------------------------------------------------------------------------

function FilterModal({
  visible,
  variants,
  cities,
  filters,
  onApply,
  onClose,
  onStateChange,
}: {
  visible: boolean;
  variants: Variants;
  cities: CityVariant[];
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
  onStateChange: (stateId: string | null) => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => { setLocal(filters); }, [filters, visible]);

  const set = (key: keyof Filters, val: any) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const handleStateSelect = (id: string | null) => {
    set('stateId', id);
    set('cityId', null);
    set('cityLat', null);
    set('cityLon', null);
    onStateChange(id);
  };

  const handleCitySelect = (city: CityVariant | null) => {
    set('cityId', city?.id ?? null);
    set('cityLat', city?.latitude ?? null);
    set('cityLon', city?.longitude ?? null);
  };

  const handleReset = () => {
    const empty = { ...DEFAULT_FILTERS };
    setLocal(empty);
    onStateChange(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.filterOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Search Trails</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>

            {/* State */}
            <Text style={styles.filterSectionLabel}>State</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !local.stateId && styles.filterChipActive]}
                  onPress={() => handleStateSelect(null)}
                >
                  <Text style={[styles.filterChipText, !local.stateId && styles.filterChipTextActive]}>Any</Text>
                </TouchableOpacity>
                {variants.states.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.filterChip, local.stateId === s.id && styles.filterChipActive]}
                    onPress={() => handleStateSelect(s.id)}
                  >
                    <Text style={[styles.filterChipText, local.stateId === s.id && styles.filterChipTextActive]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* City */}
            <Text style={[styles.filterSectionLabel, !local.stateId && styles.filterSectionLabelDisabled]}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !local.cityId && styles.filterChipActive]}
                  onPress={() => handleCitySelect(null)}
                  disabled={!local.stateId}
                >
                  <Text style={[styles.filterChipText, !local.cityId && styles.filterChipActive && styles.filterChipTextActive]}>Any</Text>
                </TouchableOpacity>
                {cities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.filterChip, local.cityId === c.id && styles.filterChipActive]}
                    onPress={() => handleCitySelect(c)}
                    disabled={!local.stateId}
                  >
                    <Text style={[styles.filterChipText, local.cityId === c.id && styles.filterChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Distance */}
            <Text style={[styles.filterSectionLabel, !local.cityId && styles.filterSectionLabelDisabled]}>
              Max Distance
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !local.distanceMeters && styles.filterChipActive]}
                  onPress={() => set('distanceMeters', null)}
                  disabled={!local.cityId}
                >
                  <Text style={[styles.filterChipText, !local.distanceMeters && styles.filterChipTextActive]}>Any</Text>
                </TouchableOpacity>
                {DISTANCE_OPTIONS.map(miles => (
                  <TouchableOpacity
                    key={miles}
                    style={[styles.filterChip, local.distanceMeters === milesToMeters(miles) && styles.filterChipActive]}
                    onPress={() => set('distanceMeters', milesToMeters(miles))}
                    disabled={!local.cityId}
                  >
                    <Text style={[styles.filterChipText, local.distanceMeters === milesToMeters(miles) && styles.filterChipTextActive]}>
                      {miles} mi
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Difficulty */}
            <Text style={styles.filterSectionLabel}>Difficulty</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !local.difficultyId && styles.filterChipActive]}
                  onPress={() => set('difficultyId', null)}
                >
                  <Text style={[styles.filterChipText, !local.difficultyId && styles.filterChipTextActive]}>Any</Text>
                </TouchableOpacity>
                {variants.difficulty_levels.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.filterChip, local.difficultyId === d.id && styles.filterChipActive]}
                    onPress={() => set('difficultyId', d.id)}
                  >
                    <Text style={[styles.filterChipText, local.difficultyId === d.id && styles.filterChipTextActive]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Trail Type */}
            <Text style={styles.filterSectionLabel}>Trail Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipScroll}>
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, !local.trailTypeId && styles.filterChipActive]}
                  onPress={() => set('trailTypeId', null)}
                >
                  <Text style={[styles.filterChipText, !local.trailTypeId && styles.filterChipTextActive]}>Any</Text>
                </TouchableOpacity>
                {variants.trail_types.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.filterChip, local.trailTypeId === t.id && styles.filterChipActive]}
                    onPress={() => set('trailTypeId', t.id)}
                  >
                    <Text style={[styles.filterChipText, local.trailTypeId === t.id && styles.filterChipTextActive]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Status */}
            <Text style={styles.filterSectionLabel}>Trail Status</Text>
            <View style={styles.filterChipRow}>
              {STATUS_OPTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, (local.status === s || (s === 'All' && !local.status)) && styles.filterChipActive]}
                  onPress={() => set('status', s === 'All' ? null : s)}
                >
                  <Text style={[styles.filterChipText, (local.status === s || (s === 'All' && !local.status)) && styles.filterChipTextActive]}>
                    {s === 'All' ? 'Any' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.filterResetBtn} onPress={handleReset}>
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyBtn} onPress={() => onApply(local)}>
              <Text style={styles.filterApplyText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ExplorerScreen() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [variants, setVariants] = useState<Variants>({ trail_types: [], difficulty_levels: [], states: [] });
  const [cities, setCities] = useState<CityVariant[]>([]);
  const [userKeys, setUserKeys] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [profileLat, setProfileLat] = useState<number | null>(null);
  const [profileLon, setProfileLon] = useState<number | null>(null);
  const [isUserParticipant, setIsUserParticipant] = useState(false);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [showJoinQuest, setShowJoinQuest] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [loadingTrails, setLoadingTrails] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [localFilteredCount, setLocalFilteredCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation<any>();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const profileCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  const hasMore = trails.length < (totalCount - localFilteredCount) && !loadingTrails;

  // --- Init: get user + variants ---
  useEffect(() => {
    const init = async () => {
      const [sessionResult, variantData] = await Promise.all([
        supabase.auth.getSession(),
        (async () => {
          try { return await supabase.rpc('get_all_variants_about_trails'); }
          catch { return { data: null, error: null }; }
        })(),
      ]);

      const user = sessionResult.data?.session?.user ?? null;
      if (user) {
        setUserId(user.id);
        try {
          const profile = await getProfile(user.id);
          if (profile) {
            setUserKeys(profile.keys ?? 0);
            if (profile.latitude != null && profile.longitude != null) {
              setProfileLat(profile.latitude);
              setProfileLon(profile.longitude);
              profileCoordsRef.current = { lat: profile.latitude, lon: profile.longitude };
            }
          }
        } catch { /* non-blocking */ }

        try {
          const { data: questData } = await supabase.rpc('get_active_quests_and_check_user', {
            input_user_id: user.id,
          });
          if (questData) {
            setIsUserParticipant(questData.isUserParticipant ?? false);
            setActiveQuests(questData.quests ?? []);
          }
        } catch { /* non-blocking */ }
      }

      if (variantData.data) {
        const v = variantData.data as any;
        setVariants({
          trail_types: v.trail_types ?? [],
          difficulty_levels: v.difficulty_levels ?? [],
          states: v.states ?? [],
        });
      }
    };

    init();
  }, []);

  // --- Location ---
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const getLocation = async () => {
        if (Platform.OS === 'android') {
          const ok = await requestAndroidLocationPermission();
          if (!ok) { setLoadingLocation(false); return; }
        }

        Geolocation.getCurrentPosition(
          pos => {
            if (cancelled) return;
            const newLat = pos.coords.latitude;
            const newLon = pos.coords.longitude;

            // Only update if location changed significantly (> approx 5m) to prevent drift loops
            const dist = userLat !== null && userLon !== null
              ? haversineDistance(userLat, userLon, newLat, newLon)
              : 999;

            if (dist > 5) {
              setUserLat(newLat);
              setUserLon(newLon);
              setHasLocation(true);
            }
            setLoadingLocation(false);
          },
          () => {
            if (cancelled) return;
            const fallback = profileCoordsRef.current;
            if (fallback && (userLat === null || userLon === null)) {
              setUserLat(fallback.lat);
              setUserLon(fallback.lon);
              setHasLocation(true);
            }
            setLoadingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
        );
      };

      getLocation();
      return () => { cancelled = true; };
    }, []),
  );

  // --- Fetch trails ---
  const loadPage = useCallback(async (pageNum: number, f: Filters, lat: number, lon: number, uid: string) => {
    setLoadingTrails(true);
    // When a city is selected, use that city's coordinates as the distance reference point
    const refLat = f.cityLat ?? lat;
    const refLon = f.cityLon ?? lon;
    try {
      const { data, error } = await supabase.rpc('get_trails_nearby_paginated', {
        user_lat: refLat,
        user_lon: refLon,
        user_id: uid,
        max_distance_meters: f.distanceMeters,
        filter_state: f.stateId,
        filter_city: f.cityId,
        filter_difficulty: f.difficultyId,
        filter_trail_type: f.trailTypeId,
        filter_user_status: f.status,
        limit_rows: PAGE_SIZE,
        offset_rows: pageNum * PAGE_SIZE,
      });

      if (error) throw error;

      const result = data as { totalCount: number; trails: Trail[] };
      let apiTrails = result.trails ?? [];
      const countBeforeFilter = apiTrails.length;

      // Filter out trails completed offline but not yet synced to Supabase.
      // Without this, the trail reappears in Explorer when connectivity returns
      // because Supabase still has it as 'unlocked' until the queue flushes.
      const cached = await getCachedTrails();
      const locallyCompleted = new Set(
        cached.filter(c => c.user_trail_status === 'completed').map(c => c.id),
      );
      if (locallyCompleted.size > 0) {
        apiTrails = apiTrails.filter(t => !(locallyCompleted.has(t.id) && t.user_trail_status !== 'completed'));
      }

      // Remove server-completed trails — completed trails are never shown in Explorer
      apiTrails = apiTrails.filter(t => t.user_trail_status !== 'completed');

      // Sort: unlocked first (closest→furthest), then locked (closest→furthest)
      apiTrails.sort((a, b) => {
        const order = (s: TrailStatus) => (s === 'unlocked' ? 0 : 1);
        const diff = order(a.user_trail_status) - order(b.user_trail_status);
        if (diff !== 0) return diff;
        return (a.distance_meters ?? 0) - (b.distance_meters ?? 0);
      });

      const countAfterFilter = apiTrails.length;
      const removedThisPage = countBeforeFilter - countAfterFilter;

      if (pageNum === 0) {
        setTrails(apiTrails);
        setLocalFilteredCount(removedThisPage);
      } else {
        setTrails(prev => [...prev, ...apiTrails]);
        setLocalFilteredCount(prev => prev + removedThisPage);
      }
      setTotalCount(result.totalCount ?? 0);
      setPage(pageNum);
    } catch (err) {
      console.warn('[ExplorerScreen] offline — falling back to cache');
      if (pageNum === 0) {
        const cached = await getCachedTrails();
        // Completed trails are excluded from Explorer entirely
        const filtered = f.status === 'unlocked'
          ? cached.filter(t => t.user_trail_status === 'unlocked')
          : cached.filter(t => t.user_trail_status === 'unlocked' || t.user_trail_status === 'locked');
        if (filtered.length > 0) {
          const asTrails: Trail[] = filtered.map(t => ({
            id: t.id,
            name: t.name,
            city: t.city,
            state: t.state,
            difficulty: t.difficulty,
            distance_tolerance: t.distance_tolerance,
            user_trail_status: t.user_trail_status,
            hidden_point: t.hidden_point,
            image_url: t.image_url ?? null,
            trail_types: t.trail_types ?? [],
            vehicle_types: t.vehicle_types ?? [],
            overview: t.overview ?? '',
            permit_requierd: t.permit_requierd ?? null,
            trail_shape: t.trail_shape ?? '',
            typically_open: t.typically_open ?? '',
            navigation_details: t.navigation_details ?? null,
            keys_to_unlock: t.keys_to_unlock ?? 0,
            distance_meters:
              t.hidden_point && lat !== null && lon !== null
                ? haversineDistance(lat, lon, t.hidden_point.latitude, t.hidden_point.longitude)
                : t.distance_meters ?? null,
          }));
          setTrails(asTrails);
          setTotalCount(asTrails.length);
        } else {
          setTrails([]);
          setTotalCount(0);
        }
      }
    } finally {
      setLoadingTrails(false);
      setHasAttemptedLoad(true);
    }
  }, []);

  // Reload page 0 when location + userId are ready, or filters change
  useEffect(() => {
    if (userId && userLat !== null && userLon !== null) {
      loadPage(0, filters, userLat, userLon, userId);
    }
  }, [userId, userLat, userLon, filters, loadPage]);

  // React instantly when MapScreen completes a trail — no reload needed
  useEffect(() => {
    const sub = onTrailCompleted(({ trailId, keysAwarded }) => {
      setTrails(prev => prev.filter(t => t.id !== trailId));
      if (keysAwarded > 0) {
        setUserKeys(prev => prev + keysAwarded);
      }
    });
    return () => sub.remove();
  }, []);

  // Reload trails + refresh keys whenever this screen comes back into focus
  // (general freshness — covers background syncs and other server-side changes)
  useFocusEffect(
    useCallback(() => {
      if (!userId || userLat === null || userLon === null) return;
      loadPage(0, filtersRef.current, userLat, userLon, userId);
      getProfile(userId).then(p => {
        if (p) setUserKeys(p.keys ?? 0);
      }).catch(() => {});
    }, [userId, userLat, userLon, loadPage]),
  );

  // --- Handlers ---
  const handleApplyFilters = useCallback((f: Filters) => {
    setFilters(f);
    setShowFilters(false);
  }, []);

  const handleStateChange = useCallback(async (stateId: string | null) => {
    setCities([]);
    if (!stateId) return;
    try {
      const { data } = await supabase.rpc('get_all_cities_by_state', { state_id_arg: stateId });
      setCities((data as CityVariant[]) ?? []);
    } catch { /* ignore */ }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!userId || userLat === null || userLon === null) return;
    setRefreshing(true);
    await loadPage(0, filtersRef.current, userLat, userLon, userId);
    try {
      const p = await getProfile(userId);
      if (p) setUserKeys(p.keys ?? 0);
    } catch {}
    setRefreshing(false);
  }, [userId, userLat, userLon, loadPage]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && userId && userLat !== null && userLon !== null) {
      loadPage(page + 1, filters, userLat, userLon, userId);
    }
  }, [hasMore, userId, userLat, userLon, page, filters, loadPage]);

  const handleUnlock = useCallback(async (trail: Trail) => {
    if (!userId) return;

    Alert.alert(
      'Unlock Trail',
      `Use ${trail.keys_to_unlock} key${trail.keys_to_unlock > 1 ? 's' : ''} to unlock this trail?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('unlock_trail2', {
                p_user_id: userId,
                p_trail_id: trail.id,
              });
              if (error) throw new Error(error.message);

              setTrails(prev =>
                prev.map(t =>
                  t.id === trail.id ? { ...t, user_trail_status: 'unlocked', hidden_point: data } : t,
                ),
              );
              const remaining = userKeys - trail.keys_to_unlock;
              setUserKeys(remaining);
              emitTrailUnlocked({ trailId: trail.id, hiddenPoint: data, keysRemaining: remaining });
              // Update detail modal if open
              setSelectedTrail(prev =>
                prev?.id === trail.id ? { ...prev, user_trail_status: 'unlocked', hidden_point: data } : prev,
              );
              Alert.alert('Trail Unlocked!', `You have successfully unlocked this trail.`);

              // Download offline map tiles and cache full trail data for offline Explore
              if (data?.latitude && data?.longitude) {
                downloadOfflinePack(trail.id, data).catch(() => {});
              }
              saveTrailToCache({
                id: trail.id,
                name: trail.name,
                city: trail.city,
                state: trail.state,
                difficulty: trail.difficulty,
                distance_tolerance: trail.distance_tolerance,
                user_trail_status: 'unlocked',
                hidden_point: data ?? null,
                image_url: trail.image_url,
                trail_types: trail.trail_types,
                vehicle_types: trail.vehicle_types,
                overview: trail.overview,
                permit_requierd: trail.permit_requierd,
                trail_shape: trail.trail_shape,
                typically_open: trail.typically_open,
                navigation_details: trail.navigation_details,
                keys_to_unlock: trail.keys_to_unlock,
                distance_meters: trail.distance_meters,
              }).catch(() => {});
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to unlock trail.');
            }
          },
        },
      ],
    );
  }, [userId, userKeys]);

  const renderTrail = useCallback(({ item }: { item: Trail }) => (
    <TrailCard
      trail={item}
      variants={variants}
      userKeys={userKeys}
      isUserParticipant={isUserParticipant}
      activeQuests={activeQuests}
      onShowMore={t => setSelectedTrail(t)}
      onUnlock={handleUnlock}
      onJoinQuest={() => setShowJoinQuest(true)}
      onViewOnMap={trailId => navigation.navigate('Map', { trailId })}
    />
  ), [variants, userKeys, isUserParticipant, activeQuests, handleUnlock]);

  const isLoading = loadingLocation || loadingTrails;

  const ListHeader = (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Explore Trails</Text>
            <Text style={styles.headerSubtitle}>Discover your next off-road adventure</Text>
          </View>
          <View style={styles.keysBadge}>
            <Icon name="key-outline" size={14} color={Colors.orange} />
            <Text style={styles.keysBadgeText}>{userKeys}</Text>
            <Text style={styles.keysBadgeLabel}>Keys</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => setShowFilters(p => !p)}
          activeOpacity={0.8}
        >
          <Icon name={showFilters ? 'close-circle-outline' : 'search-outline'} size={17} color="#fff" />
          <Text style={styles.searchBtnText}>{showFilters ? 'Hide Filters' : 'Search Trails'}</Text>
        </TouchableOpacity>
      </View>

      {!hasLocation && !loadingLocation && (
        <NoAccessLocation onSettings={() => Linking.openSettings()} />
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
          <Text style={styles.emptyBody}>Try adjusting your filters to find your next adventure.</Text>
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreWrap}>
              {loadingTrails ? (
                <ActivityIndicator color={Colors.orange} />
              ) : (
                <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
                  <Text style={styles.loadMoreText}>Load More Trails</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
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
        onClose={() => setShowJoinQuest(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  listContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontFamily: Fonts.gothamBold, fontSize: 24, color: Colors.blueGrey, marginBottom: 2 },
  headerSubtitle: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: '#687076' },
  keysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orange + '18',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  keysBadgeText: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.orange },
  keysBadgeLabel: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: Colors.orange },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.orange,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  searchBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // No location
  noLocationWrap: { alignItems: 'center', padding: 40, gap: 12 },
  noLocationTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  noLocationBody: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 22 },
  noLocationBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  noLocationBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },
  noLocationNote: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#9AA0A6' },

  // States
  loadingState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#687076' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  emptyBody: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#687076', textAlign: 'center' },

  // Card
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
  cardImageOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
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
  lockedImageBannerText: { fontFamily: Fonts.gothamBold, fontSize: 11, color: '#fff', letterSpacing: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 8 },
  cardTitle: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.blueGrey, flex: 1 },
  cardTitleLocked: { fontStyle: 'italic', color: '#9AA0A6' },
  cardBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  badgeText: { fontFamily: Fonts.firaSansBold, fontSize: 11 },
  cardBody: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  cardRowIcon: { marginTop: 1 },
  cardRowText: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: Colors.blueGrey, flex: 1 },
  cardRowLabel: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey },
  cardSection: { gap: 4 },
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardSectionTitle: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey },
  cardOverview: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076', lineHeight: 18 },
  showMoreBtn: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange, marginTop: 4 },
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
  footerBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },
  footerBtnOutlineText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },

  // Load more
  loadMoreWrap: { alignItems: 'center', paddingVertical: 20 },
  loadMoreBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loadMoreText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // Detail modal
  detailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  detailSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  detailImageWrap: { height: 200, position: 'relative' },
  detailImage: { width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  detailImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  detailScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  detailTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey, flex: 1 },
  detailTitleLocked: { fontStyle: 'italic', color: '#9AA0A6' },
  detailBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  detailRowIcon: { marginTop: 1 },
  detailRowText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: Colors.blueGrey, flex: 1 },
  detailLabel: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  detailSection: { marginBottom: 12 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  detailSectionTitle: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  detailBody: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#687076', lineHeight: 22 },
  detailLink: { color: '#3B82F6', textDecorationLine: 'underline' },
  coordsRow: { flexDirection: 'row', alignItems: 'center' },
  copyBtn: { padding: 6 },

  // Filter modal
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTitle: { fontFamily: Fonts.gothamBold, fontSize: 17, color: Colors.blueGrey },
  filterScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  filterSectionLabel: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  filterSectionLabelDisabled: { color: '#C0C0C0' },
  filterChipScroll: { marginBottom: 4 },
  filterChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
  },
  filterChipActive: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  filterChipText: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: Colors.blueGrey },
  filterChipTextActive: { color: '#fff', fontFamily: Fonts.firaSansBold },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  filterResetText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: 'center',
  },
  filterApplyText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // Join Quest Modal
  joinQuestSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    marginBottom: 16,
  },
  joinQuestEmpty: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    paddingVertical: 20,
  },
  questCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  questCardSelected: {
    borderColor: Colors.orange,
    borderWidth: 2,
  },
  questCardRadio: { paddingTop: 2 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9AA0A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.orange },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.orange,
  },
  questTitle: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey, marginBottom: 4 },
  questDescription: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076', marginBottom: 6 },
  questMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  questMetaText: { fontFamily: Fonts.firaSansRegular, fontSize: 11, color: '#9AA0A6' },
  questPrice: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.orange, marginTop: 4 },
  promoWrap: { marginTop: 8, marginBottom: 4 },
  promoLabel: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey, marginBottom: 8 },
  promoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  promoApplyBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  promoApplyText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange },
  promoError: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#EF4444', marginTop: 4 },
});
