import { TrailStatus, HiddenPoint } from './explorer';

export type TrailMarker = {
  id: string;
  name: string;
  city: string;
  state: string;
  difficulty: string;
  distance_tolerance: number;
  user_trail_status: TrailStatus;
  hidden_point: HiddenPoint | null;
};

export type Coords = { latitude: number; longitude: number };
