import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaskInput from 'react-native-mask-input';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { getProfile, updateProfile } from '../../lib/profile';
import { useProfileContext } from '../../contexts/ProfileContext';

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
  loading = false,
  onSelect,
  onClose,
  onRetry,
}: {
  visible: boolean;
  title: string;
  items: T[];
  selectedId: string;
  loading?: boolean;
  onSelect: (item: T) => void;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  const filtered = search.trim()
    ? items.filter(i => i.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

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

          {items.length > 5 && (
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search-outline" size={18} color="#9AA0A6" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search..."
                placeholderTextColor="#9AA0A6"
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9AA0A6" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {loading ? (
            <View style={styles.modalCenterContent}>
              <ActivityIndicator size="large" color={Colors.orange} />
              <Text style={styles.modalLoadingText}>Loading...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.modalCenterContent}>
              <Text style={styles.modalEmptyText}>
                {items.length === 0 ? 'No items available' : 'No matches found'}
              </Text>
              {items.length === 0 && onRetry && (
                <TouchableOpacity style={styles.modalRetryBtn} onPress={onRetry}>
                  <Text style={styles.modalRetryBtnText}>Retry Loading</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
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
          )}
        </View>
      </View>
    </Modal>
  );
}

const FIELD_ORDER: (keyof FieldErrors)[] = [
  'fullName',
  'alias',
  'phone',
  'address',
  'stateId',
  'cityId',
  'zipCode',
  'make',
  'model',
  'year',
  'rigDescription',
  'aboutMe',
];

const FIELD_SECTION_MAP: Record<string, 'personal' | 'address' | 'vehicle' | 'about'> = {
  fullName: 'personal',
  alias: 'personal',
  phone: 'personal',
  address: 'address',
  stateId: 'address',
  cityId: 'address',
  zipCode: 'address',
  make: 'vehicle',
  model: 'vehicle',
  year: 'vehicle',
  rigDescription: 'vehicle',
  aboutMe: 'about',
};

export default function EditProfileScreen({ navigation }: Props) {
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const fieldOffsets = useRef<Record<string, number>>({});

  const { refreshProfile } = useProfileContext();

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
  const [statesLoading, setStatesLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

  // Modal visibility
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  const fetchStates = useCallback(async () => {
    setStatesLoading(true);
    let loaded: StateItem[] = [];

    try {
      // 1. Check cache first so UI responds immediately
      const cached = await AsyncStorage.getItem('ortq:cached_states');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loaded = parsed;
            setStates(parsed);
          }
        } catch {}
      }

      // 2. Query both RPC and table in parallel for fastest response
      const [rpcRes, tableRes] = await Promise.all([
        (async () => {
          try { return await supabase.rpc('get_all_variants_about_trails'); }
          catch { return null; }
        })(),
        (async () => {
          try { return await supabase.from('states').select('id, name').order('name'); }
          catch { return null; }
        })(),
      ]);

      if (rpcRes?.data?.states && Array.isArray(rpcRes.data.states) && rpcRes.data.states.length > 0) {
        loaded = rpcRes.data.states;
      } else if (tableRes?.data && Array.isArray(tableRes.data) && tableRes.data.length > 0) {
        loaded = tableRes.data;
      }

      if (rpcRes?.data?.vehicle_types && Array.isArray(rpcRes.data.vehicle_types) && rpcRes.data.vehicle_types.length > 0) {
        setVehicleTypes(rpcRes.data.vehicle_types);
      }

      if (loaded.length > 0) {
        setStates(loaded);
        AsyncStorage.setItem('ortq:cached_states', JSON.stringify(loaded)).catch(() => {});
      }
    } catch (e) {
      console.warn('[EditProfileScreen] fetchStates error:', e);
    } finally {
      setStatesLoading(false);
    }
    return loaded;
  }, []);

  useEffect(() => {
    // Fast cache load on mount
    AsyncStorage.getItem('ortq:cached_states').then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStates(parsed);
          }
        } catch {}
      }
    }).catch(() => {});
    fetchStates();
  }, [fetchStates]);

  const load = useCallback(async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const user = authData.session?.user ?? (await supabase.auth.getUser()).data.user;
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? '');

      let loadedStates: StateItem[] = [];
      let loadedVehicleTypes: VehicleTypeItem[] = [];
      let profileData: any = null;

      try {
        const [variantsResult, profileResult, directStates] = await Promise.all([
          (async () => {
            try {
              return await supabase.rpc('get_all_variants_about_trails');
            } catch {
              return { data: null, error: null };
            }
          })(),
          getProfile(user.id).catch(err => {
            console.error('[EditProfileScreen] getProfile error:', err);
            return null;
          }),
          (async () => {
            try {
              const res = await supabase.from('states').select('id, name').order('name');
              return res.data;
            } catch {
              return null;
            }
          })(),
        ]);

        if (directStates && directStates.length > 0) {
          loadedStates = directStates;
        } else if (variantsResult?.data?.states) {
          loadedStates = variantsResult.data.states;
        }

        if (variantsResult?.data?.vehicle_types) {
          loadedVehicleTypes = variantsResult.data.vehicle_types;
        }
        profileData = profileResult;
      } catch (err) {
        console.warn('[EditProfileScreen] parallel load error:', err);
      }

      setStates(loadedStates);
      if (loadedVehicleTypes.length > 0) {
        setVehicleTypes(loadedVehicleTypes);
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

        const targetStateId =
          typeof profileData.state === 'object' && profileData.state?.id
            ? profileData.state.id
            : typeof profileData.state === 'string'
            ? profileData.state
            : (profileData as any).state_id ?? (profileData as any).state;

        if (targetStateId) {
          setStateId(targetStateId);
          let sName =
            typeof profileData.state === 'object' && profileData.state?.name
              ? profileData.state.name
              : '';

          if (!sName) {
            const matchedState = loadedStates.find(s => s.id === targetStateId);
            if (matchedState?.name) {
              sName = matchedState.name;
            } else {
              try {
                const { data: stRow } = await supabase
                  .from('states')
                  .select('name')
                  .eq('id', targetStateId)
                  .single();
                if (stRow?.name) sName = stRow.name;
              } catch {}
            }
          }
          setStateName(sName);

          let cityRows: CityItem[] = [];
          try {
            const { data } = await supabase.rpc('get_all_cities_by_state', {
              state_id_arg: targetStateId,
            });
            if (data && data.length > 0) {
              cityRows = data;
            }
          } catch {}

          if (cityRows.length === 0) {
            try {
              const { data: dbCities } = await supabase
                .from('cities')
                .select('id, name, latitude, longitude')
                .eq('state_id', targetStateId)
                .order('name');
              if (dbCities) cityRows = dbCities;
            } catch {}
          }

          if (cityRows.length > 0) {
            setCities(cityRows);
            const targetCityId =
              typeof profileData.city === 'object' && profileData.city?.id
                ? profileData.city.id
                : typeof profileData.city === 'string'
                ? profileData.city
                : (profileData as any).city_id ?? (profileData as any).city;

            if (targetCityId) {
              setCityId(targetCityId);
              let cName =
                typeof profileData.city === 'object' && profileData.city?.name
                  ? profileData.city.name
                  : '';
              const matchedCity = cityRows.find(c => c.id === targetCityId);
              if (matchedCity) {
                cName = cName || matchedCity.name;
                setCityLat(matchedCity.latitude ?? null);
                setCityLon(matchedCity.longitude ?? null);
              } else if (!cName) {
                try {
                  const { data: cRow } = await supabase
                    .from('cities')
                    .select('name, latitude, longitude')
                    .eq('id', targetCityId)
                    .single();
                  if (cRow) {
                    cName = cRow.name;
                    setCityLat(cRow.latitude ?? null);
                    setCityLon(cRow.longitude ?? null);
                  }
                } catch {}
              }
              setCityName(cName);
            }
          }
        }

        if (profileData.latitude) setCityLat(profileData.latitude);
        if (profileData.longitude) setCityLon(profileData.longitude);
      }
    } catch (e) {
      console.error('[EditProfileScreen] load exception:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadCitiesForState = useCallback(async (id: string) => {
    if (!id) return;
    setCitiesLoading(true);
    setCities([]);
    setCityId('');
    setCityName('');
    setCityLat(null);
    setCityLon(null);

    let cityRows: CityItem[] = [];

    // 1. Check cache first
    try {
      const cached = await AsyncStorage.getItem(`ortq:cached_cities_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cityRows = parsed;
          setCities(parsed);
        }
      }
    } catch {}

    // 2. Fetch in parallel
    try {
      const [rpcRes, dbRes] = await Promise.all([
        (async () => {
          try { return await supabase.rpc('get_all_cities_by_state', { state_id_arg: id }); }
          catch { return null; }
        })(),
        (async () => {
          try { return await supabase.from('cities').select('id, name, latitude, longitude').eq('state_id', id).order('name'); }
          catch { return null; }
        })(),
      ]);

      if (rpcRes?.data && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
        cityRows = rpcRes.data;
      } else if (dbRes?.data && Array.isArray(dbRes.data) && dbRes.data.length > 0) {
        cityRows = dbRes.data;
      }

      if (cityRows.length > 0) {
        setCities(cityRows);
        AsyncStorage.setItem(`ortq:cached_cities_${id}`, JSON.stringify(cityRows)).catch(() => {});
      }
    } catch (e) {
      console.warn('[EditProfileScreen] loadCitiesForState error:', e);
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const handleOpenStatePicker = () => {
    setStateModalOpen(true);
    if (states.length === 0) {
      fetchStates();
    }
  };

  const handleOpenCityPicker = () => {
    if (!stateId) {
      Alert.alert('Select State First', 'Please select your state before choosing a city.');
      return;
    }
    setCityModalOpen(true);
    if (cities.length === 0 && !citiesLoading) {
      loadCitiesForState(stateId);
    }
  };

  const handleBack = useCallback(() => {
    const isComplete =
      fullName.trim() !== '' &&
      alias.trim() !== '' &&
      address.trim() !== '' &&
      stateId !== '' &&
      cityId !== '';

    if (!isComplete) {
      Alert.alert(
        'Profile Incomplete',
        'You must complete your profile (Full Name, Alias, Address, State, and City) to explore trails and access all features.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await supabase.auth.signOut();
            },
          },
        ],
      );
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Explorer');
    }
  }, [fullName, alias, address, stateId, cityId, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      const isComplete =
        fullName.trim() !== '' &&
        alias.trim() !== '' &&
        address.trim() !== '' &&
        stateId !== '' &&
        cityId !== '';

      if (!isComplete) {
        handleBack();
        return true; // prevent navigating back to Explorer
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [fullName, alias, address, stateId, cityId, handleBack]);

  const openImagePicker = (type: 'avatar' | 'background') => {
    const options = { mediaType: 'photo' as const, quality: 0.8 as const };
    const onPicked = (uri: string) => {
      if (type === 'avatar') setAvatarUri(uri);
      else setBackgroundUri(uri);
    };

    const handleCameraPermissionDenied = () => {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access in your device settings to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    };

    const takePhoto = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'ORTQ needs camera access to let you capture and share photos of your off-road adventures and update your profile picture.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          handleCameraPermissionDenied();
          return;
        }
      }

      launchCamera(options, res => {
        if (res.errorCode === 'permission') {
          handleCameraPermissionDenied();
        } else if (!res.didCancel && res.assets?.[0]?.uri) {
          onPicked(res.assets[0].uri!);
        }
      });
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        buttonIndex => {
          if (buttonIndex === 1) {
            takePhoto();
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
        { text: 'Take Photo', onPress: takePhoto },
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

      const firstErrorField = FIELD_ORDER.find(f => fieldErrors[f]);
      if (firstErrorField) {
        const sec = FIELD_SECTION_MAP[firstErrorField];
        const secY = (sec && sectionOffsets.current[sec]) || 0;
        const fieldY = fieldOffsets.current[firstErrorField] || 0;
        const totalY = secY + fieldY;
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, totalY - 24),
          animated: true,
        });
      }
      return;
    }

    let latToSave = cityLat;
    let lonToSave = cityLon;
    if (!latToSave || !lonToSave) {
      const matched = cities.find(c => c.id === cityId);
      if (matched?.latitude && matched?.longitude) {
        latToSave = matched.latitude;
        lonToSave = matched.longitude;
      }
    }

    setSaving(true);

    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
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
        latitude: latToSave,
        longitude: lonToSave,
      });

      await supabase.auth.updateUser({ data: { full_name: fullName } });

      // refreshProfile() fetches the full joined profile, saves it to cache,
      // and updates the shared ProfileContext so AppNavigator immediately flips
      // isComplete → true and stops redirecting to EditProfile.
      await refreshProfile();

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
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: back button + save button */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={saving}>
              <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveHeaderBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

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

          <View style={styles.fieldGroup} onLayout={e => { sectionOffsets.current.personal = e.nativeEvent.layout.y; }}>
            <View onLayout={e => { fieldOffsets.current.fullName = e.nativeEvent.layout.y; }}>
              <CustomInput
                label="Full Name *"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={text => { setFullName(text); clearError('fullName'); }}
                editable={!saving}
                error={errors.fullName}
              />
            </View>
            <View onLayout={e => { fieldOffsets.current.alias = e.nativeEvent.layout.y; }}>
              <CustomInput
                label="Alias (Public Username) *"
                placeholder="Your trail name or nickname"
                value={alias}
                onChangeText={text => { setAlias(text); clearError('alias'); }}
                editable={!saving}
                error={errors.alias}
              />
            </View>
            <View onLayout={e => { fieldOffsets.current.phone = e.nativeEvent.layout.y; }}>
              <Text style={styles.inputLabel}>Phone (optional)</Text>
              <MaskInput
                style={[styles.maskedInput, !!errors.phone && styles.maskedInputError]}
                value={phone}
                onChangeText={(masked) => { setPhone(masked); clearError('phone'); }}
                mask={['+', '1', ' ', '(', /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/]}
                placeholder="+1 (555) 000-0000"
                keyboardType="phone-pad"
                editable={!saving}
                placeholderTextColor="#9AA0A6"
              />
              {!!errors.phone && <Text style={styles.inputError}>{errors.phone}</Text>}
            </View>
          </View>

          {/* ── Address ── */}
          <SectionHeader title="Address" />

          <View style={styles.fieldGroup} onLayout={e => { sectionOffsets.current.address = e.nativeEvent.layout.y; }}>
            <View onLayout={e => { fieldOffsets.current.address = e.nativeEvent.layout.y; }}>
              <CustomInput
                label="Address Line *"
                placeholder="123 Trail Rd"
                value={address}
                onChangeText={text => { setAddress(text); clearError('address'); }}
                editable={!saving}
                error={errors.address}
              />
            </View>

            <View onLayout={e => { fieldOffsets.current.stateId = e.nativeEvent.layout.y; }}>
              <PickerRow
                label="State *"
                value={stateName}
                placeholder={statesLoading ? 'Loading states…' : 'Select state'}
                onPress={handleOpenStatePicker}
                disabled={saving}
                error={errors.stateId}
              />
            </View>

            <View onLayout={e => { fieldOffsets.current.cityId = e.nativeEvent.layout.y; }}>
              <PickerRow
                label="City *"
                value={cityName}
                placeholder={!stateId ? 'Select state first' : citiesLoading ? 'Loading cities…' : 'Select city'}
                onPress={handleOpenCityPicker}
                disabled={saving || !stateId}
                error={errors.cityId}
              />
            </View>

            <View onLayout={e => { fieldOffsets.current.zipCode = e.nativeEvent.layout.y; }}>
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
          </View>

          {/* ── Vehicle Information ── */}
          <SectionHeader title="Vehicle Information" />

          <View style={styles.fieldGroup} onLayout={e => { sectionOffsets.current.vehicle = e.nativeEvent.layout.y; }}>
            <PickerRow
              label="Vehicle Type (optional)"
              value={vehicleType}
              placeholder="Select vehicle type"
              onPress={() => setVehicleModalOpen(true)}
              disabled={saving}
            />
            <View onLayout={e => { fieldOffsets.current.make = e.nativeEvent.layout.y; }}>
              <CustomInput
                label="Make (optional)"
                placeholder="e.g. Ford, Toyota, Jeep"
                value={make}
                onChangeText={text => { setMake(text); clearError('make'); }}
                editable={!saving}
                error={errors.make}
              />
            </View>
            <View onLayout={e => { fieldOffsets.current.model = e.nativeEvent.layout.y; }}>
              <CustomInput
                label="Model (optional)"
                placeholder="e.g. Bronco, 4Runner, Wrangler"
                value={model}
                onChangeText={text => { setModel(text); clearError('model'); }}
                editable={!saving}
                error={errors.model}
              />
            </View>
            <View onLayout={e => { fieldOffsets.current.year = e.nativeEvent.layout.y; }}>
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
            </View>

            <View onLayout={e => { fieldOffsets.current.rigDescription = e.nativeEvent.layout.y; }} style={styles.textAreaWrap}>
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

          <View style={styles.fieldGroup} onLayout={e => { sectionOffsets.current.about = e.nativeEvent.layout.y; }}>
            <View onLayout={e => { fieldOffsets.current.aboutMe = e.nativeEvent.layout.y; }} style={styles.textAreaWrap}>
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
        loading={statesLoading}
        onRetry={fetchStates}
        onSelect={item => {
          const sid = String(item.id);
          setStateId(sid);
          setStateName(item.name);
          clearError('stateId');
          setCityId('');
          setCityName('');
          setCityLat(null);
          setCityLon(null);
          loadCitiesForState(sid);
        }}
        onClose={() => setStateModalOpen(false)}
      />

      {/* City picker modal */}
      <ListPickerModal
        visible={cityModalOpen}
        title="Select City"
        items={cities}
        selectedId={cityId}
        loading={citiesLoading}
        onRetry={() => { if (stateId) loadCitiesForState(stateId); }}
        onSelect={item => {
          const cid = String(item.id);
          setCityId(cid);
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveHeaderBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
  },
  saveHeaderBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
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
  avatarWrapper: {
    alignSelf: 'center',
    marginBottom: 32,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: 2,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 48 },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
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

  inputLabel: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey, marginBottom: 6 },
  maskedInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 15,
    color: Colors.blueGrey,
    backgroundColor: '#fff',
  },
  maskedInputError: { borderColor: Colors.error },
  inputError: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: Colors.error, marginTop: 4 },

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
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    paddingVertical: 0,
  },
  modalCenterContent: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },
  modalEmptyText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 15,
    color: '#687076',
    textAlign: 'center',
  },
  modalRetryBtn: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.orange,
    borderRadius: 8,
  },
  modalRetryBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
});
