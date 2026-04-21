import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Colors } from '../theme/colors';
import { supabase } from '../lib/supabase';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const handleDeepLink = async (url: string) => {
    if (!url.startsWith('ortq://reset-password') && !url.startsWith('ortq://verify')) return;

    // Parse tokens from the URL fragment or query string
    const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
    const params = Object.fromEntries(new URLSearchParams(fragment));

    if (params.access_token && params.refresh_token) {
      await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
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
        }}
      />
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}
