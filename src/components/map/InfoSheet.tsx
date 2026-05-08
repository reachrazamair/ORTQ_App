import { useState } from 'react';
import { Clipboard, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';
import { Coords, TrailMarker } from '../../types/map';
import { haversineDistance, formatDistance } from '../../utils/mapHelpers';
import { styles } from '../../styles/mapStyles';

interface InfoSheetProps {
  trail: TrailMarker | null;
  userCoords: Coords | null;
  onClose: () => void;
}

export default function InfoSheet({
  trail,
  userCoords,
  onClose,
}: InfoSheetProps) {
  const [coordsCopied, setCoordsCopied] = useState(false);

  if (!trail) return null;
  const hp = trail.hidden_point;

  const distance =
    userCoords && hp
      ? haversineDistance(userCoords, {
          latitude: hp.latitude,
          longitude: hp.longitude,
        })
      : null;

  const handleCopyCoords = () => {
    if (!hp) return;
    Clipboard.setString(
      `${hp.latitude.toFixed(6)}, ${hp.longitude.toFixed(6)}`,
    );
    setCoordsCopied(true);
    setTimeout(() => setCoordsCopied(false), 2000);
  };

  return (
    <View style={styles.infoSheet}>
      <View style={styles.infoHandle} />

      <View style={styles.infoHeader}>
        <Text style={styles.infoName} numberOfLines={1}>
          {trail.name}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close" size={20} color={Colors.blueGrey} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Icon name="location-outline" size={15} color={Colors.orange} />
        <Text style={styles.infoText}>
          {trail.city}, {trail.state}
        </Text>
      </View>

      {hp && (
        <View style={styles.infoRow}>
          <Icon name="key-outline" size={15} color={Colors.orange} />
          <Text style={styles.infoText}>{hp.keys_awarded} Keys</Text>
          <Icon
            name="trophy-outline"
            size={15}
            color="#F59E0B"
            style={{ marginLeft: 12 }}
          />
          <Text style={styles.infoText}>{hp.points_awarded} Points</Text>
        </View>
      )}

      {hp && (
        <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
          <View style={styles.infoRow}>
            <Icon name="globe-outline" size={15} color={Colors.orange} />
            <Text selectable style={styles.infoText}>
              {hp.latitude.toFixed(4)}, {hp.longitude.toFixed(4)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleCopyCoords} style={styles.copyBtn}>
            <Icon
              name={coordsCopied ? 'checkmark-outline' : 'copy-outline'}
              size={16}
              color={coordsCopied ? '#22C55E' : Colors.blueGrey}
            />
          </TouchableOpacity>
        </View>
      )}

      {distance !== null && (
        <View style={styles.infoRow}>
          <Icon name="navigate-outline" size={15} color="#3B82F6" />
          <Text
            style={[
              styles.infoText,
              { color: '#3B82F6', fontFamily: Fonts.firaSansBold },
            ]}
          >
            Distance: {formatDistance(distance)}
          </Text>
        </View>
      )}
    </View>
  );
}
