import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
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
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../lib/profile';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

const getStorageUrl = (bucket: string, fileName: string) =>
  `${Config.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;
};

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuRowLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? Colors.error : Colors.blueGrey}
          style={styles.menuIcon}
        />
        <Text style={[styles.menuLabel, destructive && styles.destructiveText]}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#C0C0C0" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [keys, setKeys] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalTrails, setTotalTrails] = useState(0);
  const [totalQuests, setTotalQuests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) { setLoading(false); return; }

    setEmail(user.email ?? '');

    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setDisplayName(profile.alias ?? profile.full_name ?? '');
        const rawAvatar = profile.profile_image_url ?? null;
        setAvatarUrl(rawAvatar
          ? rawAvatar.startsWith('http') ? rawAvatar : getStorageUrl('user_avatars', rawAvatar)
          : null);
        setKeys(profile.keys ?? 0);
      }
    } catch (err) {
      console.error('[ProfileScreen] getProfile failed:', err);
      const meta = user.user_metadata;
      setDisplayName(meta?.full_name ?? meta?.name ?? '');
      setAvatarUrl(meta?.avatar_url ?? null);
    }

    try {
      const { data: questRows } = await supabase
        .from('user_quests')
        .select('points_earned, trails_completed_count')
        .eq('user_id', user.id);

      if (questRows) {
        setTotalPoints(questRows.reduce((s, q) => s + (q.points_earned || 0), 0));
        setTotalTrails(questRows.reduce((s, q) => s + (q.trails_completed_count || 0), 0));
        setTotalQuests(questRows.length);
      }
    } catch (err) {
      console.error('[ProfileScreen] user_quests fetch failed:', err);
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
        },
      },
    ]);
  };

  const avatarInitial = displayName
    ? displayName.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase();

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          <View style={styles.avatarRing}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{displayName || 'Explorer'}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard value={totalPoints} label="Points" />
          <View style={styles.statDivider} />
          <StatCard value={totalTrails} label="Trails" />
          <View style={styles.statDivider} />
          <StatCard value={totalQuests} label="Quests" />
        </View>

        {/* Key Wallet */}
        <View style={styles.keyWallet}>
          <View style={styles.keyWalletLeft}>
            <Text style={styles.keyWalletTitle}>Key Wallet</Text>
            <Text style={styles.keyWalletSub}>Keys available to unlock trails</Text>
          </View>
          <View style={styles.keyCountWrap}>
            <Text style={styles.keyCount}>{keys}</Text>
            <Text style={styles.keyUnit}>Keys</Text>
          </View>
        </View>

        {/* Profile menu */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icon="person-outline"
            label="My Profile Details"
            onPress={() => navigation.navigate('ProfileDetails')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="key-outline"
            label="Key Usage & Trail Progress"
            onPress={() => navigation.navigate('KeyUsage')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="receipt-outline"
            label="Purchase History"
            onPress={() => navigation.navigate('PurchaseHistory')}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="settings-outline"
            label="Account Settings"
            onPress={() => navigation.navigate('AccountSettings')}
          />
        </View>

        <Text style={styles.sectionLabel}>App</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icon="information-circle-outline"
            label="About ORTQ"
            onPress={() => navigation.navigate('AppInfo', { title: 'About ORTQ' })}
          />
          <View style={styles.rowDivider} />
          <MenuRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => navigation.navigate('AppInfo', { title: 'Privacy Policy' })}
          />
        </View>

        <View style={[styles.menuCard, styles.signOutCard]}>
          {signingOut ? (
            <View style={styles.menuRow}>
              <ActivityIndicator color={Colors.error} />
            </View>
          ) : (
            <MenuRow
              icon="log-out-outline"
              label="Sign Out"
              onPress={handleSignOut}
              destructive
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 28,
    paddingTop: 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  editButton: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  editButtonText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: 2,
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarPlaceholder: { backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.gothamBold, fontSize: 36, color: '#fff' },
  displayName: { fontFamily: Fonts.gothamBold, fontSize: 22, color: Colors.blueGrey, marginBottom: 4 },
  emailText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#687076' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.gothamBold, fontSize: 24, color: Colors.blueGrey, marginBottom: 4 },
  statLabel: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076' },
  statDivider: { width: 1, backgroundColor: '#E8E8E8' },

  // Key Wallet
  keyWallet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  keyWalletLeft: { flex: 1 },
  keyWalletTitle: { fontFamily: Fonts.gothamBold, fontSize: 15, color: Colors.blueGrey, marginBottom: 2 },
  keyWalletSub: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076' },
  keyCountWrap: {
    alignItems: 'center',
    backgroundColor: Colors.orange + '18',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  keyCount: { fontFamily: Fonts.gothamBold, fontSize: 28, color: Colors.orange },
  keyUnit: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: Colors.orange },

  // Menu
  sectionLabel: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
  },
  menuCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  signOutCard: {
    marginTop: 24,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: { marginRight: 12 },
  menuLabel: { fontFamily: Fonts.firaSansRegular, fontSize: 15, color: Colors.blueGrey },
  destructiveText: { color: Colors.error },
  rowDivider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 48 },
});
