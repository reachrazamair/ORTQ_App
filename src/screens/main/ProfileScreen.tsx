import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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

type KeyPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discounted_price: number | null;
  key_quantity: number;
};

type PromoResult = {
  final_price: number;
  promo_code_id: string;
  discount_type: string;
  discount_value: number;
};

// ---------------------------------------------------------------------------
// BuyKeysModal
// ---------------------------------------------------------------------------

function BuyKeysModal({
  visible,
  userId,
  onClose,
}: {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}) {
  const [packages, setPackages] = useState<KeyPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selected, setSelected] = useState<KeyPackage | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleOpen = useCallback(async () => {
    setLoadingPackages(true);
    const { data, error } = await supabase
      .from('key_packages')
      .select('id, name, description, price, discounted_price, key_quantity')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) setPackages(data as KeyPackage[]);
    setLoadingPackages(false);
  }, []);

  React.useEffect(() => {
    if (visible) {
      setSelected(null);
      setPromoCode('');
      setPromoError('');
      setPromoResult(null);
      handleOpen();
    }
  }, [visible, handleOpen]);

  const handleClose = () => {
    setSelected(null);
    setPromoCode('');
    setPromoError('');
    setPromoResult(null);
    onClose();
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) { setPromoError('Promo code cannot be empty.'); return; }
    if (!selected) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const { data, error } = await supabase.rpc('get_promo_code_discount', {
        input_code: promoCode.trim().toUpperCase(),
        key_package_id: selected.id,
      });
      if (error || !data || !data.length || !data[0].final_price) {
        throw new Error('Promo code cannot be used.');
      }
      setPromoResult(data[0] as PromoResult);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Promo code cannot be used.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected || !userId) return;
    setPaying(true);
    try {
      const price = promoResult ? promoResult.final_price : (selected.discounted_price ?? selected.price);
      const unitAmount = Math.round(price * 100);
      const enc = encodeURIComponent;

      const parts = [
        'submit_type=pay',
        'mode=payment',
        `line_items[0][price_data][currency]=usd`,
        `line_items[0][price_data][product_data][name]=${enc(selected.name)}`,
        `line_items[0][price_data][unit_amount]=${unitAmount}`,
        `line_items[0][quantity]=1`,
        `metadata[profileId]=${enc(userId)}`,
        `metadata[packageId]=${enc(selected.id)}`,
        `metadata[quantity]=${selected.key_quantity}`,
        `metadata[package_name]=${enc(selected.name)}`,
        `success_url=${enc('ortq://payment/success?session_id={CHECKOUT_SESSION_ID}')}`,
        `cancel_url=${enc('ortq://payment/cancel')}`,
      ];
      if (promoResult) {
        parts.push(`metadata[promoCodeId]=${enc(promoResult.promo_code_id)}`);
      }

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Config.STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: parts.join('&'),
      });
      const session = await response.json();
      if (!response.ok) throw new Error(session?.error?.message ?? 'Failed to start checkout.');
      await Linking.openURL(session.url);
      handleClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const displayPrice = selected
    ? promoResult
      ? promoResult.final_price
      : (selected.discounted_price ?? selected.price)
    : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selected ? 'Confirm Purchase' : 'Purchase Keys'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          {loadingPackages ? (
            <View style={styles.modalCentered}>
              <ActivityIndicator color={Colors.orange} />
            </View>
          ) : !selected ? (
            // ---- Package list ----
            <>
              <Text style={styles.modalSubtitle}>
                Select a key package to add more keys to your wallet.
              </Text>
              {packages.length === 0 ? (
                <View style={styles.modalCentered}>
                  <Text style={styles.noPackagesText}>
                    No key packages are available at the moment.
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  {packages.map(pkg => (
                    <TouchableOpacity
                      key={pkg.id}
                      style={styles.packageCard}
                      onPress={() => setSelected(pkg)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.packageCardTop}>
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <View style={styles.packagePriceWrap}>
                          {pkg.discounted_price != null ? (
                            <>
                              <Text style={styles.packagePriceStrike}>
                                ${pkg.price.toFixed(2)}
                              </Text>
                              <Text style={styles.packagePriceDiscount}>
                                ${pkg.discounted_price.toFixed(2)}
                              </Text>
                            </>
                          ) : (
                            <Text style={styles.packagePrice}>${pkg.price.toFixed(2)}</Text>
                          )}
                        </View>
                      </View>
                      {pkg.description ? (
                        <Text style={styles.packageDesc}>{pkg.description}</Text>
                      ) : null}
                      <View style={styles.packageKeysRow}>
                        <Ionicons name="key" size={14} color={Colors.orange} />
                        <Text style={styles.packageKeys}>{pkg.key_quantity} Keys</Text>
                      </View>
                      <View style={styles.packageSelectBtn}>
                        <Text style={styles.packageSelectText}>
                          Select — ${(pkg.discounted_price ?? pkg.price).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.modalCancelBtn} onPress={handleClose}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ---- Confirm step ----
            <>
              <Text style={styles.confirmDesc}>
                You are about to purchase{' '}
                <Text style={{ fontFamily: Fonts.firaSansBold }}>"{selected.name}"</Text> which
                includes{' '}
                <Text style={{ fontFamily: Fonts.firaSansBold }}>
                  {selected.key_quantity} key{selected.key_quantity !== 1 ? 's' : ''}
                </Text>{' '}
                for{' '}
                {promoResult != null ? (
                  <>
                    <Text style={styles.originalPriceStrike}>
                      ${(selected.discounted_price ?? selected.price).toFixed(2)}
                    </Text>
                    <Text style={styles.promoPriceHighlight}>
                      {' '}${promoResult.final_price.toFixed(2)}
                    </Text>
                  </>
                ) : (
                  <Text>${displayPrice.toFixed(2)}</Text>
                )}
                .
              </Text>

              {/* Promo code — only for packages without a discounted_price */}
              {selected.discounted_price == null && (
                <View style={styles.promoWrap}>
                  <Text style={styles.promoLabel}>Promo Code</Text>
                  <View style={styles.promoRow}>
                    <TextInput
                      style={styles.promoInput}
                      value={promoCode}
                      onChangeText={t => { setPromoCode(t.toUpperCase()); setPromoError(''); }}
                      placeholder="Enter Promo Code"
                      placeholderTextColor="#9AA0A6"
                      autoCapitalize="characters"
                      maxLength={20}
                    />
                    <TouchableOpacity
                      style={styles.promoApplyBtn}
                      onPress={handleApplyPromo}
                      disabled={promoLoading}
                    >
                      {promoLoading ? (
                        <ActivityIndicator size="small" color={Colors.orange} />
                      ) : (
                        <Text style={styles.promoApplyText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {!!promoError && <Text style={styles.promoError}>{promoError}</Text>}
                  {promoResult && (
                    <Text style={styles.promoSuccess}>
                      Promo applied! New price: ${promoResult.final_price.toFixed(2)}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.confirmFooter}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setSelected(null);
                    setPromoCode('');
                    setPromoError('');
                    setPromoResult(null);
                  }}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, paying && { opacity: 0.6 }]}
                  onPress={handleConfirm}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm Purchase</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// StatCard / MenuRow helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProfileScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [keys, setKeys] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalTrails, setTotalTrails] = useState(0);
  const [totalQuests, setTotalQuests] = useState(0);
  const [region, setRegion] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [buyKeysVisible, setBuyKeysVisible] = useState(false);

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user) { setLoading(false); return; }

    setEmail(user.email ?? '');
    setUserId(user.id);

    try {
      const profile = await getProfile(user.id);
      if (profile) {
        setDisplayName(profile.alias ?? profile.full_name ?? '');
        const rawAvatar = profile.profile_image_url ?? null;
        setAvatarUrl(rawAvatar
          ? rawAvatar.startsWith('http') ? rawAvatar : getStorageUrl('user_avatars', rawAvatar)
          : null);
        setKeys(profile.keys ?? 0);
        setRegion((profile.state as any)?.region?.name ?? null);
        setMemberSince(profile.created_at ?? null);
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

  const formattedMemberSince = memberSince
    ? new Date(memberSince).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

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
            <Ionicons name="globe-outline" size={15} color="#9AA0A6" style={styles.metaIcon} />
            <Text style={styles.metaLabel}>Region</Text>
            <Text style={styles.metaValue}>{region ?? 'N/A'}</Text>
          </View>
          {formattedMemberSince && (
            <View style={[styles.metaRow, { borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 8, paddingTop: 8 }]}>
              <Ionicons name="calendar-outline" size={15} color="#9AA0A6" style={styles.metaIcon} />
              <Text style={styles.metaLabel}>Member since</Text>
              <Text style={styles.metaValue}>{formattedMemberSince}</Text>
            </View>
          )}
        </View>

        {/* Key Wallet */}
        <View style={styles.keyWallet}>
          <View style={styles.keyWalletLeft}>
            <Text style={styles.keyWalletTitle}>Key Wallet</Text>
            <Text style={styles.keyWalletSub}>Keys available to unlock trails</Text>
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
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
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

  // Region + Member Since meta card
  metaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { marginRight: 8 },
  metaLabel: { fontFamily: Fonts.firaSansRegular, fontSize: 13, color: '#687076', flex: 1 },
  metaValue: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.blueGrey },

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
  keyWalletRight: { alignItems: 'center', gap: 8 },
  keyCountWrap: {
    alignItems: 'center',
    backgroundColor: Colors.orange + '18',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  keyCount: { fontFamily: Fonts.gothamBold, fontSize: 28, color: Colors.orange },
  keyUnit: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: Colors.orange },
  buyKeysBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  buyKeysBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#fff' },

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
  signOutCard: { marginTop: 24 },
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

  // ---------------------------------------------------------------------------
  // BuyKeysModal styles
  // ---------------------------------------------------------------------------
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  modalSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    marginBottom: 16,
  },
  modalCentered: { alignItems: 'center', paddingVertical: 32 },
  noPackagesText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
  },

  // Package card
  packageCard: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  packageCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  packageName: { fontFamily: Fonts.firaSansBold, fontSize: 15, color: Colors.blueGrey, flex: 1 },
  packagePriceWrap: { alignItems: 'flex-end' },
  packagePrice: { fontFamily: Fonts.gothamBold, fontSize: 16, color: Colors.blueGrey },
  packagePriceStrike: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    textDecorationLine: 'line-through',
  },
  packagePriceDiscount: { fontFamily: Fonts.gothamBold, fontSize: 16, color: '#16A34A' },
  packageDesc: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    marginBottom: 8,
  },
  packageKeysRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  packageKeys: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange },
  packageSelectBtn: {
    backgroundColor: Colors.orange,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  packageSelectText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // Confirm step
  confirmDesc: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 20,
  },
  originalPriceStrike: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textDecorationLine: 'line-through',
  },
  promoPriceHighlight: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 16,
    color: '#DC2626',
  },

  // Promo code
  promoWrap: { marginBottom: 20 },
  promoLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
    marginBottom: 8,
  },
  promoRow: { flexDirection: 'row', gap: 8 },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  promoApplyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  promoApplyText: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange },
  promoError: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#EF4444', marginTop: 6 },
  promoSuccess: { fontFamily: Fonts.firaSansBold, fontSize: 12, color: '#16A34A', marginTop: 6 },

  // Confirm footer
  confirmFooter: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  backBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
  confirmBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
  },
  confirmBtnText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: '#fff' },

  // Modal cancel
  modalCancelBtn: {
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  modalCancelText: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey },
});
