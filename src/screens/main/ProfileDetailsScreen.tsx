import React from 'react';
import {
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
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileDetails'>;
};

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>
        {value || 'N/A'}
      </Text>
    </View>
  );
}

export default function ProfileDetailsScreen({ navigation }: Props) {
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
          <InfoRow label="Full Name" />
          <InfoRow label="Alias" />
          <InfoRow label="Email" />
          <InfoRow label="Phone" />
        </View>

        <View style={styles.card}>
          <SectionTitle title="Address" />
          <InfoRow label="Street Address" />
          <InfoRow label="City" />
          <InfoRow label="State" />
          <InfoRow label="Zip Code" />
          <InfoRow label="Region" />
        </View>

        <View style={styles.card}>
          <SectionTitle title="Vehicle Information" />
          <InfoRow label="Vehicle Type" />
          <InfoRow label="Make" />
          <InfoRow label="Model" />
          <InfoRow label="Year" />
          <InfoRow label="Rig Description" />
        </View>

        <View style={styles.card}>
          <SectionTitle title="About Me" />
          <Text style={styles.aboutText}>N/A</Text>
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
  aboutText: { fontFamily: Fonts.firaSansRegular, fontSize: 14, color: '#C0C0C0', lineHeight: 22 },
});
