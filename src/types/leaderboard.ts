export type LeaderboardUser = {
  user_id: string;
  full_name: string;
  alias: string | null;
  leaderboard_rank: number;
  points_earned: number;
  trails_completed_count: number;
  city: string;
  state_abbreviation: string;
  profile_image_url: string | null;
  vehicle_type?: string | null;
  make?: string | null;
  model?: string | null;
  year?: string | null;
  rig_description?: string | null;
  about_me?: string | null;
};

export type RankedUser = LeaderboardUser & { position: number };

export type Region = { id: string; name: string };
