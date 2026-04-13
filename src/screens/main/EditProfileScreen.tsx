import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  const [email, setEmail] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata;
        setName(meta?.full_name ?? meta?.name ?? '');
        setEmail(data.user.email ?? '');
        setAvatarUri(meta?.avatar_url ?? null);
      }
      setLoading(false);
    });
  }, []);

  const openImagePicker = () => {
    const options = { mediaType: 'photo' as const, quality: 0.8 as const };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            launchCamera(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) {
                setAvatarUri(res.assets[0].uri);
              }
            });
          } else if (buttonIndex === 2) {
            launchImageLibrary(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) {
                setAvatarUri(res.assets[0].uri);
              }
            });
          }
        },
      );
    } else {
      Alert.alert('Profile Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: () =>
            launchCamera(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) {
                setAvatarUri(res.assets[0].uri);
              }
            }),
        },
        {
          text: 'Choose from Library',
          onPress: () =>
            launchImageLibrary(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) {
                setAvatarUri(res.assets[0].uri);
              }
            }),
        },
      ]);
    }
  };

  const uploadAvatar = async (uri: string, userId: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (error) { return null; }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache so ProfileScreen shows the new image immediately
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      return null;
    }
  };

  const handleSave = async () => {
    setErrors({});

    const result = editProfileSchema.safeParse({ name, email });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string } = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'name' | 'email';
        if (!fieldErrors[field]) { fieldErrors[field] = issue.message; }
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    const currentEmail = userData.user?.email;

    // Upload avatar if changed (it's a local URI, not a remote URL)
    let avatarUrl: string | undefined;
    if (avatarUri && avatarUri.startsWith('file') && userId) {
      const uploaded = await uploadAvatar(avatarUri, userId);
      if (uploaded) { avatarUrl = uploaded; }
    }

    const metaUpdate: Record<string, string> = { full_name: name };
    if (avatarUrl) { metaUpdate.avatar_url = avatarUrl; }

    const { error: updateError } = await supabase.auth.updateUser({
      data: metaUpdate,
      ...(email !== currentEmail ? { email } : {}),
    });

    setSaving(false);

    if (updateError) {
      Alert.alert('Error', updateError.message);
    } else if (email !== currentEmail) {
      Alert.alert(
        'Confirm your new email',
        'A confirmation link has been sent to your new email address. Please check your inbox.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } else {
      navigation.goBack();
    }
  };

  const avatarInitial = name
    ? name.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase();

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={saving}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your personal information</Text>
        </View>

        {/* Avatar picker */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={openImagePicker}
          disabled={saving}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{avatarInitial}</Text>
            </View>
          )}
          <View style={styles.cameraButton}>
            <Ionicons name="pencil" size={14} color={Colors.blueGrey} />
          </View>
        </TouchableOpacity>

        <View style={styles.form}>
          <CustomInput
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={text => {
              setName(text);
              setErrors(e => ({ ...e, name: undefined }));
            }}
            editable={!saving}
            error={errors.name}
          />

          <CustomInput
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={text => {
              setEmail(text);
              setErrors(e => ({ ...e, email: undefined }));
            }}
            editable={!saving}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
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
    marginBottom: 32,
  },
  title: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.gothamBold,
    fontSize: 38,
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
