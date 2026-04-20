import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

// ---------------------------------------------------------------------------
// Event names
// ---------------------------------------------------------------------------

const TRAIL_COMPLETED = 'trail:completed';
const TRAIL_UNLOCKED = 'trail:unlocked';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export type TrailCompletedPayload = {
  trailId: string;
  keysAwarded: number;
};

export type TrailUnlockedPayload = {
  trailId: string;
  hiddenPoint: {
    id?: string;
    latitude: number;
    longitude: number;
    keys_awarded: number;
    points_awarded: number;
  };
  keysRemaining: number;
};

// ---------------------------------------------------------------------------
// Emitters
// ---------------------------------------------------------------------------

export function emitTrailCompleted(payload: TrailCompletedPayload): void {
  DeviceEventEmitter.emit(TRAIL_COMPLETED, payload);
}

export function emitTrailUnlocked(payload: TrailUnlockedPayload): void {
  DeviceEventEmitter.emit(TRAIL_UNLOCKED, payload);
}

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

export function onTrailCompleted(
  handler: (payload: TrailCompletedPayload) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(TRAIL_COMPLETED, handler);
}

export function onTrailUnlocked(
  handler: (payload: TrailUnlockedPayload) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(TRAIL_UNLOCKED, handler);
}
