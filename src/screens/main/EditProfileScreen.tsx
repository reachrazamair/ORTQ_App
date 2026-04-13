import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import CustomInput from '../../components/common/CustomInput';
import { editProfileSchema } from '../../utils/schemas';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      setName(meta?.full_name ?? meta?.name ?? '');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setError('');

    const result = editProfileSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        <View style={styles.form}>
          <CustomInput
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={text => {
              setName(text);
              setError('');
            }}
            editable={!saving}
            error={error}
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: Colors.blueGrey,
  },
  title: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: Colors.blueGrey,
  },
  form: {
    gap: 24,
  },
  saveButton: {
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
  saveButtonText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: '#fff',
  },
});
