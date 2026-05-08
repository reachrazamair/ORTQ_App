import Config from 'react-native-config';
import { TrailStatus, Variants } from '../types/explorer';

const STORAGE_BASE = `${Config.SUPABASE_URL}/storage/v1/object/public/trails_images/`;

export function metersToMiles(m: number) {
  return m / 1609.344;
}

export function milesToMeters(miles: number) {
  return Math.round(miles * 1609.344);
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
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

export function getTrailImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return 'https://placehold.co/600x300/e2e8f0/94a3b8?text=Trail';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${STORAGE_BASE}${imageUrl}`;
}

export function getContrastColor(hex: string): string {
  if (!hex || !hex.startsWith('#')) return '#fff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1C1C1C' : '#FFFFFF';
}

export function getStatusColor(status: TrailStatus) {
  if (status === 'completed') return '#22C55E';
  if (status === 'unlocked') return '#3B82F6';
  return '#9AA0A6';
}

export function getStatusIconName(status: TrailStatus) {
  if (status === 'completed') return 'checkmark-circle';
  if (status === 'unlocked') return 'lock-open';
  return 'lock-closed';
}

export function getTrailTypeColor(name: string, variants: Variants): string {
  return (
    variants.trail_types.find(t => t.name.toLowerCase() === name.toLowerCase())
      ?.color ?? '#9AA0A6'
  );
}

import { Alert, PermissionsAndroid } from 'react-native';

export async function requestAndroidLocationPermission(): Promise<boolean> {
  try {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (already) return true;

    const userChoice = await new Promise<'ok' | 'cancel' | 'later'>(resolve => {
      Alert.alert(
        'Location Permission',
        'ORTQ needs your location to show nearby trails.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
          { text: 'Ask Me Later', onPress: () => resolve('later') },
          { text: 'OK', onPress: () => resolve('ok') },
        ],
        { cancelable: true, onDismiss: () => resolve('cancel') },
      );
    });

    if (userChoice !== 'ok') return false;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function getDifficultyColor(name: string, variants: Variants): string {
  return (
    variants.difficulty_levels.find(
      d => d.name.toLowerCase() === name.toLowerCase(),
    )?.color ?? '#9AA0A6'
  );
}
