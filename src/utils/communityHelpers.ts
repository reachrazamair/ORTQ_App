import Config from 'react-native-config';
import { Post } from '../types/community';

export function getGroupImageUrl(headerImageUrl: string | null): string | null {
  if (!headerImageUrl) return null;
  if (headerImageUrl.startsWith('http')) return headerImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/community_groups/${headerImageUrl}`;
}

export function getAvatarUrl(profileImageUrl: string | null): string | null {
  if (!profileImageUrl) return null;
  if (profileImageUrl.startsWith('http')) return profileImageUrl;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/user_avatars/${profileImageUrl}`;
}

export function getDisplayName(post: Post): string {
  return post.profiles?.alias ?? post.profiles?.full_name ?? 'Quest Rider';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const POST_IMAGE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const POST_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const GROUP_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export function validateGroupForm(
  title: string,
  description: string,
): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!title.trim()) errs.title = 'Group title is required';
  else if (title.trim().length > 100)
    errs.title = 'Group title must be less than 100 characters';
  if (description.trim().length > 1000)
    errs.description = 'Description must be less than 1000 characters';
  return errs;
}
