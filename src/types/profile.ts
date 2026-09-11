export type KeyPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  key_quantity: number;
};

export type PromoResult = {
  final_price: number;
  promo_code_id: string;
  discount_type: string;
  discount_value: number;
};

export type ProfileData = {
  email: string;
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  keys: number;
  totalPoints: number;
  totalTrails: number;
  totalQuests: number;
  region: string | null;
  memberSince: string | null;
  isUserParticipant: boolean;
  free_keys?: number;
  purchased_keys?: number;
  is_ad_free?: boolean;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_expires_at?: string | null;
};

