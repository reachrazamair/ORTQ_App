import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { supabase } from '../../lib/supabase';
import { getProfile, isProfileComplete, saveProfileToCache } from '../../lib/profile';
import { navigationRef } from '../../../App';
import { loginSchema } from '../../utils/schemas';
import CustomInput from '../../components/common/CustomInput';
import {
  signInWithGoogle,
  isErrorWithCode,
  statusCodes,
} from '../../lib/googleAuth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      return () => {
        setEmail('');
        setPassword('');
        setErrors({});
      };
    }, []),
  );

  const handleLogin = async () => {
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = 'Email is required';
    if (!password) fieldErrors.password = 'Password is required';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const zodErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as string;
        if (!zodErrors[field]) zodErrors[field] = issue.message;
      });
      setErrors(zodErrors);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    const profile = await getProfile(data.user.id);

    if (!profile || profile.status !== 'active') {
      await supabase.auth.signOut();
      setLoading(false);
      Alert.alert(
        'Account Unavailable',
        'Your account has been suspended or deleted. Please contact support for more information.',
      );
      return;
    }

    await saveProfileToCache(profile);
    const complete = isProfileComplete(profile);

    setLoading(false);

    if (navigationRef.isReady()) {
      setTimeout(() => {
        if (navigationRef.isReady()) {
          if (!complete) {
            (navigationRef as any).navigate('Profile', { screen: 'EditProfile' });
          } else {
            navigationRef.navigate('Explorer');
          }
        }
      }, 100);
    }
  };


  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const session = await signInWithGoogle();
      if (!session) {
        // User cancelled — do nothing
        setGoogleLoading(false);
        return;
      }

      const userProfile = await getProfile(session.user.id);

      if (userProfile && userProfile.status !== 'active') {
        await supabase.auth.signOut();
        setGoogleLoading(false);
        Alert.alert(
          'Account Unavailable',
          'Your account has been suspended or deleted. Please contact support.',
        );
        return;
      }

      if (userProfile) {
        await saveProfileToCache(userProfile);
      }
      const complete = isProfileComplete(userProfile);

      setGoogleLoading(false);
      if (navigationRef.isReady()) {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            if (!complete) {
              (navigationRef as any).navigate('Profile', { screen: 'EditProfile' });
            } else {
              navigationRef.navigate('Explorer');
            }
          }
        }, 100);
      }

    } catch (err: any) {
      setGoogleLoading(false);
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (err.code === statusCodes.IN_PROGRESS) return;
        if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert('Error', 'Google Play Services is not available on this device.');
          return;
        }
      }
      if (err.message === 'ACCOUNT_SUSPENDED') {
        Alert.alert(
          'Account Unavailable',
          'Your account has been suspended or deleted. Please contact support.',
        );
        return;
      }
      Alert.alert('Google Sign-In Failed', err.message ?? 'An unexpected error occurred.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image
              source={require('../../../assets/bootsplash/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subText}>Sign in to continue to ORTQ</Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Email Address"
              placeholder="m@example.com"
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              editable={!loading}
            />

            <CustomInput
              label="Password"
              placeholder="********"
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (errors.password)
                  setErrors(prev => ({ ...prev, password: '' }));
              }}
              isPassword
              error={errors.password}
              editable={!loading}
              labelRight={
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  disabled={loading}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* ── Or continue with ── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[
                styles.googleButton,
                (loading || googleLoading) && styles.disabledButton,
              ]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.blueGrey} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 32,
  },
  welcomeText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    marginBottom: 8,
    color: Colors.blueGrey,
  },
  subText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 16,
    color: '#687076',
  },
  form: {
    gap: 24,
  },
  forgotText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.orange,
  },
  loginButton: {
    height: 56,
    backgroundColor: Colors.orange,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: '#fff',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EAED',
  },
  dividerText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
  },
  googleButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  googleButtonText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 15,
    color: Colors.blueGrey,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },
  linkText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
