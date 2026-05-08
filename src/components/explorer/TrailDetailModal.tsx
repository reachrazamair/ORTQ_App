import {
  Alert,
  Image,
  Linking,
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
import { Trail, Variants } from '../../types/explorer';
import {
  getDifficultyColor,
  getStatusIconName,
  getStatusColor,
  getTrailTypeColor,
  getContrastColor,
  getTrailImageUrl,
  metersToMiles,
} from '../../utils/explorerHelpers';

function DetailRow({
  icon,
  color,
  children,
}: {
  icon: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={15} color={color} style={styles.detailRowIcon} />
      <Text style={styles.detailRowText}>{children}</Text>
    </View>
  );
}

interface TrailDetailModalProps {
  trail: Trail | null;
  variants: Variants;
  visible: boolean;
  onClose: () => void;
}

export default function TrailDetailModal({
  trail,
  variants,
  visible,
  onClose,
}: TrailDetailModalProps) {
  if (!trail) return null;

  const isLocked = trail.user_trail_status === 'locked';
  const { hidden_point } = trail;

  const handleOpenMaps = () => {
    if (!hidden_point) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${hidden_point.latitude},${hidden_point.longitude}`;
    Linking.openURL(url);
  };

  const handleCopyCoords = () => {
    if (!hidden_point) return;
    Alert.alert(
      'Coordinates',
      `${hidden_point.latitude.toFixed(4)}, ${hidden_point.longitude.toFixed(
        4,
      )}`,
    );
  };

  const isPermitUrl = trail.permit_requierd?.startsWith('http');
  const diffColor = getDifficultyColor(trail.difficulty, variants);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.detailOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailImageWrap}>
            <Image
              source={{ uri: getTrailImageUrl(trail.image_url) }}
              style={styles.detailImage}
            />
            {isLocked && (
              <View style={styles.detailImageOverlay}>
                <Icon
                  name="lock-closed"
                  size={40}
                  color="rgba(255,255,255,0.7)"
                />
              </View>
            )}
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Icon name="close" size={20} color={Colors.blueGrey} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScroll}
          >
            <View style={styles.detailTitleRow}>
              <Text
                style={[
                  styles.detailTitle,
                  isLocked && styles.detailTitleLocked,
                ]}
                numberOfLines={2}
              >
                {isLocked ? 'Locked Trail — Unlock for Details' : trail.name}
              </Text>
              <Icon
                name={getStatusIconName(trail.user_trail_status)}
                size={20}
                color={getStatusColor(trail.user_trail_status)}
              />
            </View>

            <View style={styles.detailBadgeRow}>
              {trail.trail_types.map(typeName => {
                const color = getTrailTypeColor(typeName, variants);
                return (
                  <View
                    key={typeName}
                    style={[styles.badge, { backgroundColor: color }]}
                  >
                    <Icon
                      name="triangle-outline"
                      size={11}
                      color={getContrastColor(color)}
                    />
                    <Text
                      style={[
                        styles.badgeText,
                        { color: getContrastColor(color) },
                      ]}
                    >
                      {typeName}
                    </Text>
                  </View>
                );
              })}
              <View style={[styles.badge, { backgroundColor: diffColor }]}>
                <Icon
                  name="flash-outline"
                  size={11}
                  color={getContrastColor(diffColor)}
                />
                <Text
                  style={[
                    styles.badgeText,
                    { color: getContrastColor(diffColor) },
                  ]}
                >
                  {trail.difficulty}
                </Text>
              </View>
            </View>

            <DetailRow icon="location-outline" color={Colors.orange}>
              {trail.city}, {trail.state}
            </DetailRow>

            {trail.distance_meters !== null && (
              <DetailRow icon="compass-outline" color={Colors.orange}>
                Checkpoint {metersToMiles(trail.distance_meters).toFixed(1)}{' '}
                miles away
              </DetailRow>
            )}

            {trail.vehicle_types.length > 0 && (
              <DetailRow icon="car-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Vehicles: </Text>
                {trail.vehicle_types.join(', ')}
              </DetailRow>
            )}

            <View style={styles.detailSection}>
              <View style={styles.detailSectionHeader}>
                <Icon
                  name="document-text-outline"
                  size={16}
                  color={Colors.orange}
                />
                <Text style={styles.detailSectionTitle}>Overview</Text>
              </View>
              <Text style={styles.detailBody}>{trail.overview}</Text>
            </View>

            {!isLocked && trail.permit_requierd && (
              <DetailRow icon="ticket-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Permit: </Text>
                {isPermitUrl ? (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(trail.permit_requierd!)}
                  >
                    <Text style={styles.detailLink}>
                      Required — View Details
                    </Text>
                  </TouchableOpacity>
                ) : (
                  trail.permit_requierd
                )}
              </DetailRow>
            )}

            <DetailRow icon="shapes-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Shape: </Text>
              {trail.trail_shape}
            </DetailRow>

            <DetailRow icon="calendar-outline" color={Colors.orange}>
              <Text style={styles.detailLabel}>Open: </Text>
              {trail.typically_open}
            </DetailRow>

            {!isLocked && (
              <DetailRow icon="radio-button-on-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Tolerance: </Text>
                {trail.distance_tolerance} m
              </DetailRow>
            )}

            {!isLocked && hidden_point && (
              <DetailRow icon="key-outline" color={Colors.orange}>
                <Text style={styles.detailLabel}>Keys: </Text>
                {hidden_point.keys_awarded}
                {'   '}
                <Icon name="trophy-outline" size={14} color="#CA8A04" />
                {'  '}
                <Text style={styles.detailLabel}>Points: </Text>
                {hidden_point.points_awarded}
              </DetailRow>
            )}

            {!isLocked && hidden_point && (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Icon name="globe-outline" size={16} color={Colors.orange} />
                  <Text style={styles.detailSectionTitle}>Points Location</Text>
                </View>
                <View style={styles.coordsRow}>
                  <TouchableOpacity
                    onPress={handleOpenMaps}
                    style={{ flex: 1 }}
                  >
                    <Text style={styles.detailLink}>
                      {hidden_point.latitude.toFixed(4)},{' '}
                      {hidden_point.longitude.toFixed(4)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopyCoords}
                  >
                    <Icon
                      name="copy-outline"
                      size={16}
                      color={Colors.blueGrey}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!isLocked && trail.navigation_details && (
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Icon name="map-outline" size={16} color={Colors.orange} />
                  <Text style={styles.detailSectionTitle}>Navigation Tips</Text>
                </View>
                <Text style={styles.detailBody}>
                  {trail.navigation_details}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailImageWrap: { height: 200, position: 'relative' },
  detailImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailImageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  detailScroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  detailTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
    flex: 1,
  },
  detailTitleLocked: { fontStyle: 'italic', color: '#9AA0A6' },
  detailBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgeText: { fontFamily: Fonts.firaSansBold, fontSize: 11 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  detailRowIcon: { marginTop: 1 },
  detailRowText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    flex: 1,
  },
  detailLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  detailSection: { marginBottom: 12 },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailSectionTitle: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: Colors.blueGrey,
  },
  detailBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    lineHeight: 22,
  },
  detailLink: { color: '#3B82F6', textDecorationLine: 'underline' },
  coordsRow: { flexDirection: 'row', alignItems: 'center' },
  copyBtn: { padding: 6 },
});
