import React, { useState, useCallback, useEffect } from 'react';
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { supabase } from '../../lib/supabase';
import { KeyPackage, PromoResult } from '../../types/profile';
import { styles } from '../../styles/profileStyles';

interface BuyKeysModalProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
}

export default function BuyKeysModal({
  visible,
  userId,
  onClose,
}: BuyKeysModalProps) {
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

  useEffect(() => {
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
    if (!promoCode.trim()) {
      setPromoError('Promo code cannot be empty.');
      return;
    }
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
      setPromoError(
        err instanceof Error ? err.message : 'Promo code cannot be used.',
      );
    } finally {
      setPromoLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected || !userId) return;
    setPaying(true);
    try {
      const price = promoResult
        ? promoResult.final_price
        : selected.discounted_price ?? selected.price;
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
      if (!response.ok)
        throw new Error(
          session?.error?.message ?? 'Failed to start checkout.',
        );
      await Linking.openURL(session.url);
      handleClose();
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Payment failed. Please try again.',
      );
    } finally {
      setPaying(false);
    }
  };

  const displayPrice = selected
    ? promoResult
      ? promoResult.final_price
      : selected.discounted_price ?? selected.price
    : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
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
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 360 }}
                >
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
                            <Text style={styles.packagePrice}>
                              ${pkg.price.toFixed(2)}
                            </Text>
                          )}
                        </View>
                      </View>
                      {pkg.description ? (
                        <Text style={styles.packageDesc}>{pkg.description}</Text>
                      ) : null}
                      <View style={styles.packageKeysRow}>
                        <Ionicons name="key" size={14} color={Colors.orange} />
                        <Text style={styles.packageKeys}>
                          {pkg.key_quantity} Keys
                        </Text>
                      </View>
                      <View style={styles.packageSelectBtn}>
                        <Text style={styles.packageSelectText}>
                          Select — $
                          {(pkg.discounted_price ?? pkg.price).toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleClose}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.confirmDesc}>
                You are about to purchase{' '}
                <Text style={{ fontFamily: Fonts.firaSansBold }}>
                  "{selected.name}"
                </Text>{' '}
                which includes{' '}
                <Text style={{ fontFamily: Fonts.firaSansBold }}>
                  {selected.key_quantity} key
                  {selected.key_quantity !== 1 ? 's' : ''}
                </Text>{' '}
                for{' '}
                {promoResult != null ? (
                  <>
                    <Text style={styles.originalPriceStrike}>
                      $
                      {(selected.discounted_price ?? selected.price).toFixed(2)}
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

              {selected.discounted_price == null && (
                <View style={styles.promoWrap}>
                  <Text style={styles.promoLabel}>Promo Code</Text>
                  <View style={styles.promoRow}>
                    <TextInput
                      style={styles.promoInput}
                      value={promoCode}
                      onChangeText={t => {
                        setPromoCode(t.toUpperCase());
                        setPromoError('');
                      }}
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
                  {!!promoError && (
                    <Text style={styles.promoError}>{promoError}</Text>
                  )}
                  {promoResult && (
                    <Text style={styles.promoSuccess}>
                      Promo applied! New price: $
                      {promoResult.final_price.toFixed(2)}
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
