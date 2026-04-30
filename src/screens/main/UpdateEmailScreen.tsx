import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'UpdateEmail'>;
};

export default function UpdateEmailScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      if (updateError) throw new Error(updateError.message);

      Alert.alert(
        'Confirmation Sent',
        'A confirmation link has been sent to your new email address. Please check your inbox to complete the change.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Update Email</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Update Your Email</Text>
            <Text style={styles.cardDesc}>
              Enter your new email address below. You'll receive a confirmation link to complete the
              change.
            </Text>

            <Text style={styles.fieldLabel}>New Email Address</Text>
            <TextInput
              style={[styles.input, !!error && styles.inputError]}
              value={email}
              onChangeText={t => {
                setEmail(t);
                setError('');
              }}
              placeholder="name@example.com"
              placeholderTextColor="#9AA0A6"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save New Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, alignItems: 'center' },
  topBarTitle: { fontFamily: Fonts.gothamBold, fontSize: 17, color: Colors.blueGrey },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 15, color: '#fff' },
});
