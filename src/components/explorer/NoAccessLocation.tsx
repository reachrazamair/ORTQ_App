import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { Fonts } from '../../theme/fonts';

interface NoAccessLocationProps {
  onSettings: () => void;
}

export default function NoAccessLocation({
  onSettings,
}: NoAccessLocationProps) {
  return (
    <View style={styles.noLocationWrap}>
      <Icon name="location-outline" size={48} color="#9AA0A6" />
      <Text style={styles.noLocationTitle}>We need your location</Text>
      <Text style={styles.noLocationBody}>
        To show nearby trails, allow location access or enable it in Settings.
      </Text>
      <TouchableOpacity style={styles.noLocationBtn} onPress={onSettings}>
        <Text style={styles.noLocationBtnText}>Open Settings</Text>
      </TouchableOpacity>
      <Text style={styles.noLocationNote}>We never sell your data.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noLocationWrap: { alignItems: 'center', padding: 40, gap: 12 },
  noLocationTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.blueGrey,
  },
  noLocationBody: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 22,
  },
  noLocationBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  noLocationBtnText: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 14,
    color: '#fff',
  },
  noLocationNote: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
});
