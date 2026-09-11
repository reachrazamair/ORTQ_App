import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { supabase } from './supabase';
import { getProfile } from './profile';

GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
});

export async function signInWithGoogle() {
  // Ensure Google Play Services is available
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Trigger the Google sign-in prompt
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    // User cancelled the sign-in
    return null;
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In did not return an ID token.');
  }

  // Hand the Google ID token to Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  });

  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase.');

  // Fetch or create the user profile
  let profile = await getProfile(data.user.id);

  if (!profile) {
    // First-time Google sign-in — create a minimal profile row
    const email = data.user.email ?? '';
    const fullName =
      data.user.user_metadata?.full_name ??
      data.user.user_metadata?.name ??
      '';

    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      status: 'active',
      keys: 0,
    });

    // Ignore duplicate-key errors (profile may have been created by a DB trigger)
    if (insertError && insertError.code !== '23505') {
      throw new Error(insertError.message);
    }

    // Re-fetch after insert
    profile = await getProfile(data.user.id);
  }

  if (!profile || profile.status !== 'active') {
    await supabase.auth.signOut();
    throw new Error('ACCOUNT_SUSPENDED');
  }

  return data.session;
}

export { isErrorWithCode, statusCodes };
