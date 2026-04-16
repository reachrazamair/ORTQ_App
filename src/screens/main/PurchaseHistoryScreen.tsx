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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList, 'PurchaseHistory'>;
};

type Purchase = {
  id: string;
  package_name: string;
  keys_purchased: number;
  amount: number;
  purchased_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PurchaseRow({ purchase }: { purchase: Purchase }) {
  return (
    <View style={styles.purchaseRow}>
      <View style={styles.purchaseIconWrap}>
        <Ionicons name="key" size={20} color={Colors.orange} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.packageName}>{purchase.package_name}</Text>
        <Text style={styles.purchaseMeta}>{formatDate(purchase.purchased_at)}</Text>
      </View>
      <View style={styles.purchaseRight}>
        <Text style={styles.keysCount}>+{purchase.keys_purchased} keys</Text>
        <Text style={styles.amount}>${purchase.amount.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export default function PurchaseHistoryScreen({ navigation }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id;
        if (!userId) { setLoading(false); return; }

        const { data, error } = await supabase
          .from('user_purchases')
          .select('id, package_name, keys_purchased, amount, purchased_at')
          .eq('user_id', userId)
          .order('purchased_at', { ascending: false });

        if (!error && data) setPurchases(data as Purchase[]);
        setLoading(false);
      };
      load();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.blueGrey} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Purchase History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {purchases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#C0C0C0" />
              <Text style={styles.emptyTitle}>No Purchases Yet</Text>
              <Text style={styles.emptyText}>
                Your key purchase history will appear here once you make your first purchase.
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {purchases.map((p, index) => (
                <View key={p.id}>
                  <PurchaseRow purchase={p} />
                  {index < purchases.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 40 },
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

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: Fonts.gothamBold, fontSize: 18, color: Colors.blueGrey },
  emptyText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },

  listCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  rowDivider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 68 },

  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  purchaseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orange + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageName: { fontFamily: Fonts.firaSansBold, fontSize: 14, color: Colors.blueGrey, marginBottom: 2 },
  purchaseMeta: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#9AA0A6' },
  purchaseRight: { alignItems: 'flex-end' },
  keysCount: { fontFamily: Fonts.firaSansBold, fontSize: 13, color: Colors.orange },
  amount: { fontFamily: Fonts.firaSansRegular, fontSize: 12, color: '#687076', marginTop: 2 },
});
