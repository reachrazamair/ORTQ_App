import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  getCompletionQueue,
  removeFromCompletionQueue,
  removeTrailFromCache,
} from './trailCache';
import { deleteOfflinePack } from './offlineMap';

// ---------------------------------------------------------------------------
// Core flush — callable from anywhere (MapScreen, network listener, etc.)
// ---------------------------------------------------------------------------

export async function flushCompletionQueue(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return;

  const queue = await getCompletionQueue();
  for (const entry of queue) {
    try {
      const { error } = await supabase.rpc('complete_trail', {
        v_p_user_id: entry.userId,
        v_p_trail_id: entry.trailId,
        v_p_user_lat: entry.userLat,
        v_p_user_lon: entry.userLon,
      });

      if (error) {
        console.warn(`[syncService] RPC error for trail ${entry.trailId}:`, error.message);
        continue; // Keep in queue for next attempt
      }

      await removeFromCompletionQueue(entry.trailId);
      await removeTrailFromCache(entry.trailId);
      deleteOfflinePack(entry.trailId).catch(() => {});
    } catch (err) {
      console.warn(`[syncService] Network error for trail ${entry.trailId}:`, err);
      // Still offline — leave in queue for next attempt
    }
  }
}

// ---------------------------------------------------------------------------
// Network listener — flushes queue whenever connectivity is restored
// ---------------------------------------------------------------------------

export function startNetworkSync(): () => void {
  let wasConnected: boolean | null = null;

  // 1. Initial check on startup
  flushCompletionQueue().catch(() => {});

  // 2. Continuous listener for network transitions
  const unsubscribe = NetInfo.addEventListener(state => {
    const isConnected = state.isConnected ?? false;

    // Trigger on restoration of connectivity
    if (wasConnected === false && isConnected) {
      flushCompletionQueue().catch(() => {});
    }

    wasConnected = isConnected;
  });

  return unsubscribe;
}
