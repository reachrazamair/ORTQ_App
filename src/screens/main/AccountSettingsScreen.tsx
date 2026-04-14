import React from 'react';
import {
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'AccountSettings'>;
};

function SettingRow({
  label,
  right,
}: {
  label: string;
  right: React.ReactNode;
}) {
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
}: {
  label: string;
  buttonLabel: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.actionBtn, danger && styles.actionBtnDanger]}
        onPress={onPress}
      >
        <Text style={[styles.actionBtnText, danger && styles.actionBtnTextDanger]}>
          {buttonLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }: Props) {
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
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            }
          />
          <View style={styles.rowDivider} />
          <SettingRow
            label="Quest Participation"
            right={
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveText}>Inactive</Text>
              </View>
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
            buttonLabel="Delete"
            danger
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'Your account will be permanently deleted in 25 days.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', style: 'destructive' },
                ],
              )
            }
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
  actionBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey },
  actionBtnTextDanger: { color: Colors.error },
});
