import React, { useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { supabase } from '../../lib/supabase';
import { forgotPasswordSchema } from '../../utils/schemas';
import CustomInput from '../../components/common/CustomInput';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');

  const handleResetRequest = async () => {
    setFieldError('');

    if (!email) {
      setFieldError('Email is required');
      return;
    }

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
    );
    setLoading(false);

    if (resetError) {
      Alert.alert('Request Failed', resetError.message);
    } else {
      Alert.alert(
        'Success',
        "We've sent a password reset link to your email address.",
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
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
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.welcomeText}>Reset Password</Text>
            <Text style={styles.subText}>
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>
          </View>

          <View style={styles.form}>
            <CustomInput
              label="Email Address"
              placeholder="m@example.com"
              value={email}
              onChangeText={text => {
                setEmail(text);
                setFieldError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={fieldError}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.resetButton, loading && styles.disabledButton]}
              onPress={handleResetRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Back to Sign In</Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  backArrow: {
    fontSize: 20,
    color: Colors.blueGrey,
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
    lineHeight: 24,
    color: '#687076',
  },
  form: {
    gap: 24,
  },
  resetButton: {
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
  resetButtonText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  linkText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
