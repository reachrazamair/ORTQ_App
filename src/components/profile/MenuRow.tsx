import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../theme/colors';
import { styles } from '../../styles/profileStyles';

interface MenuRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function MenuRow({ icon, label, onPress, destructive }: MenuRowProps) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
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
