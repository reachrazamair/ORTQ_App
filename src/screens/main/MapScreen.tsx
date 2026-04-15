import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { downloadOfflinePack, deleteOfflinePack } from '../../lib/offlineMap';
import {
  getCachedTrails,
  saveAllTrailsToCache,
  updateTrailStatusInCache,
  addToCompletionQueue,
  removeFromCompletionQueue,
  getCompletionQueue,
} from '../../lib/trailCache';

Mapbox.setAccessToken(Config.MAPBOX_TOKEN ?? '');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrailStatus = 'locked' | 'unlocked' | 'completed';

type HiddenPoint = {
  id: string;
  latitude: number;
  longitude: number;
  keys_awarded: number;
  points_awarded: number;
};

type TrailMarker = {
  id: string;
  name: string;
  city: string;
  state: string;
  difficulty: string;
  distance_tolerance: number;
  user_trail_status: TrailStatus;
  hidden_point: HiddenPoint | null;
};

type Coords = { latitude: number; longitude: number };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function metersToMiles(m: number) {
  return m / 1609.344;
}

function haversineDistance(a: Coords, b: Coords): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const x =
    sinDLat * sinDLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinDLon *
      sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getMarkerColor(status: TrailStatus): string {
  if (status === 'completed') return '#22C55E';
  if (status === 'unlocked') return '#3B82F6';
  return '#9AA0A6';
}

// ---------------------------------------------------------------------------
// Trail Completed Modal
// ---------------------------------------------------------------------------

function TrailCompletedModal({
  trail,
  visible,
  onClose,
}: {
  trail: TrailMarker | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!trail) return null;
  const hp = trail.hidden_point;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.completedOverlay}>
        <View style={styles.completedSheet}>
          <View style={styles.completedIconWrap}>
            <Icon name="checkmark-circle" size={56} color="#22C55E" />
          </View>
          <Text style={styles.completedTitle}>Trail Completed!</Text>
          <Text style={styles.completedSubtitle}>
            You've successfully completed "{trail.name}"!
          </Text>

          {hp && (
            <View style={styles.completedRewards}>
              {hp.points_awarded > 0 && (
                <View style={styles.completedRewardRow}>
                  <Icon name="trophy" size={20} color="#F59E0B" />
                  <Text style={styles.completedRewardText}>{hp.points_awarded} Points Earned</Text>
                </View>
              )}
              {hp.keys_awarded > 0 && (
                <View style={styles.completedRewardRow}>
                  <Icon name="key" size={20} color="#D97706" />
                  <Text style={styles.completedRewardText}>{hp.keys_awarded} Keys Awarded</Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.completedBtn} onPress={onClose}>
            <Text style={styles.completedBtnText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Info Bottom Sheet
// ---------------------------------------------------------------------------

function InfoSheet({
  trail,
  userCoords,
  onClose,
}: {
  trail: TrailMarker | null;
  userCoords: Coords | null;
  onClose: () => void;
}) {
  if (!trail) return null;
  const hp = trail.hidden_point;

  const distance =
    userCoords && hp
      ? haversineDistance(userCoords, { latitude: hp.latitude, longitude: hp.longitude })
      : null;

  const formatDistance = (m: number) => {
    const miles = metersToMiles(m);
    return miles >= 1 ? `${miles.toFixed(1)} mi` : `${m.toFixed(0)} m`;
  };

  return (
    <View style={styles.infoSheet}>
      <View style={styles.infoHandle} />

      <View style={styles.infoHeader}>
        <Text style={styles.infoName} numberOfLines={1}>{trail.name}</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={20} color={Colors.blueGrey} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Icon name="location-outline" size={15} color={Colors.orange} />
        <Text style={styles.infoText}>{trail.city}, {trail.state}</Text>
      </View>

      {hp && (
        <View style={styles.infoRow}>
          <Icon name="key-outline" size={15} color={Colors.orange} />
          <Text style={styles.infoText}>{hp.keys_awarded} Keys</Text>
          <Icon name="trophy-outline" size={15} color="#F59E0B" style={{ marginLeft: 12 }} />
          <Text style={styles.infoText}>{hp.points_awarded} Points</Text>
        </View>
      )}

      {hp && (
        <View style={styles.infoRow}>
          <Icon name="globe-outline" size={15} color={Colors.orange} />
          <Text style={styles.infoText}>
            {hp.latitude.toFixed(4)}, {hp.longitude.toFixed(4)}
          </Text>
        </View>
      )}

      {distance !== null && (
        <View style={styles.infoRow}>
          <Icon name="navigate-outline" size={15} color="#3B82F6" />
          <Text style={[styles.infoText, { color: '#3B82F6', fontFamily: Fonts.firaSansBold }]}>
            Distance: {formatDistance(distance)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

type MapRouteParams = { trailId?: string };

export default function MapScreen() {
  const route = useRoute<RouteProp<{ Map: MapRouteParams }, 'Map'>>();
  const focusedTrailId = route.params?.trailId ?? null;

  const cameraRef = useRef<Mapbox.Camera>(null);
  const watchId = useRef<number | null>(null);

  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [trails, setTrails] = useState<TrailMarker[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<TrailMarker | null>(null);
  const [completedTrail, setCompletedTrail] = useState<TrailMarker | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [loading, setLoading] = useState(true);

  const completedIds = useRef<Set<string>>(new Set());

  // --- Load user + trail markers ---
  useEffect(() => {
    const init = async () => {
      // getSession reads from local storage — works offline unlike getUser()
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) return;
      const uid = sessionData.session.user.id;
      setUserId(uid);

      const { data, error } = await supabase.rpc('get_user_trails_markers', {
        p_user_id: uid,
      });

      if (!error && data) {
        const markers = data as TrailMarker[];
        setTrails(markers);
        // Save to cache for offline use
        saveAllTrailsToCache(markers).catch(() => {});
        // Ensure offline map packs exist for all unlocked trails
        markers.forEach(t => {
          if (t.user_trail_status === 'unlocked' && t.hidden_point) {
            downloadOfflinePack(t.id, t.hidden_point).catch(() => {});
          }
        });
      } else {
        // Offline — load from cache
        const cached = await getCachedTrails();
        if (cached.length > 0) setTrails(cached as TrailMarker[]);
      }

      setLoading(false);

      // Flush any queued completions now that we may have connectivity
      flushCompletionQueue(uid);
    };
    init();
  }, []);

  // --- Flush queue on focus (user may have regained connectivity) ---
  useFocusEffect(
    useCallback(() => {
      if (userId) flushCompletionQueue(userId);
    }, [userId]),
  );

  // --- Watch GPS ---
  useFocusEffect(
    useCallback(() => {
      watchId.current = Geolocation.watchPosition(
        pos => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setUserCoords(coords);

          if (isFollowing) {
            cameraRef.current?.setCamera({
              centerCoordinate: [coords.longitude, coords.latitude],
              animationDuration: 500,
            });
          }

          // Auto-complete check
          trails.forEach(trail => {
            if (trail.user_trail_status !== 'unlocked') return;
            if (!trail.hidden_point) return;
            if (completedIds.current.has(trail.id)) return;

            const dist = haversineDistance(coords, {
              latitude: trail.hidden_point.latitude,
              longitude: trail.hidden_point.longitude,
            });

            if (dist <= trail.distance_tolerance) {
              completedIds.current.add(trail.id);
              handleCompleteTrail(trail, coords);
            }
          });
        },
        err => console.warn('[MapScreen] GPS error:', err),
        { enableHighAccuracy: true, distanceFilter: 5 },
      );

      return () => {
        if (watchId.current !== null) {
          Geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
      };
    }, [trails, isFollowing]),
  );

  // --- Center on focused trail from Explorer ---
  useEffect(() => {
    if (!focusedTrailId) return;
    const trail = trails.find(t => t.id === focusedTrailId);
    if (trail?.hidden_point) {
      setIsFollowing(false);
      setSelectedTrail(trail);
      cameraRef.current?.setCamera({
        centerCoordinate: [trail.hidden_point.longitude, trail.hidden_point.latitude],
        zoomLevel: 15,
        animationDuration: 800,
      });
    }
  }, [focusedTrailId, trails]);

  // --- Flush queued offline completions ---
  const flushCompletionQueue = async (uid: string) => {
    const queue = await getCompletionQueue();
    for (const entry of queue) {
      try {
        await supabase.rpc('complete_trail', {
          v_p_user_id: entry.userId,
          v_p_trail_id: entry.trailId,
          v_p_user_lat: entry.userLat,
          v_p_user_lon: entry.userLon,
        });
        await removeFromCompletionQueue(entry.trailId);
        await updateTrailStatusInCache(entry.trailId, 'completed');
        deleteOfflinePack(entry.trailId).catch(() => {});
        setTrails(prev =>
          prev.map(t => t.id === entry.trailId ? { ...t, user_trail_status: 'completed' } : t),
        );
      } catch {
        // Still offline — leave in queue
      }
    }
  };

  // --- Complete trail ---
  const handleCompleteTrail = async (trail: TrailMarker, coords: Coords) => {
    if (!userId) return;

    // Mark locally immediately so UI updates
    setTrails(prev =>
      prev.map(t => t.id === trail.id ? { ...t, user_trail_status: 'completed' } : t),
    );
    setSelectedTrail(null);
    setCompletedTrail(trail);
    updateTrailStatusInCache(trail.id, 'completed').catch(() => {});

    try {
      await supabase.rpc('complete_trail', {
        v_p_user_id: userId,
        v_p_trail_id: trail.id,
        v_p_user_lat: coords.latitude,
        v_p_user_lon: coords.longitude,
      });
      // Success — clean up offline pack
      deleteOfflinePack(trail.id).catch(() => {});
    } catch {
      // Offline — queue for later sync
      await addToCompletionQueue({
        trailId: trail.id,
        userId,
        userLat: coords.latitude,
        userLon: coords.longitude,
        queuedAt: Date.now(),
      });
    }
  };

  // --- Recenter ---
  const handleRecenter = () => {
    if (!userCoords) return;
    setIsFollowing(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [userCoords.longitude, userCoords.latitude],
      zoomLevel: 15,
      animationDuration: 600,
    });
  };

  const defaultCenter: [number, number] = userCoords
    ? [userCoords.longitude, userCoords.latitude]
    : [-104.9903, 39.7392]; // Denver fallback

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Map</Text>
        {loading && (
          <Text style={styles.headerSub}>Loading trails...</Text>
        )}
        {!loading && trails.length > 0 && (
          <Text style={styles.headerSub}>{trails.length} trail{trails.length > 1 ? 's' : ''} on map</Text>
        )}
      </View>

      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Outdoors}
          onTouchStart={() => setIsFollowing(false)}
        >
          <Mapbox.Camera
            ref={cameraRef}
            centerCoordinate={defaultCenter}
            zoomLevel={12}
          />

          {/* User location */}
          <Mapbox.UserLocation visible animated />

          {/* Trail markers */}
          {trails.map(trail => {
            if (!trail.hidden_point) return null;
            const color = getMarkerColor(trail.user_trail_status);
            return (
              <Mapbox.MarkerView
                key={trail.id}
                coordinate={[trail.hidden_point.longitude, trail.hidden_point.latitude]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTrail(trail);
                    setIsFollowing(false);
                  }}
                  style={[styles.marker, { backgroundColor: color }]}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={
                      trail.user_trail_status === 'completed'
                        ? 'checkmark'
                        : trail.user_trail_status === 'unlocked'
                        ? 'lock-open'
                        : 'lock-closed'
                    }
                    size={14}
                    color="#fff"
                  />
                </TouchableOpacity>
              </Mapbox.MarkerView>
            );
          })}
        </Mapbox.MapView>

        {/* Recenter button */}
        <TouchableOpacity
          style={[styles.recenterBtn, isFollowing && styles.recenterBtnActive]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Icon name="locate" size={22} color={isFollowing ? '#fff' : Colors.blueGrey} />
        </TouchableOpacity>

        {/* Empty state */}
        {!loading && trails.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="map-outline" size={40} color="#9AA0A6" />
            <Text style={styles.emptyText}>No unlocked trails yet.</Text>
            <Text style={styles.emptySubText}>Unlock trails in Explorer to see them here.</Text>
          </View>
        )}
      </View>

      {/* Info bottom sheet */}
      {selectedTrail && (
        <InfoSheet
          trail={selectedTrail}
          userCoords={userCoords}
          onClose={() => setSelectedTrail(null)}
        />
      )}

      {/* Trail completed modal */}
      <TrailCompletedModal
        trail={completedTrail}
        visible={!!completedTrail}
        onClose={() => setCompletedTrail(null)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: Colors.blueGrey,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    marginTop: 2,
  },

  mapWrap: { flex: 1 },
  map: { flex: 1 },

  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  recenterBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  recenterBtnActive: {
    backgroundColor: Colors.orange,
  },

  emptyState: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    marginTop: 12,
  },
  emptySubText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 4,
  },

  // Info sheet
  infoSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  infoHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9ECEF',
    alignSelf: 'center',
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },

  // Completed modal
  completedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completedSheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  completedIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  completedTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: '#16A34A',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    marginBottom: 24,
  },
  completedRewards: { gap: 12, marginBottom: 28, alignItems: 'center' },
  completedRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completedRewardText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: Colors.blueGrey,
  },
  completedBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  completedBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: '#fff',
  },
});
