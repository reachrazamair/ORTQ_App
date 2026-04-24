import Mapbox from '@rnmapbox/maps';

const TILE_BUFFER_DEG = 0.145; // ~10 miles (16 km) radius around hidden point
const STYLE_URL = Mapbox.StyleURL.Outdoors;
const MIN_ZOOM = 10;
const MAX_ZOOM = 16;

type HiddenPoint = {
  latitude: number;
  longitude: number;
};

function packName(trailId: string) {
  return `trail-${trailId}`;
}

/**
 * Downloads Mapbox offline tiles for the area around a trail's hidden point.
 * Safe to call multiple times — skips if a pack for this trail already exists.
 * Runs silently in the background.
 */
export async function downloadOfflinePack(trailId: string, hiddenPoint: HiddenPoint): Promise<void> {
  try {
    const existing = await Mapbox.offlineManager.getPack(packName(trailId));
    if (existing) return;

    const { latitude, longitude } = hiddenPoint;
    const bounds: [[number, number], [number, number]] = [
      [longitude + TILE_BUFFER_DEG, latitude + TILE_BUFFER_DEG], // NE [lon, lat]
      [longitude - TILE_BUFFER_DEG, latitude - TILE_BUFFER_DEG], // SW [lon, lat]
    ];

    await Mapbox.offlineManager.createPack(
      { name: packName(trailId), styleURL: STYLE_URL, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, bounds },
      (_pack, status) => {
        if (__DEV__) console.log(`[OfflineMap] trail-${trailId}: ${Math.round(status.percentage ?? 0)}%`);
      },
      (_pack, error) => {
        if (__DEV__) console.warn(`[OfflineMap] trail-${trailId} error:`, error);
      },
    );
  } catch (err) {
    if (__DEV__) console.warn('[OfflineMap] downloadOfflinePack failed:', err);
  }
}

/**
 * Removes the offline pack for a trail (called after completion to free storage).
 */
export async function deleteOfflinePack(trailId: string): Promise<void> {
  try {
    const existing = await Mapbox.offlineManager.getPack(packName(trailId));
    if (existing) await Mapbox.offlineManager.deletePack(packName(trailId));
  } catch (err) {
    if (__DEV__) console.warn('[OfflineMap] deleteOfflinePack failed:', err);
  }
}
