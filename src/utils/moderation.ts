import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const BLOCKED_USERS_KEY = 'ortq_blocked_users';

// ---------------------------------------------------------------------------
// Content filter
// ---------------------------------------------------------------------------

const BLOCKED_WORDS = [
  'fuck', 'fuck', 'fuk', 'sh1t', 'shit', 'bitch', 'cunt', 'dick', 'pussy',
  'bastard', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'whore', 'slut',
  'rape', 'kill yourself', 'kys', 'suicide', 'bomb', 'terrorist', 'nazi',
];

/**
 * Returns true if the text contains objectionable content.
 * Used to block posts and messages before they are saved.
 */
export function containsBlockedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some(word => lower.includes(word));
}

export const reportContent = async (type: 'post' | 'message', id: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('moderation_reports')
      .insert({
        content_type: type,
        content_id: id,
        reported_by: userId,
        status: 'pending',
      });

    if (error) {
      console.warn('Report DB error:', error);
    }

    // Notify developer — required by App Store Guideline 1.2
    supabase.functions.invoke('send-email', {
      body: {
        to: 'administration@offroadtreasurequest.com',
        templateType: 'moderation_report',
        data: {
          reportType: 'flag',
          contentType: type,
          contentId: id,
          reportedByUserId: userId,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(err => console.warn('Moderation email failed:', err));

    Alert.alert(
      'Report Submitted',
      'Thank you for reporting this content. Our moderators will review it within 24 hours.',
    );
  } catch (err) {
    console.error('Report failed:', err);
    Alert.alert('Error', 'Failed to submit report. Please try again.');
  }
};

export const blockUser = async (targetUserId: string, currentUserId: string | null) => {
  try {
    // Local block — immediate UI response
    const blockedStr = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
    const blocked = blockedStr ? JSON.parse(blockedStr) : [];
    if (!blocked.includes(targetUserId)) {
      blocked.push(targetUserId);
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blocked));
    }

    // Remote block
    if (currentUserId) {
      await supabase
        .from('user_blocks')
        .insert({
          blocker_id: currentUserId,
          blocked_id: targetUserId,
        });

      // Notify developer — required by App Store Guideline 1.2
      supabase.functions.invoke('send-email', {
        body: {
          to: 'administration@offroadtreasurequest.com',
          templateType: 'moderation_report',
          data: {
            reportType: 'block',
            reportedUserId: targetUserId,
            reportedByUserId: currentUserId,
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(err => console.warn('Moderation email failed:', err));
    }

    Alert.alert(
      'User Blocked',
      'You will no longer see content from this user. Our moderation team has been notified and will review within 24 hours.',
    );
  } catch (err) {
    console.error('Block failed:', err);
    Alert.alert('Error', 'Failed to block user.');
  }
};

export const getBlockedUsers = async (): Promise<string[]> => {
  const blockedStr = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
  return blockedStr ? JSON.parse(blockedStr) : [];
};

/**
 * Fetches blocks from Supabase and merges them into local storage.
 * Call this on app start or login.
 */
export const syncBlockedUsers = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) throw error;

    if (data) {
      const remoteIds = data.map(b => b.blocked_id);
      const localIds = await getBlockedUsers();
      
      // Merge unique IDs
      const merged = Array.from(new Set([...localIds, ...remoteIds]));
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.error('Sync blocks failed:', err);
  }
  return getBlockedUsers();
};
