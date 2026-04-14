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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { getProfile, updateProfile } from '../../lib/profile';
import CustomInput from '../../components/common/CustomInput';
import { editProfileSchema, EditProfileInput } from '../../utils/schemas';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

type FieldErrors = Partial<Record<keyof EditProfileInput, string>>;

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function EditProfileScreen({ navigation }: Props) {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Personal
  const [fullName, setFullName] = useState('');
  const [alias, setAlias] = useState('');
  const [phone, setPhone] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Vehicle
  const [vehicleType, setVehicleType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [rigDescription, setRigDescription] = useState('');

  // About
  const [aboutMe, setAboutMe] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? '');

      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setFullName(profile.full_name ?? '');
          setAlias(profile.alias ?? '');
          setPhone(profile.phone ?? '');
          setAddress(profile.address ?? '');
          setCity(profile.city?.name ?? '');
          setState(profile.state?.name ?? '');
          setZipCode(profile.zip_code ?? '');
          setVehicleType(profile.vehicle_type ?? '');
          setMake(profile.make ?? '');
          setModel(profile.model ?? '');
          setYear(profile.year ?? '');
          setRigDescription(profile.rig_description ?? '');
          setAboutMe(profile.about_me ?? '');
          setAvatarUri(profile.profile_image_url ?? null);
        }
      } catch (err) {
        console.error('[EditProfileScreen] getProfile failed:', err);
      }

      setLoading(false);
    };

    load();
  }, []);

  const openImagePicker = () => {
    const options = { mediaType: 'photo' as const, quality: 0.8 as const };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
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
              if (!res.didCancel && res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
            }),
        },
        {
          text: 'Choose from Library',
          onPress: () =>
            launchImageLibrary(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
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

      if (error) return null;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      return null;
    }
  };

  const clearError = (field: keyof EditProfileInput) =>
    setErrors(e => ({ ...e, [field]: undefined }));

  const handleSave = async () => {
    setErrors({});

    const result = editProfileSchema.safeParse({
      fullName,
      alias: alias || undefined,
      phone: phone || undefined,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || undefined,
      vehicleType: vehicleType || undefined,
      make: make || undefined,
      model: model || undefined,
      year: year || undefined,
      rigDescription: rigDescription || undefined,
      aboutMe: aboutMe || undefined,
    });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof EditProfileInput;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setSaving(false); return; }

    let avatarUrl: string | undefined;
    if (avatarUri && avatarUri.startsWith('file')) {
      const uploaded = await uploadAvatar(avatarUri, userId);
      if (uploaded) avatarUrl = uploaded;
    }

    try {
      let cityId: string | null = null;
      if (city) {
        const { data: cityRows } = await supabase
          .from('cities')
          .select('id')
          .ilike('name', city)
          .limit(1);
        cityId = cityRows?.[0]?.id ?? null;
      }

      let stateId: string | null = null;
      if (state) {
        const { data: stateRows } = await supabase
          .from('states')
          .select('id')
          .ilike('name', state)
          .limit(1);
        stateId = stateRows?.[0]?.id ?? null;
      }

      await updateProfile(userId, {
        full_name: fullName,
        alias: alias || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city_id: cityId,
        state: stateId,
        zip_code: zipCode || undefined,
        vehicle_type: vehicleType || undefined,
        make: make || undefined,
        model: model || undefined,
        year: year || undefined,
        rig_description: rigDescription || undefined,
        about_me: aboutMe || undefined,
        profile_image_url: avatarUrl,
      });

      await supabase.auth.updateUser({ data: { full_name: fullName } });

      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const avatarInitial = fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Back + Title */}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>Update your personal information</Text>
          </View>

          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={openImagePicker} disabled={saving}>
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

          {/* ── Personal Information ── */}
          <SectionHeader title="Personal Information" />

          <View style={styles.fieldGroup}>
            <CustomInput
              label="Full Name"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={text => { setFullName(text); clearError('fullName'); }}
              editable={!saving}
              error={errors.fullName}
            />
            <CustomInput
              label="Alias (optional)"
              placeholder="Your trail name or nickname"
              value={alias}
              onChangeText={text => { setAlias(text); clearError('alias'); }}
              editable={!saving}
              error={errors.alias}
            />
            <CustomInput
              label="Phone (optional)"
              placeholder="Enter your phone number"
              value={phone}
              onChangeText={text => { setPhone(text); clearError('phone'); }}
              editable={!saving}
              error={errors.phone}
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Address ── */}
          <SectionHeader title="Address" />

          <View style={styles.fieldGroup}>
            <CustomInput
              label="Street Address (optional)"
              placeholder="123 Trail Rd"
              value={address}
              onChangeText={text => { setAddress(text); clearError('address'); }}
              editable={!saving}
              error={errors.address}
            />
            <CustomInput
              label="City (optional)"
              placeholder="Enter your city"
              value={city}
              onChangeText={text => { setCity(text); clearError('city'); }}
              editable={!saving}
              error={errors.city}
            />
            <CustomInput
              label="State (optional)"
              placeholder="Enter your state"
              value={state}
              onChangeText={text => { setState(text); clearError('state'); }}
              editable={!saving}
              error={errors.state}
            />
            <CustomInput
              label="Zip Code (optional)"
              placeholder="Enter your zip code"
              value={zipCode}
              onChangeText={text => { setZipCode(text); clearError('zipCode'); }}
              editable={!saving}
              error={errors.zipCode}
              keyboardType="numeric"
            />
          </View>

          {/* ── Vehicle Information ── */}
          <SectionHeader title="Vehicle Information" />

          <View style={styles.fieldGroup}>
            <CustomInput
              label="Vehicle Type (optional)"
              placeholder="e.g. Truck, Jeep, SUV"
              value={vehicleType}
              onChangeText={text => { setVehicleType(text); clearError('vehicleType'); }}
              editable={!saving}
              error={errors.vehicleType}
            />
            <CustomInput
              label="Make (optional)"
              placeholder="e.g. Ford, Toyota, Jeep"
              value={make}
              onChangeText={text => { setMake(text); clearError('make'); }}
              editable={!saving}
              error={errors.make}
            />
            <CustomInput
              label="Model (optional)"
              placeholder="e.g. Bronco, 4Runner, Wrangler"
              value={model}
              onChangeText={text => { setModel(text); clearError('model'); }}
              editable={!saving}
              error={errors.model}
            />
            <CustomInput
              label="Year (optional)"
              placeholder="e.g. 2022"
              value={year}
              onChangeText={text => { setYear(text); clearError('year'); }}
              editable={!saving}
              error={errors.year}
              keyboardType="numeric"
              maxLength={4}
            />

            {/* Multiline for rig description */}
            <View style={styles.textAreaWrap}>
              <Text style={styles.textAreaLabel}>Rig Description (optional)</Text>
              <TextInput
                style={[styles.textArea, !!errors.rigDescription && styles.textAreaError]}
                placeholder="Describe your build, lift, tires, mods..."
                placeholderTextColor="#9BA1A6"
                value={rigDescription}
                onChangeText={text => { setRigDescription(text); clearError('rigDescription'); }}
                editable={!saving}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              {errors.rigDescription && (
                <Text style={styles.errorText}>{errors.rigDescription}</Text>
              )}
            </View>
          </View>

          {/* ── About Me ── */}
          <SectionHeader title="About Me" />

          <View style={styles.fieldGroup}>
            <View style={styles.textAreaWrap}>
              <Text style={styles.textAreaLabel}>Tell the community about yourself (optional)</Text>
              <TextInput
                style={[styles.textArea, !!errors.aboutMe && styles.textAreaError]}
                placeholder="Weekend explorer, lover of remote roads..."
                placeholderTextColor="#9BA1A6"
                value={aboutMe}
                onChangeText={text => { setAboutMe(text); clearError('aboutMe'); }}
                editable={!saving}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.aboutMe && (
                <Text style={styles.errorText}>{errors.aboutMe}</Text>
              )}
            </View>
          </View>

          {/* Save */}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 24, paddingBottom: 48, flexGrow: 1 },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  backArrow: { fontSize: 20, color: Colors.blueGrey },

  titleWrap: { marginBottom: 32 },
  title: { fontFamily: Fonts.gothamBold, fontSize: 28, color: Colors.blueGrey, marginBottom: 6 },
  subtitle: { fontFamily: Fonts.firaSansRegular, fontSize: 15, color: '#687076' },

  // Avatar
  avatarWrapper: { alignSelf: 'center', marginBottom: 32 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: Fonts.gothamBold, fontSize: 38, color: '#fff' },
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

  // Section headers
  sectionHeader: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },

  fieldGroup: { gap: 20, marginBottom: 24 },

  // Multiline textarea
  textAreaWrap: { gap: 8 },
  textAreaLabel: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  textArea: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 16,
    color: Colors.blueGrey,
    minHeight: 90,
  },
  textAreaError: { borderColor: Colors.error },
  errorText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: Colors.error,
    marginLeft: 4,
  },

  // Save button
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
  disabledButton: { opacity: 0.7 },
  saveButtonText: { fontFamily: Fonts.gothamBold, fontSize: 16, color: '#fff' },
});
