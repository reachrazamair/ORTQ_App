import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';
import {
  UserProfile,
  getProfile,
  getCachedProfile,
  saveProfileToCache,
  isProfileComplete,
} from '../lib/profile';

// ---------------------------------------------------------------------------
// Shape
// ---------------------------------------------------------------------------

interface ProfileContextValue {
  /** True once a definitive check (cache or network) has completed. */
  checked: boolean;
  /** Null until first check; then the user profile or null if no row yet. */
  profile: UserProfile | null;
  /** Derived: isProfileComplete(profile). Defaults to true to avoid false
   *  redirects while the first check is still in flight. */
  isComplete: boolean;
  /** Call after a successful profile save to refresh the context. */
  refreshProfile: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ProfileContext = createContext<ProfileContextValue>({
  checked: false,
  profile: null,
  isComplete: true,
  refreshProfile: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface Props {
  session: Session | null;
  children: React.ReactNode;
}

export function ProfileProvider({ session, children }: Props) {
  const [checked, setChecked] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isComplete, setIsComplete] = useState(true); // start true — no flash redirect on load

  // Prevent double-fetching when session reference changes but user id stays the same
  const lastFetchedUidRef = useRef<string | null>(null);

  const fetchAndCache = useCallback(async (userId: string) => {
    try {
      // 1. Fast cache read for instant UI
      const cached = await getCachedProfile();
      if (cached) {
        setProfile(cached);
        setIsComplete(isProfileComplete(cached));
        setChecked(true);
      }

      // 2. Fresh network fetch for authoritative state
      const fresh = await getProfile(userId);
      if (fresh) {
        await saveProfileToCache(fresh);
        setProfile(fresh);
        setIsComplete(isProfileComplete(fresh));
      } else {
        // No profile row yet → definitely incomplete
        setProfile(null);
        setIsComplete(false);
      }
    } catch {
      // Network error — keep whatever we have; don't block the user
    } finally {
      setChecked(true);
    }
  }, []);

  // Re-run whenever the logged-in user changes
  useEffect(() => {
    const userId = session?.user?.id ?? null;

    if (!userId) {
      // Logged out
      setProfile(null);
      setIsComplete(true); // guests see AuthNavigator, not blocked
      setChecked(true);
      lastFetchedUidRef.current = null;
      return;
    }

    if (userId === lastFetchedUidRef.current) {
      // Same user — no need to re-fetch
      return;
    }

    lastFetchedUidRef.current = userId;
    fetchAndCache(userId);
  }, [session, fetchAndCache]);

  /** Called by EditProfileScreen after a successful save. */
  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id ?? null;
    if (!userId) return;
    // Optimistically mark complete so AppNavigator guard resolves instantly
    setIsComplete(true);
    // Then confirm with a fresh fetch and update the cache
    try {
      const fresh = await getProfile(userId);
      if (fresh) {
        await saveProfileToCache(fresh);
        setProfile(fresh);
        setIsComplete(isProfileComplete(fresh));
      }
    } catch {}
  }, [session]);

  return (
    <ProfileContext.Provider value={{ checked, profile, isComplete, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileContext(): ProfileContextValue {
  return useContext(ProfileContext);
}
