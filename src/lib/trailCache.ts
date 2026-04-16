import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  unlockedTrails: 'ortq:unlocked_trails',
  completionQueue: 'ortq:completion_queue',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CachedTrail = {
  id: string;
  name: string;
  city: string;
  state: string;
  difficulty: string;
  distance_tolerance: number;
  user_trail_status: 'unlocked' | 'completed';
  hidden_point: {
    id: string;
    latitude: number;
    longitude: number;
    keys_awarded: number;
    points_awarded: number;
  } | null;
  // Full trail card fields — populated on unlock from Explore
  image_url?: string | null;
  trail_types?: string[];
  vehicle_types?: string[];
  overview?: string;
  permit_requierd?: string | null;
  trail_shape?: string;
  typically_open?: string;
  navigation_details?: string | null;
  keys_to_unlock?: number;
  distance_meters?: number | null;
};

export type QueuedCompletion = {
  trailId: string;
  userId: string;
  userLat: number;
  userLon: number;
  queuedAt: number;
};

// ---------------------------------------------------------------------------
// Unlocked trails cache
// ---------------------------------------------------------------------------

export async function getCachedTrails(): Promise<CachedTrail[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.unlockedTrails);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveTrailToCache(trail: CachedTrail): Promise<void> {
  try {
    const existing = await getCachedTrails();
    const filtered = existing.filter(t => t.id !== trail.id);
    await AsyncStorage.setItem(
      KEYS.unlockedTrails,
      JSON.stringify([...filtered, trail]),
    );
  } catch {}
}

export async function removeTrailFromCache(trailId: string): Promise<void> {
  try {
    const existing = await getCachedTrails();
    await AsyncStorage.setItem(
      KEYS.unlockedTrails,
      JSON.stringify(existing.filter(t => t.id !== trailId)),
    );
  } catch {}
}

export async function updateTrailStatusInCache(
  trailId: string,
  status: 'unlocked' | 'completed',
): Promise<void> {
  try {
    const existing = await getCachedTrails();
    const updated = existing.map(t =>
      t.id === trailId ? { ...t, user_trail_status: status } : t,
    );
    await AsyncStorage.setItem(KEYS.unlockedTrails, JSON.stringify(updated));
  } catch {}
}

export async function saveAllTrailsToCache(trails: CachedTrail[]): Promise<void> {
  try {
    // Merge with existing — preserve any completed status set offline
    const existing = await getCachedTrails();
    const existingMap = Object.fromEntries(existing.map(t => [t.id, t]));
    const merged = trails.map(t => ({
      ...t,
      // Keep completed status if we marked it offline
      user_trail_status:
        existingMap[t.id]?.user_trail_status === 'completed'
          ? 'completed'
          : t.user_trail_status,
    }));
    await AsyncStorage.setItem(KEYS.unlockedTrails, JSON.stringify(merged));
  } catch {}
}

// ---------------------------------------------------------------------------
// Completion queue
// ---------------------------------------------------------------------------

export async function getCompletionQueue(): Promise<QueuedCompletion[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.completionQueue);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToCompletionQueue(entry: QueuedCompletion): Promise<void> {
  try {
    const queue = await getCompletionQueue();
    // Avoid duplicates
    if (queue.some(q => q.trailId === entry.trailId)) return;
    await AsyncStorage.setItem(
      KEYS.completionQueue,
      JSON.stringify([...queue, entry]),
    );
  } catch {}
}

export async function removeFromCompletionQueue(trailId: string): Promise<void> {
  try {
    const queue = await getCompletionQueue();
    await AsyncStorage.setItem(
      KEYS.completionQueue,
      JSON.stringify(queue.filter(q => q.trailId !== trailId)),
    );
  } catch {}
}
