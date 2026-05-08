import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Quest, PromoResult } from '../../types/explorer';
import { supabase } from '../../lib/supabase';

interface JoinQuestModalProps {
  visible: boolean;
  quests: Quest[];
  userId: string | null;
  onClose: () => void;
}

export default function JoinQuestModal({
  visible,
  quests,
  userId,
  onClose,
}: JoinQuestModalProps) {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleClose = () => {
    setSelectedQuestId(null);
    setPromoCode('');
    setPromoError('');
    setPromoResult(null);
    setPaying(false);
    onClose();
  };

  const handleSelectQuest = (id: string) => {
    setSelectedQuestId(id);
    setPromoCode('');
    setPromoError('');
    setPromoResult(null);
  };

  const handleApplyPromo = async () => {
    if (!promoCode) {
      setPromoError('Promo code cannot be empty.');
      return;
    }
    if (!selectedQuestId) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const { data, error } = await supabase.rpc('check_promo_code_for_quest', {
        input_code: promoCode,
        quest_id: selectedQuestId,
      });
      if (error || !data)
        throw new Error(error?.message ?? 'Promo code cannot be used.');
      setPromoResult(data as PromoResult);
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : 'Promo code cannot be used.',
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedQuestId || !userId) {
      Alert.alert('No Quest Selected', 'Please select a quest to join.');
      return;
    }
    const quest = quests.find(q => q.id === selectedQuestId);
    if (!quest) return;

    setPaying(true);
    try {
      const price = promoResult ? promoResult.final_price : quest.price;
      const unitAmount = Math.round(price * 100);

      const enc = encodeURIComponent;
      const parts = [
        'submit_type=pay',
        'mode=payment',
        `line_items[0][price_data][currency]=usd`,
        `line_items[0][price_data][product_data][name]=${enc(quest.title)}`,
        `line_items[0][price_data][unit_amount]=${unitAmount}`,
        `line_items[0][quantity]=1`,
        `metadata[profileId]=${enc(userId)}`,
        `metadata[questId]=${enc(quest.id)}`,
        `metadata[quantity]=${quest.keys_provided}`,
        `metadata[package_name]=${enc(quest.title)}`,
        `success_url=${enc(
          'ortq://payment/success?session_id={CHECKOUT_SESSION_ID}',
        )}`,
        `cancel_url=${enc('ortq://payment/cancel')}`,
      ];
      if (promoResult) {
        parts.push(`metadata[promoCodeId]=${enc(promoResult.promo_code_id)}`);
      }

      const response = await fetch(
        'https://api.stripe.com/v1/checkout/sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Config.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: parts.join('&'),
        },
      );

      const session = await response.json();
      if (!response.ok) {
        throw new Error(session?.error?.message ?? 'Failed to start checkout.');
      }

      await Linking.openURL(session.url);
      handleClose();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error
          ? err.message
          : 'Payment failed. Please try again.',
      );
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.filterOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <Icon name="ticket-outline" size={20} color={Colors.orange} />
              <Text style={styles.filterTitle}>Join a Quest</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Text style={styles.joinQuestSubtitle}>
              Select an available quest to begin your adventure.
            </Text>

            {quests.length === 0 ? (
              <Text style={styles.joinQuestEmpty}>
                There are no active or upcoming quests available to join.
              </Text>
            ) : (
              quests.map(quest => (
                <TouchableOpacity
                  key={quest.id}
                  style={[
                    styles.questCard,
                    selectedQuestId === quest.id && styles.questCardSelected,
                  ]}
                  onPress={() => handleSelectQuest(quest.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.questCardRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        selectedQuestId === quest.id && styles.radioOuterActive,
                      ]}
                    >
                      {selectedQuestId === quest.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questDescription}>
                      {quest.description}
                    </Text>
                    <View style={styles.questMeta}>
                      <Icon name="calendar-outline" size={12} color="#9AA0A6" />
                      <Text style={styles.questMetaText}>
                        {formatDate(quest.start_date)} –{' '}
                        {formatDate(quest.end_date)}
                      </Text>
                    </View>
                    <View style={styles.questMeta}>
                      <Icon name="key-outline" size={12} color="#9AA0A6" />
                      <Text style={styles.questMetaText}>
                        {quest.keys_provided} Keys
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={[
                          styles.questPrice,
                          selectedQuestId === quest.id &&
                            promoResult &&
                            styles.questPriceStrikethrough,
                        ]}
                      >
                        ${quest.price}
                      </Text>
                      {selectedQuestId === quest.id && promoResult && (
                        <Text style={styles.questPriceDiscounted}>
                          ${promoResult.final_price.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {selectedQuestId && (
              <View style={styles.promoWrap}>
                <Text style={styles.promoLabel}>Promo Code</Text>
                <View style={styles.promoRow}>
                  <TextInput
                    style={styles.promoInput}
                    value={promoCode}
                    onChangeText={t => {
                      setPromoCode(t.toUpperCase());
                      setPromoError('');
                      setPromoResult(null);
                    }}
                    placeholder="Enter Promo Code"
                    placeholderTextColor="#9AA0A6"
                    autoCapitalize="characters"
                    maxLength={20}
                    editable={!promoLoading}
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
                {promoResult && (
                  <Text style={styles.promoSuccess}>
                    Promo applied! You save $
                    {(
                      promoResult.original_price - promoResult.final_price
                    ).toFixed(2)}
                  </Text>
                )}
                {promoError ? (
                  <Text style={styles.promoError}>{promoError}</Text>
                ) : null}
              </View>
            )}
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterResetBtn}
              onPress={handleClose}
              disabled={paying}
            >
              <Text style={styles.filterResetText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterApplyBtn,
                (!selectedQuestId || paying) && { opacity: 0.5 },
              ]}
              onPress={handleConfirmPurchase}
              disabled={!selectedQuestId || paying}
            >
              {paying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.filterApplyText}>Confirm & Pay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filterOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 17,
    color: Colors.blueGrey,
  },
  filterScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  filterResetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  filterResetText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  filterApplyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: 'center',
  },
  filterApplyText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
  joinQuestSubtitle: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#687076',
    marginBottom: 16,
  },
  joinQuestEmpty: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    paddingVertical: 20,
  },
  questCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  questCardSelected: {
    borderColor: Colors.orange,
    borderWidth: 2,
  },
  questCardRadio: { paddingTop: 2 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9AA0A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.orange },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.orange,
  },
  questTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  questDescription: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#687076',
    marginBottom: 6,
  },
  questMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  questMetaText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
  },
  questPrice: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.orange,
    marginTop: 4,
  },
  promoWrap: { marginTop: 8, marginBottom: 4 },
  promoLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
    marginBottom: 8,
  },
  promoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  promoApplyBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  promoApplyText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.orange,
  },
  promoError: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  promoSuccess: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#22C55E',
    marginTop: 4,
  },
  questPriceStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#9AA0A6',
  },
  questPriceDiscounted: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: '#EF4444',
  },
});
