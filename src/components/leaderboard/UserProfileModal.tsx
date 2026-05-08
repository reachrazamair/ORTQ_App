import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RankedUser } from '../../types/leaderboard';
import {
  getUserName,
  getInitials,
  getAvatarUrl,
} from '../../utils/leaderboardHelpers';
import { styles } from '../../styles/leaderboardStyles';

interface UserProfileModalProps {
  user: RankedUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({
  user,
  isOpen,
  onClose,
}: UserProfileModalProps) {
  if (!user) return null;

  const name = getUserName(user);
  const initials = getInitials(name);
  const hasVehicle =
    user.vehicle_type ||
    user.make ||
    user.model ||
    user.year ||
    user.rig_description;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScroll}
          >
            <View style={styles.modalAvatarWrap}>
              <View style={styles.modalAvatarRing}>
                {user.profile_image_url ? (
                  <Image
                    source={{ uri: getAvatarUrl(user.profile_image_url)! }}
                    style={styles.modalAvatarImg}
                  />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalAvatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.modalName}>{name}</Text>
            <Text style={styles.modalLocation}>
              {user.city || 'N/A'}, {user.state_abbreviation || 'N/A'}
            </Text>

            <View style={styles.modalStatsRow}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>
                  {user.points_earned.toLocaleString()}
                </Text>
                <Text style={styles.modalStatLabel}>Points</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStat}>
                <Text style={styles.modalStatValue}>
                  {user.trails_completed_count}
                </Text>
                <Text style={styles.modalStatLabel}>Completed Trails</Text>
              </View>
            </View>

            {hasVehicle && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Vehicle</Text>
                <View style={styles.modalGrid}>
                  <Text style={styles.modalGridLabel}>Type</Text>
                  <Text style={styles.modalGridValue}>
                    {user.vehicle_type || 'N/A'}
                  </Text>

                  <Text style={styles.modalGridLabel}>Make</Text>
                  <Text style={styles.modalGridValue}>
                    {user.make || 'N/A'}
                  </Text>

                  <Text style={styles.modalGridLabel}>Model</Text>
                  <Text style={styles.modalGridValue}>
                    {user.model || 'N/A'}
                  </Text>

                  <Text style={styles.modalGridLabel}>Year</Text>
                  <Text style={styles.modalGridValue}>
                    {user.year || 'N/A'}
                  </Text>
                </View>
                {user.rig_description && (
                  <View style={styles.modalRigWrap}>
                    <Text style={styles.modalRigLabel}>Rig Description</Text>
                    <Text style={styles.modalRigText}>
                      {user.rig_description}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {user.about_me && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>About Me</Text>
                <Text style={styles.modalAboutText}>{user.about_me}</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
