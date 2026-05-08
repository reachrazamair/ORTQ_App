import Config from 'react-native-config';
import { LeaderboardUser } from '../types/leaderboard';

export const getAvatarUrl = (raw: string | null): string | null => {
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  return `${Config.SUPABASE_URL}/storage/v1/object/public/user_avatars/${raw}`;
};

export function getUserName(user: LeaderboardUser) {
  return user.alias ?? user.full_name ?? 'Quest Participant';
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .join('');
}

export function getCompletedTrailsText(count: number) {
  return count === 1 ? '1 Completed Trail' : `${count} Completed Trails`;
}

export const MEDAL_COLORS: Record<number, string> = {
  1: '#F59E0B', // gold
  2: '#9CA3AF', // silver
  3: '#B45309', // bronze
};
