export type TrailStatus = 'locked' | 'unlocked' | 'completed';

export type HiddenPoint = {
  id: string;
  latitude: number;
  longitude: number;
  keys_awarded: number;
  points_awarded: number;
};

export type Trail = {
  id: string;
  name: string;
  image_url: string | null;
  user_trail_status: TrailStatus;
  trail_types: string[];
  difficulty: string;
  city: string;
  state: string;
  distance_meters: number | null;
  vehicle_types: string[];
  overview: string;
  permit_requierd: string | null;
  trail_shape: string;
  typically_open: string;
  distance_tolerance: number;
  navigation_details: string | null;
  keys_to_unlock: number;
  hidden_point: HiddenPoint | null;
};

export type Variant = { id: string; name: string; color: string };
export type BaseVariant = { id: string; name: string };
export type CityVariant = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

export type PromoResult = {
  promo_code_id: string;
  original_price: number;
  final_price: number;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  price: number;
  keys_provided: number;
  start_date: string;
  end_date: string;
  status: string;
};

export type Variants = {
  trail_types: Variant[];
  difficulty_levels: Variant[];
  states: BaseVariant[];
};

export type Filters = {
  stateId: string | null;
  cityId: string | null;
  cityLat: number | null;
  cityLon: number | null;
  difficultyId: string | null;
  trailTypeId: string | null;
  status: string | null;
  distanceMeters: number | null;
};
