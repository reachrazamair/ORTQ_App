import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  full_name: string | null;
  alias: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  zip_code: string | null;
  vehicle_type: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
  rig_description: string | null;
  about_me: string | null;
  profile_image_url: string | null;
  keys: number;
  points: number;
  city: { id: string; name: string } | null;
  state: { id: string; name: string; abbreviation: string; region: { name: string } | null } | null;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      state:states (id, name, abbreviation, region:regions (name)),
      city:cities (id, name)
    `)
    .eq('id', userId)
    .single<UserProfile>();

  if (error) {
    if (error.code === 'PGRST116') return null; // no profile row yet
    console.error('[getProfile] error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  return data;
}

export interface UpdateProfileData {
  full_name: string;
  alias?: string;
  phone?: string;
  address?: string;
  city_id?: string | null;
  state?: string | null;
  zip_code?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
  year?: string;
  rig_description?: string;
  about_me?: string;
  profile_image_url?: string;
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileData,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
