import { Coords } from '../types/map';
import { TrailStatus } from '../types/explorer';

export function metersToMiles(m: number) {
  return m / 1609.344;
}

export function haversineDistance(a: Coords, b: Coords): number {
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

export function getMarkerColor(status: TrailStatus): string {
  if (status === 'completed') return '#22C55E';
  if (status === 'unlocked') return '#3B82F6';
  return '#9AA0A6';
}

export const formatDistance = (m: number) => {
  const miles = metersToMiles(m);
  return miles >= 1 ? `${miles.toFixed(1)} mi` : `${m.toFixed(0)} m`;
};
