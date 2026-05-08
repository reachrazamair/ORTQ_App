import React from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Colors } from '../../theme/colors';
import { ProfileStackParamList } from '../../navigation/ProfileStack';
import { useProfile } from '../../hooks/useProfile';
import { formatMemberSince } from '../../utils/profileHelpers';
import { styles } from '../../styles/profileStyles';

// Extracted Components
import BuyKeysModal from '../../components/profile/BuyKeysModal';
import { StatCard } from '../../components/profile/StatCard';
import { MenuRow } from '../../components/profile/MenuRow';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;
};

export default function ProfileScreen({ navigation }: Props) {
  const {
    email,
    userId,
    displayName,
    avatarUrl,
    keys,
    totalPoints,
    totalTrails,
    totalQuests,
    region,
    memberSince,
    loading,
    refreshing,
    signingOut,
    buyKeysVisible,
    setBuyKeysVisible,
    handleRefresh,
    handleSignOut,
  } = useProfile();

  const avatarInitial = displayName
    ? displayName.charAt(0).toUpperCase()
    : email.charAt(0).toUpperCase();

  const formattedMemberSince = formatMemberSince(memberSince);

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

        {/* Region + Member Since */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons
              name="globe-outline"
              size={15}
              color="#9AA0A6"
              style={styles.metaIcon}
            />
            <Text style={styles.metaLabel}>Region</Text>
            <Text style={styles.metaValue}>{region ?? 'N/A'}</Text>
          </View>
          {formattedMemberSince && (
            <View
              style={[
                styles.metaRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: '#F0F0F0',
                  marginTop: 8,
                  paddingTop: 8,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#9AA0A6"
                style={styles.metaIcon}
              />
              <Text style={styles.metaLabel}>Member since</Text>
              <Text style={styles.metaValue}>{formattedMemberSince}</Text>
            </View>
          )}
        </View>

        {/* Key Wallet */}
        <View style={styles.keyWallet}>
          <View style={styles.keyWalletLeft}>
            <Text style={styles.keyWalletTitle}>Key Wallet</Text>
            <Text style={styles.keyWalletSub}>
              Keys available to unlock trails
            </Text>
          </View>
          <View style={styles.keyWalletRight}>
            <View style={styles.keyCountWrap}>
              <Text style={styles.keyCount}>{keys}</Text>
              <Text style={styles.keyUnit}>Keys</Text>
            </View>
            <TouchableOpacity
              style={styles.buyKeysBtn}
              onPress={() => setBuyKeysVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={14} color="#fff" />
              <Text style={styles.buyKeysBtnText}>Buy Keys</Text>
            </TouchableOpacity>
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
            label="App Support & Resources"
            onPress={() => navigation.navigate('AppInfo')}
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

      <BuyKeysModal
        visible={buyKeysVisible}
        userId={userId}
        onClose={() => setBuyKeysVisible(false)}
      />
    </SafeAreaView>
  );
}
