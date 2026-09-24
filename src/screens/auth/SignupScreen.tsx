import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { getProfile, isProfileComplete } from '../../lib/profile';
import { signupSchema } from '../../utils/schemas';
import CustomInput from '../../components/common/CustomInput';
import { navigationRef } from '../../../App';
import {
  signInWithGoogle,
  isErrorWithCode,
  statusCodes,
} from '../../lib/googleAuth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  {
    label: 'One special character',
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

export default function SignupScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordTouched, setPasswordTouched] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setErrors({});
        setPasswordTouched(false);
      };
    }, []),
  );

  const handleSignup = async () => {
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = 'Email is required';
    if (!password) fieldErrors.password = 'Password is required';
    if (!confirmPassword)
      fieldErrors.confirmPassword = 'Please confirm your password';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const result = signupSchema.safeParse({ email, password, confirmPassword });
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
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'ortq://verify' },
    });

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    try {
      await supabase.functions.invoke('send-email', {
        body: { to: email, templateType: 'welcome' },
      });
    } catch {
      // Non-blocking — welcome email failure should not stop signup
    }

    setLoading(false);
    if (signUpData?.session) {
      if (navigationRef.isReady()) {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('Profile', { screen: 'EditProfile' });
          }
        }, 100);
      }
    } else {
      navigation.popToTop();
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
      setGoogleLoading(false);
      const userProfile = await getProfile(session.user.id);
      if (navigationRef.isReady()) {
        setTimeout(() => {
          if (navigationRef.isReady()) {
            if (!isProfileComplete(userProfile)) {
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.welcomeText}>Create Account</Text>
            <Text style={styles.subText}>Join ORTQ today and get started</Text>
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

            <View>
              <CustomInput
                label="Password"
                placeholder="********"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordTouched(true);
                  if (errors.password)
                    setErrors(prev => ({ ...prev, password: '' }));
                }}
                isPassword
                error={errors.password}
                editable={!loading}
              />

              {passwordTouched && (
                <View style={styles.rulesWrap}>
                  {PASSWORD_RULES.map(rule => {
                    const passed = rule.test(password);
                    return (
                      <View key={rule.label} style={styles.ruleRow}>
                        <Text
                          style={[
                            styles.ruleDot,
                            passed ? styles.rulePassed : styles.ruleFailed,
                          ]}
                        >
                          {passed ? '✓' : '✗'}
                        </Text>
                        <Text
                          style={[
                            styles.ruleLabel,
                            passed ? styles.rulePassed : styles.ruleFailed,
                          ]}
                        >
                          {rule.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <CustomInput
              label="Confirm Password"
              placeholder="********"
              value={confirmPassword}
              onChangeText={text => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              isPassword
              error={errors.confirmPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.signupButton, loading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupButtonText}>Sign Up</Text>
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
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.legalFooter}>
              <Text style={styles.legalText}>
                By creating an account, you agree to our{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL('https://www.ortqusa.com/terms-of-service')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL('https://www.ortqusa.com/privacy-policy')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  header: {
    marginBottom: 48,
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
  rulesWrap: {
    marginTop: 10,
    gap: 6,
    paddingLeft: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleDot: {
    fontSize: 13,
    fontFamily: Fonts.firaSansBold,
  },
  ruleLabel: {
    fontSize: 13,
    fontFamily: Fonts.firaSansRegular,
  },
  rulePassed: {
    color: Colors.success,
  },
  ruleFailed: {
    color: '#9AA0A6',
  },
  signupButton: {
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
  signupButtonText: {
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
  legalFooter: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  legalText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Colors.orange,
    fontFamily: Fonts.firaSansBold,
  },
});
