import { Filters } from '../types/explorer';

export const PAGE_SIZE = 20;
export const DISTANCE_OPTIONS = [50, 100, 150, 200, 250, 300, 350, 400];
export const STATUS_OPTIONS = ['All', 'locked', 'unlocked'] as const;

export const DEFAULT_FILTERS: Filters = {
  stateId: null,
  cityId: null,
  cityLat: null,
  cityLon: null,
  difficultyId: null,
  trailTypeId: null,
  status: null,
  distanceMeters: null,
};
