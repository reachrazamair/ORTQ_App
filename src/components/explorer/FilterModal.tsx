import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Filters, Variants, CityVariant } from '../../types/explorer';
import { DEFAULT_FILTERS, DISTANCE_OPTIONS } from '../../constants/explorer';
import { milesToMeters } from '../../utils/explorerHelpers';

interface FilterModalProps {
  visible: boolean;
  variants: Variants;
  cities: CityVariant[];
  filters: Filters;
  onApply: (f: Filters) => void;
  onClose: () => void;
  onStateChange: (stateId: string | null) => void;
}

export default function FilterModal({
  visible,
  variants,
  cities,
  filters,
  onApply,
  onClose,
  onStateChange,
}: FilterModalProps) {
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters, visible]);

  const set = (key: keyof Filters, val: any) =>
    setLocal(prev => ({ ...prev, [key]: val }));

  const handleStateSelect = (id: string | null) => {
    set('stateId', id);
    set('cityId', null);
    set('cityLat', null);
    set('cityLon', null);
    onStateChange(id);
  };

  const handleCitySelect = (city: CityVariant | null) => {
    set('cityId', city?.id ?? null);
    set('cityLat', city?.latitude ?? null);
    set('cityLon', city?.longitude ?? null);
  };

  const handleReset = () => {
    const empty = { ...DEFAULT_FILTERS };
    setLocal(empty);
    onStateChange(null);
  };

  // Refs for each horizontal chip row
  const stateScrollRef = useRef<ScrollView>(null);
  const cityScrollRef = useRef<ScrollView>(null);
  const distanceScrollRef = useRef<ScrollView>(null);
  const difficultyScrollRef = useRef<ScrollView>(null);
  const trailTypeScrollRef = useRef<ScrollView>(null);

  // Chip x-offsets captured via onLayout
  const stateOffsets = useRef<Record<string, number>>({});
  const cityOffsets = useRef<Record<string, number>>({});
  const distanceOffsets = useRef<Record<string, number>>({});
  const difficultyOffsets = useRef<Record<string, number>>({});
  const trailTypeOffsets = useRef<Record<string, number>>({});

  // When modal opens, scroll each row to its active chip
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (local.stateId != null) {
        const x = stateOffsets.current[local.stateId];
        if (x != null) stateScrollRef.current?.scrollTo({ x, animated: false });
      }
      if (local.cityId != null) {
        const x = cityOffsets.current[local.cityId];
        if (x != null) cityScrollRef.current?.scrollTo({ x, animated: false });
      }
      if (local.distanceMeters != null) {
        const x = distanceOffsets.current[String(local.distanceMeters)];
        if (x != null)
          distanceScrollRef.current?.scrollTo({ x, animated: false });
      }
      if (local.difficultyId != null) {
        const x = difficultyOffsets.current[local.difficultyId];
        if (x != null)
          difficultyScrollRef.current?.scrollTo({ x, animated: false });
      }
      if (local.trailTypeId != null) {
        const x = trailTypeOffsets.current[local.trailTypeId];
        if (x != null)
          trailTypeScrollRef.current?.scrollTo({ x, animated: false });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.filterOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Search Trails</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {/* State */}
            <Text style={styles.filterSectionLabel}>State</Text>
            <ScrollView
              ref={stateScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipScroll}
            >
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !local.stateId && styles.filterChipActive,
                  ]}
                  onPress={() => handleStateSelect(null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !local.stateId && styles.filterChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </TouchableOpacity>
                {variants.states.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.filterChip,
                      local.stateId === s.id && styles.filterChipActive,
                    ]}
                    onPress={() => handleStateSelect(s.id)}
                    onLayout={e => {
                      stateOffsets.current[s.id] = e.nativeEvent.layout.x;
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        local.stateId === s.id && styles.filterChipTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* City */}
            <Text
              style={[
                styles.filterSectionLabel,
                !local.stateId && styles.filterSectionLabelDisabled,
              ]}
            >
              City
            </Text>
            <ScrollView
              ref={cityScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipScroll}
            >
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !local.cityId && styles.filterChipActive,
                  ]}
                  onPress={() => handleCitySelect(null)}
                  disabled={!local.stateId}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !local.cityId &&
                        local.stateId &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </TouchableOpacity>
                {cities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.filterChip,
                      local.cityId === c.id && styles.filterChipActive,
                    ]}
                    onPress={() => handleCitySelect(c)}
                    onLayout={e => {
                      cityOffsets.current[c.id] = e.nativeEvent.layout.x;
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        local.cityId === c.id && styles.filterChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Distance */}
            <Text style={styles.filterSectionLabel}>Max Distance (Miles)</Text>
            <ScrollView
              ref={distanceScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipScroll}
            >
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !local.distanceMeters && styles.filterChipActive,
                  ]}
                  onPress={() => set('distanceMeters', null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !local.distanceMeters && styles.filterChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </TouchableOpacity>
                {DISTANCE_OPTIONS.map(d => {
                  const m = milesToMeters(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.filterChip,
                        local.distanceMeters === m && styles.filterChipActive,
                      ]}
                      onPress={() => set('distanceMeters', m)}
                      onLayout={e => {
                        distanceOffsets.current[String(m)] =
                          e.nativeEvent.layout.x;
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          local.distanceMeters === m &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Difficulty */}
            <Text style={styles.filterSectionLabel}>Difficulty</Text>
            <ScrollView
              ref={difficultyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipScroll}
            >
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !local.difficultyId && styles.filterChipActive,
                  ]}
                  onPress={() => set('difficultyId', null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !local.difficultyId && styles.filterChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </TouchableOpacity>
                {variants.difficulty_levels.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[
                      styles.filterChip,
                      local.difficultyId === d.id && styles.filterChipActive,
                    ]}
                    onPress={() => set('difficultyId', d.id)}
                    onLayout={e => {
                      difficultyOffsets.current[d.id] = e.nativeEvent.layout.x;
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        local.difficultyId === d.id &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {d.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Trail Type */}
            <Text style={styles.filterSectionLabel}>Trail Type</Text>
            <ScrollView
              ref={trailTypeScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipScroll}
            >
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !local.trailTypeId && styles.filterChipActive,
                  ]}
                  onPress={() => set('trailTypeId', null)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !local.trailTypeId && styles.filterChipTextActive,
                    ]}
                  >
                    Any
                  </Text>
                </TouchableOpacity>
                {variants.trail_types.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.filterChip,
                      local.trailTypeId === t.id && styles.filterChipActive,
                    ]}
                    onPress={() => set('trailTypeId', t.id)}
                    onLayout={e => {
                      trailTypeOffsets.current[t.id] = e.nativeEvent.layout.x;
                    }}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        local.trailTypeId === t.id &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Status */}
            <Text style={styles.filterSectionLabel}>Status</Text>
            <View style={styles.filterChipRow}>
              {['All', 'locked', 'unlocked'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    (local.status === s || (!local.status && s === 'All')) &&
                      styles.filterChipActive,
                  ]}
                  onPress={() => set('status', s === 'All' ? null : s)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      (local.status === s || (!local.status && s === 'All')) &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterResetBtn}
              onPress={handleReset}
            >
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyBtn}
              onPress={() => onApply(local)}
            >
              <Text style={styles.filterApplyText}>Apply Filters</Text>
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
  filterSectionLabel: {
    fontFamily: Fonts.gothamBold,
    fontSize: 12,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 12,
  },
  filterSectionLabelDisabled: { color: '#C0C0C0' },
  filterChipScroll: { marginBottom: 4 },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: '#F8F9FA',
  },
  filterChipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  filterChipText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  filterChipTextActive: { color: '#fff', fontFamily: Fonts.firaSansBold },
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
});
