import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { navigationRef } from '../../App';
import { emitPaymentSuccess, emitPaymentCancel } from '../lib/trailEvents';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const handleDeepLink = async (url: string) => {
    if (url.startsWith('ortq://payment/success')) {
      emitPaymentSuccess();
      if (navigationRef.isReady()) {
        navigationRef.navigate('Explorer');
      }
      return;
    }

    if (url.startsWith('ortq://payment/cancel')) {
      emitPaymentCancel();
      if (navigationRef.isReady()) {
        navigationRef.navigate('Explorer');
      }
      return;
    }

    if (url.startsWith('ortq://community/invite')) {
      const queryString = url.split('?')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(queryString));
      const token = params.token;
      const groupId = params.groupId;
      if (!token || !groupId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to accept this group invitation.');
        return;
      }

      try {
        const { data: invite, error } = await supabase
          .from('community_group_invitations')
          .select('id, group_id, status, community_groups(name)')
          .eq('token', token)
          .eq('status', 'pending')
          .single();

        if (error || !invite) {
          Alert.alert('Invitation Invalid', 'This invitation has already been used or has expired.');
          return;
        }

        await supabase
          .from('community_group_invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invite.id)
          .eq('status', 'pending');

        // Ignore duplicate-member error (code 23505)
        await supabase
          .from('community_group_members')
          .insert({ group_id: groupId, user_id: user.id, role: 'member' });

        const groupData = Array.isArray(invite.community_groups)
          ? invite.community_groups[0]
          : invite.community_groups;
        const groupName = (groupData as any)?.name ?? 'Group';

        Alert.alert('Invitation Accepted!', `You've joined "${groupName}".`, [
          {
            text: 'Open Group',
            onPress: () => {
              if (navigationRef.isReady()) {
                navigationRef.navigate('Community', {
                  screen: 'GroupChat',
                  params: { groupId, groupName },
                });
              }
            },
          },
        ]);
      } catch {
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
      }
      return;
    }

    if (url.startsWith('ortq://community/group')) {
      const queryString = url.split('?')[1] ?? '';
      const params = Object.fromEntries(new URLSearchParams(queryString));
      const groupId = params.groupId;
      const groupName = params.groupName ?? 'Group';
      if (navigationRef.isReady()) {
        if (groupId) {
          navigationRef.navigate('Community', {
            screen: 'GroupChat',
            params: { groupId, groupName },
          });
        } else {
          navigationRef.navigate('Community');
        }
      }
      return;
    }

    if (!url.startsWith('ortq://reset-password') && !url.startsWith('ortq://verify')) return;

    // Parse tokens from the URL fragment or query string
    const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
    const params = Object.fromEntries(new URLSearchParams(fragment));

    if (params.access_token && params.refresh_token) {
      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      if (params.type === 'recovery') {
        setIsPasswordRecovery(true);
      }
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    // Handle deep link when app is already open
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link when app is launched from a cold start
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
    });

    return () => {
      listener.subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  if (isPasswordRecovery && session) {
    return (
      <ResetPasswordScreen
        onSuccess={() => {
          setIsPasswordRecovery(false);
          if (navigationRef.isReady()) {
            navigationRef.navigate('Profile');
          }
        }}
      />
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}
