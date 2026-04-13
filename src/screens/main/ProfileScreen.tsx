import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;
};

type StatCardProps = {
  value: string | number;
  label: string;
};

function StatCard({ value, label }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type MenuRowProps = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

function MenuRow({ label, onPress, destructive }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={[styles.menuLabel, destructive && styles.destructiveText]}>
        {label}
      </Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? '');
        const meta = data.user.user_metadata;
        setDisplayName(meta?.full_name ?? meta?.name ?? '');
      }
      setLoading(false);
    });
  }, []);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.orange} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <Text style={styles.displayName}>
          {displayName || 'Explorer'}
        </Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard value={0} label="Trails" />
        <View style={styles.statDivider} />
        <StatCard value={0} label="Checkpoints" />
        <View style={styles.statDivider} />
        <StatCard value={0} label="Points" />
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <MenuRow label="Edit Profile" onPress={() => navigation.navigate('EditProfile')} />
          <View style={styles.rowDivider} />
          <MenuRow label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
          <View style={styles.rowDivider} />
          <MenuRow label="Notifications" onPress={() => {}} />
        </View>
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.menuCard}>
          <MenuRow label="About ORTQ" onPress={() => {}} />
          <View style={styles.rowDivider} />
          <MenuRow label="Privacy Policy" onPress={() => {}} />
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.section}>
        <View style={styles.menuCard}>
          {signingOut ? (
            <View style={styles.menuRow}>
              <ActivityIndicator color={Colors.error} />
            </View>
          ) : (
            <MenuRow label="Sign Out" onPress={handleSignOut} destructive />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
    paddingTop: 60,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 36,
    color: '#fff',
  },
  displayName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 22,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  email: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
  },

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
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E8E8E8',
  },

  // Sections
  section: {
    marginTop: 24,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 16,
    color: Colors.blueGrey,
  },
  menuChevron: {
    fontSize: 20,
    color: '#C0C0C0',
    lineHeight: 22,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },
  destructiveText: {
    color: Colors.error,
  },
});
