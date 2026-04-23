import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import Config from 'react-native-config';
import { supabase } from '../../lib/supabase';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AccountSettings'>;
};

function SettingRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      {right}
    </View>
  );
}

function ActionRow({
  label,
  buttonLabel,
  onPress,
  danger,
  disabled,
}: {
  label: string;
  buttonLabel: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.actionBtn, danger && styles.actionBtnDanger, disabled && styles.actionBtnDisabled]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.actionBtnText, danger && styles.actionBtnTextDanger]}>
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }: Props) {
  const [emailVerified, setEmailVerified] = useState(false);
  const [isActiveParticipant, setIsActiveParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) { setLoading(false); return; }

        const userId = session.user.id;
        setEmailVerified(!!session.user.email_confirmed_at);

        try {
          const now = new Date().toISOString();
          const { data: activeQuests } = await supabase
            .from('quests')
            .select('id')
            .lte('start_date', now)
            .gte('end_date', now);

          if (activeQuests && activeQuests.length > 0) {
            const activeIds = activeQuests.map(q => q.id);
            const { data: participation } = await supabase
              .from('user_quests')
              .select('id')
              .eq('user_id', userId)
              .in('quest_id', activeIds)
              .limit(1);
            setIsActiveParticipant((participation?.length ?? 0) > 0);
          } else {
            setIsActiveParticipant(false);
          }
        } catch {
          setIsActiveParticipant(false);
        }

        setLoading(false);
      };
      load();
    }, []),
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Your account and all associated data will be permanently deleted immediately. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error('No active session');

              const res = await fetch(
                `${Config.SUPABASE_URL}/functions/v1/delete-self`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                },
              );

              if (!res.ok) {
                const body = await res.json();
                throw new Error(body.error ?? 'Failed to delete account');
              }

              await supabase.auth.signOut();
            } catch {
              Alert.alert('Error', 'Could not process your request. Please try again later.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Account Settings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
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
        <Text style={styles.topBarTitle}>Account Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <SettingRow
            label="Email Verification"
            right={
              emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <Text style={styles.unverifiedText}>Unverified</Text>
                </View>
              )
            }
          />
          <View style={styles.rowDivider} />
          <SettingRow
            label="Quest Participation"
            right={
              isActiveParticipant ? (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeText}>Active</Text>
                </View>
              ) : (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )
            }
          />
          <View style={styles.rowDivider} />
          <ActionRow
            label="Password"
            buttonLabel="Change"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <View style={styles.rowDivider} />
          <ActionRow
            label="Delete Account"
            buttonLabel={deleting ? 'Processing…' : 'Delete'}
            danger
            disabled={deleting}
            onPress={handleDeleteAccount}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  settingLabel: { fontFamily: Fonts.firaSansRegular, fontSize: 15, color: Colors.blueGrey },
  rowDivider: { height: 1, backgroundColor: '#F0F0F0' },

  verifiedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#fff' },

  unverifiedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unverifiedText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#92400E' },

  activeBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#fff' },

  inactiveBadge: {
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inactiveText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#687076' },

  actionBtn: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnDanger: { borderColor: '#fca5a5' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey },
  actionBtnTextDanger: { color: Colors.error },
});
