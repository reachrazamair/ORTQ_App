import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getProfile } from '../lib/profile';
import { downloadOfflinePack } from '../lib/offlineMap';
import { emitTrailUnlocked, onTrailCompleted } from '../lib/trailEvents';
import {
  getCachedTrails,
  saveTrailToCache,
  CachedTrail,
} from '../lib/trailCache';
import {
  Trail,
  Variants,
  CityVariant,
  Quest,
  Filters,
  TrailStatus,
} from '../types/explorer';
import { PAGE_SIZE, DEFAULT_FILTERS } from '../constants/explorer';
import {
  requestAndroidLocationPermission,
  haversineDistance,
} from '../utils/explorerHelpers';

export function useExplorer() {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [variants, setVariants] = useState<Variants>({
    trail_types: [],
    difficulty_levels: [],
    states: [],
  });
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
  const [locationPermissionDenied, setLocationPermissionDenied] =
    useState(false);
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
  const userLatRef = useRef<number | null>(null);
  const userLonRef = useRef<number | null>(null);
  userLatRef.current = userLat;
  userLonRef.current = userLon;
  const gpsDismissedRef = useRef(false);

  const hasMore =
    trails.length < totalCount - localFilteredCount && !loadingTrails;

  // --- Init: get user + variants ---
  useEffect(() => {
    const init = async () => {
      const [sessionResult, variantData] = await Promise.all([
        supabase.auth.getSession(),
        (async () => {
          try {
            return await supabase.rpc('get_all_variants_about_trails');
          } catch {
            return { data: null, error: null };
          }
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
              profileCoordsRef.current = {
                lat: profile.latitude,
                lon: profile.longitude,
              };
            }
          }
        } catch {
          /* non-blocking */
        }

        try {
          const { data: questData } = await supabase.rpc(
            'get_active_quests_and_check_user',
            {
              input_user_id: user.id,
            },
          );
          if (questData) {
            setIsUserParticipant(questData.isUserParticipant ?? false);
            setActiveQuests(questData.quests ?? []);
          }
        } catch {
          /* non-blocking */
        }
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
  const getLocation = useCallback((cancelled?: { value: boolean }) => {
    return new Promise<void>(async resolve => {
      if (Platform.OS === 'android') {
        const ok = await requestAndroidLocationPermission();
        if (!ok) {
          setLocationPermissionDenied(true);
          setLoadingLocation(false);
          resolve();
          return;
        }
        setLocationPermissionDenied(false);
      }

      Geolocation.getCurrentPosition(
        pos => {
          if (cancelled?.value) {
            resolve();
            return;
          }
          const newLat = pos.coords.latitude;
          const newLon = pos.coords.longitude;
          const dist =
            userLatRef.current !== null && userLonRef.current !== null
              ? haversineDistance(
                  userLatRef.current,
                  userLonRef.current,
                  newLat,
                  newLon,
                )
              : 999;
          if (dist > 5) {
            userLatRef.current = newLat;
            userLonRef.current = newLon;
            setUserLat(newLat);
            setUserLon(newLon);
            setHasLocation(true);
          }
          setLoadingLocation(false);
          resolve();
        },
        async (error: any) => {
          if (cancelled?.value) {
            resolve();
            return;
          }

          if (Platform.OS === 'android' && error?.code === 2) {
            if (!gpsDismissedRef.current) {
              gpsDismissedRef.current = true;
              try {
                const result = await promptForEnableLocationIfNeeded();
                if (result === 'enabled' || result === 'already-enabled') {
                  gpsDismissedRef.current = false;
                  Geolocation.getCurrentPosition(
                    pos => {
                      userLatRef.current = pos.coords.latitude;
                      userLonRef.current = pos.coords.longitude;
                      setUserLat(pos.coords.latitude);
                      setUserLon(pos.coords.longitude);
                      setHasLocation(true);
                      setLoadingLocation(false);
                      resolve();
                    },
                    () => {
                      setLoadingLocation(false);
                      resolve();
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                  );
                  return;
                }
              } catch {}
            }
            setLoadingLocation(false);
            resolve();
            return;
          }

          const fallback = profileCoordsRef.current;
          if (
            fallback &&
            (userLatRef.current === null || userLonRef.current === null)
          ) {
            userLatRef.current = fallback.lat;
            userLonRef.current = fallback.lon;
            setUserLat(fallback.lat);
            setUserLon(fallback.lon);
            setHasLocation(true);
          }
          setLoadingLocation(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const cancelled = { value: false };
      getLocation(cancelled);
      return () => {
        cancelled.value = true;
      };
    }, [getLocation]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && !hasLocation) {
        setLocationPermissionDenied(false);
        setLoadingLocation(true);
        getLocation();
      }
    });
    return () => sub.remove();
  }, [hasLocation, getLocation]);

  // --- Fetch trails ---
  const loadPage = useCallback(
    async (
      pageNum: number,
      f: Filters,
      lat: number,
      lon: number,
      uid: string | null,
    ) => {
      setLoadingTrails(true);
      const refLat = f.cityLat ?? lat;
      const refLon = f.cityLon ?? lon;
      try {
        const { data, error } = await supabase.rpc(
          'get_trails_nearby_paginated',
          {
            user_lat: refLat,
            user_lon: refLon,
            user_id: uid,
            max_distance_meters: f.distanceMeters,
            filter_state: f.stateId,
            filter_city: null,
            filter_difficulty: f.difficultyId,
            filter_trail_type: f.trailTypeId,
            filter_user_status: f.status,
            limit_rows: PAGE_SIZE,
            offset_rows: pageNum * PAGE_SIZE,
          },
        );

        if (error) throw error;

        const result = data as { totalCount: number; trails: Trail[] };
        let apiTrails = result.trails ?? [];
        const countBeforeFilter = apiTrails.length;

        const cached = await getCachedTrails();
        const locallyCompleted = new Set(
          cached
            .filter((c: CachedTrail) => c.user_trail_status === 'completed')
            .map((c: CachedTrail) => c.id),
        );
        if (locallyCompleted.size > 0) {
          apiTrails = apiTrails.filter(
            t =>
              !(
                locallyCompleted.has(t.id) &&
                t.user_trail_status !== 'completed'
              ),
          );
        }

        apiTrails = apiTrails.filter(t => t.user_trail_status !== 'completed');

        const cachedUnlockedIds = new Set(
          cached
            .filter((c: CachedTrail) => c.user_trail_status === 'unlocked')
            .map((c: CachedTrail) => c.id),
        );
        for (const t of apiTrails) {
          if (
            t.user_trail_status === 'unlocked' &&
            !cachedUnlockedIds.has(t.id)
          ) {
            if (t.hidden_point) {
              downloadOfflinePack(t.id, t.hidden_point).catch(() => {});
            }
            saveTrailToCache({
              id: t.id,
              name: t.name,
              city: t.city,
              state: t.state,
              difficulty: t.difficulty,
              distance_tolerance: t.distance_tolerance,
              user_trail_status: 'unlocked',
              hidden_point: t.hidden_point,
              image_url: t.image_url,
              trail_types: t.trail_types,
              vehicle_types: t.vehicle_types,
              overview: t.overview,
              permit_requierd: t.permit_requierd,
              trail_shape: t.trail_shape,
              typically_open: t.typically_open,
              navigation_details: t.navigation_details,
              keys_to_unlock: t.keys_to_unlock,
              distance_meters: t.distance_meters,
            }).catch(() => {});
          }
        }

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
        if (pageNum === 0) {
          const cached = await getCachedTrails();
          const filtered =
            f.status === 'unlocked'
              ? cached.filter(
                  (t: CachedTrail) => t.user_trail_status === 'unlocked',
                )
              : f.status === 'locked'
              ? []
              : cached.filter(
                  (t: CachedTrail) => t.user_trail_status === 'unlocked',
                );
          if (filtered.length > 0) {
            const asTrails: Trail[] = filtered.map((t: CachedTrail) => ({
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
                  ? haversineDistance(
                      lat,
                      lon,
                      t.hidden_point.latitude,
                      t.hidden_point.longitude,
                    )
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
    },
    [],
  );

  useEffect(() => {
    if (userLat !== null && userLon !== null) {
      loadPage(0, filters, userLat, userLon, userId ?? '');
    }
  }, [userId, userLat, userLon, filters, loadPage]);

  useEffect(() => {
    const sub = onTrailCompleted(
      ({ trailId, keysAwarded }: { trailId: string; keysAwarded: number }) => {
        setTrails(prev => prev.filter(t => t.id !== trailId));
        if (keysAwarded > 0) {
          setUserKeys(prev => prev + keysAwarded);
        }
      },
    );
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const currentUserId = user?.id ?? null;
          setUserId(currentUserId);

          if (user) {
            getProfile(user.id)
              .then(p => {
                if (p) setUserKeys(p.keys ?? 0);
              })
              .catch(() => {});

            const { data: questData } = await supabase.rpc(
              'get_active_quests_and_check_user',
              {
                input_user_id: user.id,
              },
            );
            if (questData) {
              setIsUserParticipant(questData.isUserParticipant ?? false);
              setActiveQuests(questData.quests ?? []);
            }
          } else {
            setUserKeys(0);
            setIsUserParticipant(false);
          }

          if (userLat !== null && userLon !== null) {
            loadPage(0, filtersRef.current, userLat, userLon, currentUserId);
          }
        } catch {}
      };

      refresh();
    }, [userId, userLat, userLon, loadPage]),
  );

  const handleApplyFilters = useCallback((f: Filters) => {
    setFilters(f);
    setShowFilters(false);
  }, []);

  const handleStateChange = useCallback(async (stateId: string | null) => {
    setCities([]);
    if (!stateId) return;
    try {
      const { data } = await supabase.rpc('get_all_cities_by_state', {
        state_id_arg: stateId,
      });
      setCities((data as CityVariant[]) ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userLatRef.current === null || userLonRef.current === null) {
      await getLocation();
    }
    const lat = userLatRef.current;
    const lon = userLonRef.current;
    if (lat !== null && lon !== null) {
      await loadPage(0, filtersRef.current, lat, lon, userId);
      if (userId) {
        try {
          const p = await getProfile(userId);
          if (p) setUserKeys(p.keys ?? 0);
        } catch {}
      }
    }
    setRefreshing(false);
  }, [userId, loadPage, getLocation]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && userLat !== null && userLon !== null) {
      loadPage(page + 1, filters, userLat, userLon, userId);
    }
  }, [hasMore, userId, userLat, userLon, page, filters, loadPage]);

  const handleUnlock = useCallback(
    async (trail: Trail) => {
      if (!userId) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to unlock trails and earn rewards.',
        );
        return;
      }

      Alert.alert(
        'Unlock Trail',
        `Use ${trail.keys_to_unlock} key${
          trail.keys_to_unlock > 1 ? 's' : ''
        } to unlock this trail?`,
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
                    t.id === trail.id
                      ? {
                          ...t,
                          user_trail_status: 'unlocked',
                          hidden_point: data,
                        }
                      : t,
                  ),
                );
                const remaining = userKeys - trail.keys_to_unlock;
                setUserKeys(remaining);
                emitTrailUnlocked({
                  trailId: trail.id,
                  trailName: trail.name,
                  city: trail.city,
                  state: trail.state,
                  difficulty: trail.difficulty,
                  distanceTolerance: trail.distance_tolerance,
                  hiddenPoint: data,
                  keysRemaining: remaining,
                });
                setSelectedTrail(prev =>
                  prev?.id === trail.id
                    ? {
                        ...prev,
                        user_trail_status: 'unlocked',
                        hidden_point: data,
                      }
                    : prev,
                );
                Alert.alert(
                  'Trail Unlocked!',
                  `You have successfully unlocked this trail.`,
                );

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
                Alert.alert(
                  'Error',
                  err instanceof Error
                    ? err.message
                    : 'Failed to unlock trail.',
                );
              }
            },
          },
        ],
      );
    },
    [userId, userKeys],
  );

  return {
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
  };
}
