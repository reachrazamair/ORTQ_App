import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { supabase } from '../../lib/supabase';
import { loginSchema } from '../../utils/schemas';
import CustomInput from '../../components/common/CustomInput';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  useFocusEffect(
    useCallback(() => {
      return () => {
        setEmail('');
        setPassword('');
        setErrors({});
        setGeneralError('');
      };
    }, [])
  );

  const handleLogin = async () => {
    // Reset errors
    setErrors({});
    setGeneralError('');

    // Check for empty fields first (User preference)
    if (!email || !password) {
      setGeneralError('Please fill in all fields');
      return;
    }

    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      setGeneralError(error.message);
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
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>O</Text>
          </View>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subText}>Sign in to continue to ORTQ</Text>
        </View>

        <View style={styles.form}>
          <CustomInput
            label="Email Address"
            placeholder="name@example.com"
            value={email}
            onChangeText={text => {
              setEmail(text);
              if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              setGeneralError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            editable={!loading}
          />

          <CustomInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={text => {
              setPassword(text);
              if (errors.password)
                setErrors(prev => ({ ...prev, password: '' }));
              setGeneralError('');
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

          {generalError ? (
            <View style={styles.generalErrorContainer}>
              <Text style={styles.generalErrorText}>{generalError}</Text>
            </View>
          ) : null}

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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 40,
    color: '#fff',
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
  generalErrorContainer: {
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEBEB',
  },
  generalErrorText: {
    color: Colors.error,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    textAlign: 'center',
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
