import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import ConfettiCannon from 'react-native-confetti-cannon';
import Geolocation from '@react-native-community/geolocation';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { supabase } from '../lib/supabase';
import {
  getCachedTrails,
  updateTrailStatusInCache,
  removeTrailFromCache,
  addToCompletionQueue,
  getCompletionQueue,
} from '../lib/trailCache';
import { deleteOfflinePack } from '../lib/offlineMap';
import { emitTrailCompleted, emitGpsUpdate, onTrailUnlocked } from '../lib/trailEvents';
import ProfileStack from './ProfileStack';
import CommunityStack from './CommunityStack';
import LeaderboardScreen from '../screens/main/LeaderboardScreen';
import ExplorerScreen from '../screens/main/ExplorerScreen';
import MapScreen from '../screens/main/MapScreen';

export type AppTabParamList = {
  Explorer: undefined;
  Map: { trailId?: string };
  Community: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VerifiableTrail = {
  id: string;
  name: string;
  hidden_point: {
    latitude: number;
    longitude: number;
    keys_awarded: number;
    points_awarded: number;
  };
  distance_tolerance: number;
};

type CompletedInfo = {
  name: string;
  keys_awarded: number;
  points_awarded: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function requestAndroidLocationPermission(): Promise<boolean> {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'ORTQ needs your location to verify trail checkpoints.',
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
// Completion Modal
// ---------------------------------------------------------------------------

function CompletionModal({
  info,
  visible,
  onClose,
}: {
  info: CompletedInfo | null;
  visible: boolean;
  onClose: () => void;
}) {
  if (!info) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {visible && (
          <ConfettiCannon
            count={120}
            origin={{ x: -10, y: 0 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={3000}
            colors={['#FFD700', '#FF4500', '#00BFFF', '#32CD32', '#FF69B4']}
          />
        )}
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Icon name="checkmark-circle" size={56} color="#22C55E" />
          </View>
          <Text style={styles.title}>Congratulations!</Text>
          <Text style={styles.subtitle}>
            You've successfully completed "{info.name}"!
          </Text>
          <View style={styles.rewards}>
            {info.points_awarded > 0 && (
              <View style={styles.rewardRow}>
                <Icon name="trophy" size={20} color="#F59E0B" />
                <Text style={styles.rewardText}>{info.points_awarded} Points Earned</Text>
              </View>
            )}
            {info.keys_awarded > 0 && (
              <View style={styles.rewardRow}>
                <Icon name="key" size={20} color="#D97706" />
                <Text style={styles.rewardText}>{info.keys_awarded} Keys Awarded</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Navigator
// ---------------------------------------------------------------------------

export default function AppNavigator() {
  const [completedInfo, setCompletedInfo] = useState<CompletedInfo | null>(null);

  // Refs so GPS callback always sees latest values without restarting the watch
  const activeTrailsRef = useRef<VerifiableTrail[]>([]);
  const completedIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // --- Load unlocked trails on mount ---
  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;
      userIdRef.current = uid;
      if (!uid) return;

      // Pre-populate completedIds from the offline queue so we never re-trigger
      const queue = await getCompletionQueue();
      queue.forEach(q => completedIdsRef.current.add(q.trailId));

      // Load from local cache first (works offline)
      const cached = await getCachedTrails();
      activeTrailsRef.current = cached
        .filter(t => t.user_trail_status === 'unlocked' && t.hidden_point)
        .map(t => ({
          id: t.id,
          name: t.name,
          hidden_point: t.hidden_point!,
          distance_tolerance: t.distance_tolerance,
        }));

      // Refresh from Supabase
      try {
        const { data } = await supabase.rpc('get_user_trails_markers', { p_user_id: uid });
        if (data) {
          const markers = data as any[];
          // Collect completed trail IDs so GPS never re-triggers them
          markers
            .filter((t: any) => t.user_trail_status === 'completed')
            .forEach((t: any) => completedIdsRef.current.add(t.id));

          activeTrailsRef.current = markers
            .filter((t: any) => t.user_trail_status === 'unlocked' && t.hidden_point)
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              hidden_point:
                typeof t.hidden_point === 'string'
                  ? JSON.parse(t.hidden_point)
                  : t.hidden_point,
              distance_tolerance: t.distance_tolerance,
            }));
        }
      } catch { /* use cache */ }
    };
    init();
  }, []);

  // --- When a trail is unlocked from Explorer, add it to the verification list ---
  useEffect(() => {
    const sub = onTrailUnlocked(({ trailId, trailName, distanceTolerance, hiddenPoint }) => {
      if (activeTrailsRef.current.some(t => t.id === trailId)) return;
      activeTrailsRef.current = [
        ...activeTrailsRef.current,
        {
          id: trailId,
          name: trailName,
          hidden_point: {
            latitude: hiddenPoint.latitude,
            longitude: hiddenPoint.longitude,
            keys_awarded: hiddenPoint.keys_awarded,
            points_awarded: hiddenPoint.points_awarded,
          },
          distance_tolerance: distanceTolerance,
        },
      ];
    });
    return () => sub.remove();
  }, []);

  // --- Global GPS watch — persists across all tabs ---
  useEffect(() => {
    const startWatch = () => {
      watchIdRef.current = Geolocation.watchPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          emitGpsUpdate({ latitude, longitude });
          const uid = userIdRef.current;
          if (!uid) return;

          for (const trail of activeTrailsRef.current) {
            if (completedIdsRef.current.has(trail.id)) continue;

            const dist = haversineDistance(
              latitude,
              longitude,
              trail.hidden_point.latitude,
              trail.hidden_point.longitude,
            );

            if (dist <= trail.distance_tolerance) {
              completedIdsRef.current.add(trail.id);
              // Remove from active list so it is never re-checked
              activeTrailsRef.current = activeTrailsRef.current.filter(
                t => t.id !== trail.id,
              );
              handleCompleteTrail(trail, { latitude, longitude }, uid);
              break; // One completion per GPS tick
            }
          }
        },
        err => console.warn('[Verification] GPS error:', err),
        { enableHighAccuracy: true, distanceFilter: 5 },
      );
    };

    if (Platform.OS === 'android') {
      requestAndroidLocationPermission().then(granted => {
        if (granted) startWatch();
      });
    } else {
      startWatch();
    }

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const handleCompleteTrail = async (
    trail: VerifiableTrail,
    coords: { latitude: number; longitude: number },
    uid: string,
  ) => {
    // Show modal immediately on any active screen
    setCompletedInfo({
      name: trail.name,
      keys_awarded: trail.hidden_point.keys_awarded,
      points_awarded: trail.hidden_point.points_awarded,
    });

    // Update local cache so MapScreen / ExplorerScreen reflect the change
    updateTrailStatusInCache(trail.id, 'completed').catch(() => {});

    // Notify MapScreen (updates marker) and ExplorerScreen (removes card)
    emitTrailCompleted({
      trailId: trail.id,
      keysAwarded: trail.hidden_point.keys_awarded,
    });

    // Sync to Supabase
    try {
      const { error } = await supabase.rpc('complete_trail', {
        v_p_user_id: uid,
        v_p_trail_id: trail.id,
        v_p_user_lat: coords.latitude,
        v_p_user_lon: coords.longitude,
      });

      if (error) throw new Error(error.message);

      removeTrailFromCache(trail.id).catch(() => {});
      deleteOfflinePack(trail.id).catch(() => {});
    } catch (err) {
      console.warn('[Verification] Sync failed, queuing offline:', err);
      await addToCompletionQueue({
        trailId: trail.id,
        userId: uid,
        userLat: coords.latitude,
        userLon: coords.longitude,
        queuedAt: Date.now(),
      });
    }
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.orange,
          tabBarInactiveTintColor: '#9AA0A6',
          tabBarLabelStyle: { fontFamily: Fonts.firaSansRegular, fontSize: 12 },
          tabBarStyle: { borderTopColor: '#F0F0F0' },
        }}
      >
        <Tab.Screen
          name="Explorer"
          component={ExplorerScreen}
          options={{
            tabBarLabel: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Icon name="compass-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="map-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Community"
          component={CommunityStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            tabBarLabel: 'Ranks',
            tabBarIcon: ({ color, size }) => (
              <Icon name="trophy-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>

      <CompletionModal
        info={completedInfo}
        visible={!!completedInfo}
        onClose={() => setCompletedInfo(null)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: '#16A34A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    marginBottom: 24,
  },
  rewards: { gap: 12, marginBottom: 28, alignItems: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: '#293349',
  },
  btn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 15,
    color: '#fff',
  },
});
