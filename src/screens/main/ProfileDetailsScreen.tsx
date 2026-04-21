import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { supabase } from '../../lib/supabase';
import { getProfile, UserProfile } from '../../lib/profile';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileDetails'>;
};

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function InfoRow({ label, value, isLast }: { label: string; value?: string | null; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>
        {value || 'N/A'}
      </Text>
    </View>
  );
}

export default function ProfileDetailsScreen({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;
        if (!user) { setLoading(false); return; }

        setEmail(user.email ?? '');

        try {
          const data = await getProfile(user.id);
          setProfile(data);
        } catch (err) {
          console.error('[ProfileDetailsScreen] getProfile failed:', err);
        }

        setLoading(false);
      };

      load();
    }, []),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>My Profile Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.orange} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>My Profile Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <SectionTitle title="Personal Information" />
          <InfoRow label="Full Name" value={profile?.full_name} />
          <InfoRow label="Alias" value={profile?.alias} />
          <InfoRow label="Email" value={profile?.email ?? email} />
          <InfoRow label="Phone" value={profile?.phone} isLast />
        </View>

        <View style={styles.card}>
          <SectionTitle title="Address" />
          <InfoRow label="Street Address" value={profile?.address} />
          <InfoRow label="City" value={profile?.city?.name} />
          <InfoRow label="State" value={profile?.state?.name} />
          <InfoRow label="Zip Code" value={profile?.zip_code} />
          <InfoRow label="Region" value={profile?.state?.region?.name} isLast />
        </View>

        <View style={styles.card}>
          <SectionTitle title="Vehicle Information" />
          <InfoRow label="Vehicle Type" value={profile?.vehicle_type} />
          <InfoRow label="Make" value={profile?.make} />
          <InfoRow label="Model" value={profile?.model} />
          <InfoRow label="Year" value={profile?.year} />
          <View style={[styles.infoRow, { flexDirection: 'column', borderBottomWidth: 0 }]}>
            <Text style={[styles.infoLabel, { marginBottom: 12 }]}>Rig Description</Text>
            <Text style={[styles.aboutText, !profile?.rig_description && styles.infoValueEmpty]}>
              {profile?.rig_description || 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle title="About Me" />
          <Text style={[styles.aboutText, !profile?.about_me && styles.aboutTextEmpty]}>
            {profile?.about_me || 'N/A'}
          </Text>
        </View>
      </ScrollView>
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
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  infoLabel: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: '#687076', flex: 1 },
  infoValue: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: Colors.blueGrey, flex: 1, textAlign: 'right' },
  infoValueEmpty: { color: '#C0C0C0' },
  aboutText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: Colors.blueGrey, lineHeight: 22 },
  aboutTextEmpty: { color: '#C0C0C0' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
