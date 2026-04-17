import React, { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { getProfile, updateProfile } from '../../lib/profile';

const getStorageUrl = (bucket: string, fileName: string) =>
  `${Config.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
import CustomInput from '../../components/common/CustomInput';
import { editProfileSchema, EditProfileInput } from '../../utils/schemas';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

type FieldErrors = Partial<Record<keyof EditProfileInput | 'stateId' | 'cityId', string>>;

interface StateItem { id: string; name: string }
interface CityItem { id: string; name: string; latitude: number; longitude: number }
interface VehicleTypeItem { id: string; name: string }

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function PickerRow({
  label,
  value,
  placeholder,
  onPress,
  disabled,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <View style={styles.pickerWrap}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.pickerRow, !!error && styles.pickerRowError, disabled && styles.pickerRowDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerValue, !value && styles.pickerPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9BA1A6" />
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function ListPickerModal<T extends { id: string; name: string }>({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selectedId: string;
  onSelect: (item: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, item.id === selectedId && styles.modalItemSelected]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.modalItemText, item.id === selectedId && styles.modalItemTextSelected]}>
                  {item.name}
                </Text>
                {item.id === selectedId && (
                  <Ionicons name="checkmark" size={18} color={Colors.orange} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function EditProfileScreen({ navigation }: Props) {
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [backgroundUri, setBackgroundUri] = useState<string | null>(null);
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
  const [zipCode, setZipCode] = useState('');

  // Location pickers
  const [stateId, setStateId] = useState('');
  const [stateName, setStateName] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityLat, setCityLat] = useState<number | null>(null);
  const [cityLon, setCityLon] = useState<number | null>(null);

  // Vehicle
  const [vehicleType, setVehicleType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [rigDescription, setRigDescription] = useState('');

  // About
  const [aboutMe, setAboutMe] = useState('');

  // Picker data
  const [states, setStates] = useState<StateItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Modal visibility
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? '');

      // Load picker options in parallel with profile — use same RPC as web
      const [variantsResult, profileData] = await Promise.all([
        supabase.rpc('get_all_variants_about_trails'),
        getProfile(user.id).catch(() => null),
      ]);

      console.log('[EditProfile] variants RPC:', JSON.stringify(variantsResult));
      if (variantsResult.data) {
        setStates(variantsResult.data.states ?? []);
        setVehicleTypes(variantsResult.data.vehicle_types ?? []);
      }

      if (profileData) {
        setFullName(profileData.full_name ?? '');
        setAlias(profileData.alias ?? '');
        setPhone(profileData.phone ?? '');
        setAddress(profileData.address ?? '');
        setZipCode(profileData.zip_code ?? '');
        setVehicleType(profileData.vehicle_type ?? '');
        setMake(profileData.make ?? '');
        setModel(profileData.model ?? '');
        setYear(profileData.year ?? '');
        setRigDescription(profileData.rig_description ?? '');
        setAboutMe(profileData.about_me ?? '');
        const avatarFile = profileData.profile_image_url;
        setAvatarUri(avatarFile
          ? avatarFile.startsWith('http') ? avatarFile : getStorageUrl('user_avatars', avatarFile)
          : null);
        const bgFile = profileData.background_image_url;
        setBackgroundUri(bgFile
          ? bgFile.startsWith('http') ? bgFile : getStorageUrl('user_backgrounds', bgFile)
          : null);

        if (profileData.state?.id) {
          setStateId(profileData.state.id);
          setStateName(profileData.state.name ?? '');

          // Load cities for the saved state
          const { data: cityRows } = await supabase.rpc('get_all_cities_by_state', {
            state_id_arg: profileData.state.id,
          });
          if (cityRows) setCities(cityRows);
        }

        if (profileData.city?.id) {
          setCityId(profileData.city.id);
          setCityName(profileData.city.name ?? '');
        }
        setCityLat(profileData.latitude ?? null);
        setCityLon(profileData.longitude ?? null);
      }

      setLoading(false);
    };

    load();
  }, []);

  const loadCitiesForState = async (id: string) => {
    setCitiesLoading(true);
    setCities([]);
    setCityId('');
    setCityName('');
    setCityLat(null);
    setCityLon(null);
    const { data } = await supabase.rpc('get_all_cities_by_state', { state_id_arg: id });
    if (data) setCities(data);
    setCitiesLoading(false);
  };

  const openImagePicker = (type: 'avatar' | 'background') => {
    const options = { mediaType: 'photo' as const, quality: 0.8 as const };
    const onPicked = (uri: string) => {
      if (type === 'avatar') setAvatarUri(uri);
      else setBackgroundUri(uri);
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        buttonIndex => {
          if (buttonIndex === 1) {
            launchCamera(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) onPicked(res.assets[0].uri!);
            });
          } else if (buttonIndex === 2) {
            launchImageLibrary(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) onPicked(res.assets[0].uri!);
            });
          }
        },
      );
    } else {
      Alert.alert('Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Photo',
          onPress: () =>
            launchCamera(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) onPicked(res.assets[0].uri!);
            }),
        },
        {
          text: 'Choose from Library',
          onPress: () =>
            launchImageLibrary(options, res => {
              if (!res.didCancel && res.assets?.[0]?.uri) onPicked(res.assets[0].uri!);
            }),
        },
      ]);
    }
  };

  const uploadImage = async (
    bucket: string,
    uri: string,
    pathSuffix: string,
  ): Promise<string | null> => {
    try {
      const rawExt = uri.split('.').pop()?.split('?')[0]?.split('#')[0] ?? 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExt.toLowerCase())
        ? rawExt.toLowerCase()
        : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const fileName = `${Date.now()}-${pathSuffix}.${ext}`;

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, arrayBuffer, { cacheControl: '3600', upsert: false, contentType: mimeType });

      if (error) {
        console.error('[uploadImage]', error.message);
        return null;
      }

      return fileName;
    } catch (e) {
      console.error('[uploadImage] exception:', e);
      return null;
    }
  };

  const clearError = (field: keyof FieldErrors) =>
    setErrors(e => ({ ...e, [field]: undefined }));

  const handleSave = async () => {
    setErrors({});

    const result = editProfileSchema.safeParse({
      fullName,
      alias,
      phone: phone || undefined,
      address,
      zipCode: zipCode || undefined,
      vehicleType: vehicleType || undefined,
      make: make || undefined,
      model: model || undefined,
      year: year || undefined,
      rigDescription: rigDescription || undefined,
      aboutMe: aboutMe || undefined,
    });

    const fieldErrors: FieldErrors = {};

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof EditProfileInput;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
    }

    if (!stateId) fieldErrors.stateId = 'State is required';
    if (!cityId) fieldErrors.cityId = 'City is required';

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    if (!cityLat || !cityLon) {
      Alert.alert('Error', 'Unable to determine coordinates for the selected city.');
      return;
    }

    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) { setSaving(false); return; }

    let avatarUrl: string | undefined;
    if (avatarUri && !avatarUri.startsWith('http')) {
      const fileName = await uploadImage('user_avatars', avatarUri, 'avatar');
      if (fileName) {
        avatarUrl = fileName;
        setAvatarUri(getStorageUrl('user_avatars', fileName));
      } else {
        Alert.alert('Upload Failed', 'Could not upload profile photo. Other changes will still be saved.');
      }
    }

    let backgroundUrl: string | undefined;
    if (backgroundUri && !backgroundUri.startsWith('http')) {
      const fileName = await uploadImage('user_backgrounds', backgroundUri, 'background');
      if (fileName) {
        backgroundUrl = fileName;
        setBackgroundUri(getStorageUrl('user_backgrounds', fileName));
      } else {
        Alert.alert('Upload Failed', 'Could not upload cover photo. Other changes will still be saved.');
      }
    }

    try {
      await updateProfile(userId, {
        full_name: fullName,
        alias: alias || undefined,
        phone: phone || undefined,
        address,
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
        background_image_url: backgroundUrl,
        latitude: cityLat,
        longitude: cityLon,
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

          {/* Background Image */}
          <TouchableOpacity
            style={styles.backgroundWrapper}
            onPress={() => openImagePicker('background')}
            disabled={saving}
            activeOpacity={0.85}
          >
            {backgroundUri ? (
              <Image source={{ uri: backgroundUri }} style={styles.backgroundImage} />
            ) : (
              <View style={styles.backgroundPlaceholder}>
                <Ionicons name="image-outline" size={28} color="#9BA1A6" />
                <Text style={styles.backgroundPlaceholderText}>Tap to add background photo</Text>
              </View>
            )}
            <View style={styles.backgroundEditBadge}>
              <Ionicons name="camera-outline" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={() => openImagePicker('avatar')} disabled={saving}>
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
              label="Full Name *"
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={text => { setFullName(text); clearError('fullName'); }}
              editable={!saving}
              error={errors.fullName}
            />
            <CustomInput
              label="Alias (Public Username) *"
              placeholder="Your trail name or nickname"
              value={alias}
              onChangeText={text => { setAlias(text); clearError('alias'); }}
              editable={!saving}
              error={errors.alias}
            />
            <CustomInput
              label="Phone (optional)"
              placeholder="e.g. 123-456-7890"
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
              label="Address Line *"
              placeholder="123 Trail Rd"
              value={address}
              onChangeText={text => { setAddress(text); clearError('address'); }}
              editable={!saving}
              error={errors.address}
            />

            <PickerRow
              label="State *"
              value={stateName}
              placeholder="Select state"
              onPress={() => setStateModalOpen(true)}
              disabled={saving}
              error={errors.stateId}
            />

            <PickerRow
              label="City *"
              value={cityName}
              placeholder={!stateId ? 'Select state first' : citiesLoading ? 'Loading cities…' : 'Select city'}
              onPress={() => { if (stateId && !citiesLoading) setCityModalOpen(true); }}
              disabled={saving || !stateId || citiesLoading}
              error={errors.cityId}
            />

            <CustomInput
              label="Zip Code (optional)"
              placeholder="e.g. 90210"
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
            <PickerRow
              label="Vehicle Type (optional)"
              value={vehicleType}
              placeholder="Select vehicle type"
              onPress={() => setVehicleModalOpen(true)}
              disabled={saving}
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

      {/* State picker modal */}
      <ListPickerModal
        visible={stateModalOpen}
        title="Select State"
        items={states}
        selectedId={stateId}
        onSelect={item => {
          setStateId(item.id);
          setStateName(item.name);
          clearError('stateId');
          loadCitiesForState(item.id);
        }}
        onClose={() => setStateModalOpen(false)}
      />

      {/* City picker modal */}
      <ListPickerModal
        visible={cityModalOpen}
        title="Select City"
        items={cities}
        selectedId={cityId}
        onSelect={item => {
          setCityId(item.id);
          setCityName(item.name);
          setCityLat((item as CityItem).latitude ?? null);
          setCityLon((item as CityItem).longitude ?? null);
          clearError('cityId');
        }}
        onClose={() => setCityModalOpen(false)}
      />

      {/* Vehicle type picker modal */}
      <ListPickerModal
        visible={vehicleModalOpen}
        title="Select Vehicle Type"
        items={vehicleTypes}
        selectedId={vehicleTypes.find(v => v.name === vehicleType)?.id ?? ''}
        onSelect={item => setVehicleType(item.name)}
        onClose={() => setVehicleModalOpen(false)}
      />
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

  titleWrap: { marginBottom: 24 },
  title: { fontFamily: Fonts.gothamBold, fontSize: 28, color: Colors.blueGrey, marginBottom: 6 },
  subtitle: { fontFamily: Fonts.firaSansRegular, fontSize: 15, color: '#687076' },

  // Background image
  backgroundWrapper: {
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
    position: 'relative',
  },
  backgroundImage: { width: '100%', height: '100%' },
  backgroundPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backgroundPlaceholderText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9BA1A6',
  },
  backgroundEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

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

  // Picker row
  pickerWrap: { gap: 8 },
  pickerLabel: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerRowError: { borderColor: Colors.error },
  pickerRowDisabled: { opacity: 0.5 },
  pickerValue: { fontFamily: Fonts.firaSansRegular, fontSize: 16, color: Colors.blueGrey, flex: 1 },
  pickerPlaceholder: { color: '#9BA1A6' },

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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontFamily: Fonts.gothamBold, fontSize: 17, color: Colors.blueGrey },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalItemSelected: { backgroundColor: Colors.orange + '12' },
  modalItemText: { fontFamily: Fonts.firaSansRegular, fontSize: 15, color: Colors.blueGrey },
  modalItemTextSelected: { color: Colors.orange, fontFamily: Fonts.firaSansBold },
  modalSeparator: { height: 1, backgroundColor: '#F0F0F0' },
});
