export type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    alias: string | null;
    profile_image_url: string | null;
  } | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  header_image_url: string | null;
  is_private: boolean;
  created_by: string;
  last_activity_at: string | null;
  member_count: number;
  is_member: boolean;
  user_role: 'admin' | 'member' | null;
};

export type Tab = 'feed' | 'groups' | 'discover';
