import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import { supabase } from '../lib/supabase';
import { flushCompletionQueue } from '../lib/syncService';
import {
  getCachedTrails,
  saveAllTrailsToCache,
  getCompletionQueue,
} from '../lib/trailCache';
import {
  onTrailCompleted,
  onTrailUnlocked,
  onGpsUpdate,
  getLastGpsPosition,
} from '../lib/trailEvents';
import { Coords, TrailMarker } from '../types/map';
import { TrailStatus } from '../types/explorer';

type MapRouteParams = { trailId?: string };

export function useMap() {
  const route = useRoute<RouteProp<{ Map: MapRouteParams }, 'Map'>>();
  const navigation = useNavigation<any>();
  const focusedTrailId = route.params?.trailId ?? null;

  const cameraRef = useRef<Mapbox.Camera>(null);

  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [trails, setTrails] = useState<TrailMarker[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<TrailMarker | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const completedIds = useRef<Set<string>>(new Set());
  const isFollowingRef = useRef(true);

  // When Explorer unlocks a trail, add its marker without a full reload
  useEffect(() => {
    const sub = onTrailUnlocked(
      ({
        trailId,
        trailName,
        city,
        state,
        difficulty,
        distanceTolerance,
        hiddenPoint,
      }) => {
        setTrails(prev => {
          const existing = prev.find(t => t.id === trailId);
          if (!existing) {
            return [
              ...prev,
              {
                id: trailId,
                name: trailName,
                city,
                state,
                difficulty,
                distance_tolerance: distanceTolerance,
                user_trail_status: 'unlocked' as TrailStatus,
                hidden_point: hiddenPoint as any,
              },
            ];
          }
          return prev.map(t =>
            t.id === trailId
              ? {
                  ...t,
                  user_trail_status: 'unlocked',
                  hidden_point: hiddenPoint as any,
                }
              : t,
          );
        });
      },
    );
    return () => sub.remove();
  }, []);

  // When AppNavigator completes a trail, update the marker and close the info sheet
  useEffect(() => {
    const sub = onTrailCompleted(({ trailId }) => {
      setTrails(prev =>
        prev.map(t =>
          t.id === trailId ? { ...t, user_trail_status: 'completed' } : t,
        ),
      );
      setSelectedTrail(prev => (prev?.id === trailId ? null : prev));
    });
    return () => sub.remove();
  }, []);

  // --- Init: static stuff ---
  useEffect(() => {
    const init = async () => {
      const queue = await getCompletionQueue();
      queue.forEach(q => completedIds.current.add(q.trailId));

      setLoading(false);
      flushCompletionQueue().catch(() => {});
    };
    init();
  }, []);

  // --- Flush queue + sync markers on focus ---
  useFocusEffect(
    useCallback(() => {
      const refresh = async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const uid = user?.id ?? null;
          setUserId(uid);

          const { data, error } = await supabase.rpc(
            'get_user_trails_markers',
            {
              p_user_id: uid,
            },
          );

          if (!error && data) {
            const markers = (data as TrailMarker[]).map(t => ({
              ...t,
              user_trail_status: completedIds.current.has(t.id)
                ? ('completed' as TrailStatus)
                : t.user_trail_status,
            }));
            markers.forEach(t => {
              if (t.user_trail_status === 'completed')
                completedIds.current.add(t.id);
            });
            setTrails(markers);

            const cacheable = markers.filter(
              m => m.user_trail_status !== 'locked',
            );
            saveAllTrailsToCache(cacheable as any).catch(() => {});
          } else {
            const cached = await getCachedTrails();
            if (cached.length > 0) {
              cached.forEach(t => {
                if (t.user_trail_status === 'completed')
                  completedIds.current.add(t.id);
              });
              setTrails(cached as TrailMarker[]);
            }
          }
        } catch (err) {
          console.error('[MapScreen] Refresh failed:', err);
        }
        flushCompletionQueue().catch(() => {});
      };

      refresh();
    }, []),
  );

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    const applyCoords = (coords: { latitude: number; longitude: number }) => {
      setUserCoords(coords);
      if (isFollowingRef.current) {
        cameraRef.current?.setCamera({
          centerCoordinate: [coords.longitude, coords.latitude],
          animationDuration: 500,
        });
      }
    };

    const last = getLastGpsPosition();
    if (last) applyCoords(last);

    const sub = onGpsUpdate(applyCoords);
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!focusedTrailId) return;
      const trail = trails.find(t => t.id === focusedTrailId);
      if (!trail?.hidden_point) return;
      setIsFollowing(false);
      setSelectedTrail(trail);
      const timer = setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: [
            trail.hidden_point!.longitude,
            trail.hidden_point!.latitude,
          ],
          zoomLevel: 15,
          animationDuration: 800,
        });
        navigation.setParams({ trailId: undefined });
      }, 350);
      return () => clearTimeout(timer);
    }, [focusedTrailId, trails, navigation]),
  );

  const handleRecenter = () => {
    if (!userCoords) return;
    setIsFollowing(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [userCoords.longitude, userCoords.latitude],
      zoomLevel: 15,
      animationDuration: 600,
    });
  };

  const initialCenterRef = useRef<[number, number] | null>(null);
  if (initialCenterRef.current === null) {
    const coords = getLastGpsPosition();
    initialCenterRef.current = coords
      ? [coords.longitude, coords.latitude]
      : [-104.9903, 39.7392];
  }

  return {
    cameraRef,
    userCoords,
    trails,
    userId,
    selectedTrail,
    isFollowing,
    loading,
    initialCenter: initialCenterRef.current,
    setSelectedTrail,
    setIsFollowing,
    handleRecenter,
  };
}
