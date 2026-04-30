import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

// ---------------------------------------------------------------------------
// Event names
// ---------------------------------------------------------------------------

const TRAIL_COMPLETED = 'trail:completed';
const TRAIL_UNLOCKED = 'trail:unlocked';
const GPS_UPDATE = 'gps:update';
const PAYMENT_SUCCESS = 'payment:success';
const PAYMENT_CANCEL = 'payment:cancel';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------

export type TrailCompletedPayload = {
  trailId: string;
  keysAwarded: number;
};

export type TrailUnlockedPayload = {
  trailId: string;
  trailName: string;
  city: string;
  state: string;
  difficulty: string;
  distanceTolerance: number;
  hiddenPoint: {
    id?: string;
    latitude: number;
    longitude: number;
    keys_awarded: number;
    points_awarded: number;
  };
  keysRemaining: number;
};

// Last known GPS position — lets late-mounting screens get an immediate fix
let _lastGpsPosition: { latitude: number; longitude: number } | null = null;

export function getLastGpsPosition(): { latitude: number; longitude: number } | null {
  return _lastGpsPosition;
}

// ---------------------------------------------------------------------------
// Emitters
// ---------------------------------------------------------------------------

export function emitTrailCompleted(payload: TrailCompletedPayload): void {
  DeviceEventEmitter.emit(TRAIL_COMPLETED, payload);
}

export function emitTrailUnlocked(payload: TrailUnlockedPayload): void {
  DeviceEventEmitter.emit(TRAIL_UNLOCKED, payload);
}

export function emitGpsUpdate(coords: { latitude: number; longitude: number }): void {
  _lastGpsPosition = coords;
  DeviceEventEmitter.emit(GPS_UPDATE, coords);
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

export function onGpsUpdate(
  handler: (coords: { latitude: number; longitude: number }) => void,
): EmitterSubscription {
  return DeviceEventEmitter.addListener(GPS_UPDATE, handler);
}

let _pendingPaymentResult: 'success' | 'cancel' | null = null;

export function getPendingPaymentResult(): 'success' | 'cancel' | null {
  return _pendingPaymentResult;
}

export function clearPendingPaymentResult(): void {
  _pendingPaymentResult = null;
}

export function emitPaymentSuccess(): void {
  _pendingPaymentResult = 'success';
  DeviceEventEmitter.emit(PAYMENT_SUCCESS);
}

export function emitPaymentCancel(): void {
  _pendingPaymentResult = 'cancel';
  DeviceEventEmitter.emit(PAYMENT_CANCEL);
}

export function onPaymentSuccess(handler: () => void): EmitterSubscription {
  return DeviceEventEmitter.addListener(PAYMENT_SUCCESS, handler);
}

export function onPaymentCancel(handler: () => void): EmitterSubscription {
  return DeviceEventEmitter.addListener(PAYMENT_CANCEL, handler);
}
