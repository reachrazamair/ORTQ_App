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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import CustomInput from '../../components/common/CustomInput';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type Props = {
  onSuccess: () => void;
};

export default function ResetPasswordScreen({ onSuccess }: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordTouched, setPasswordTouched] = useState(false);

  const handleReset = async () => {
    setErrors({});

    const fieldErrors: Record<string, string> = {};
    if (!password) fieldErrors.password = 'Password is required';
    if (!confirmPassword) fieldErrors.confirmPassword = 'Please confirm your password';
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const failed = PASSWORD_RULES.find(r => !r.test(password));
    if (failed) {
      setErrors({ password: failed.label });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Your password has been reset.', [
        { text: 'OK', onPress: onSuccess },
      ]);
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
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>Choose a strong password for your account</Text>
          </View>

          <View style={styles.form}>
            <View>
              <CustomInput
                label="New Password"
                placeholder="********"
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordTouched(true);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
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
                        <Text style={[styles.ruleDot, passed ? styles.rulePassed : styles.ruleFailed]}>
                          {passed ? '✓' : '✗'}
                        </Text>
                        <Text style={[styles.ruleLabel, passed ? styles.rulePassed : styles.ruleFailed]}>
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
                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
              }}
              isPassword
              error={errors.confirmPassword}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
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
    marginBottom: 48,
    marginTop: 32,
  },
  title: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
    marginBottom: 8,
  },
  subtitle: {
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
  button: {
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
  buttonText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: '#fff',
  },
});
