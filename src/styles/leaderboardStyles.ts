import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
    marginBottom: 4,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 15,
    color: '#687076',
  },

  // Region chips
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  chipText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  chipTextActive: {
    color: '#fff',
    fontFamily: Fonts.firaSansBold,
  },

  // Section
  section: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // States
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  centeredStateText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowCurrentUser: {
    backgroundColor: 'rgba(242, 118, 32, 0.08)',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },

  // Position badge
  positionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionBadgeDefault: {
    backgroundColor: '#EEF0F2',
  },
  positionBadgeText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#fff',
  },
  positionBadgeTextDefault: {
    color: '#687076',
  },

  // Avatar
  avatarWrap: {
    width: 44,
    height: 44,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 15,
    color: Colors.blueGrey,
  },

  // Info
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: Colors.blueGrey,
    marginBottom: 2,
  },
  youBadge: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: Colors.orange,
  },
  location: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },
  trailsText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 11,
    color: '#9AA0A6',
    marginTop: 1,
  },

  // Points
  pointsWrap: {
    alignItems: 'flex-end',
  },
  points: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: Colors.orange,
  },

  // ---------------------------------------------------------------------------
  // Profile modal
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
    maxHeight: '85%',
    paddingBottom: 32,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Avatar
  modalAvatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  modalAvatarRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: Colors.orange,
    padding: 2,
  },
  modalAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  modalAvatarPlaceholder: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: '#EEF0F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarInitials: {
    fontFamily: Fonts.gothamBold,
    fontSize: 28,
    color: Colors.blueGrey,
  },

  // Name / location
  modalName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 20,
    color: Colors.blueGrey,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalLocation: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Stats row
  modalStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  modalStat: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  modalStatValue: {
    fontFamily: Fonts.gothamBold,
    fontSize: 18,
    color: Colors.orange,
    marginBottom: 2,
  },
  modalStatLabel: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 12,
    color: '#9AA0A6',
  },

  // Section
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 13,
    color: '#687076',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalGridLabel: {
    width: '30%',
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
  },
  modalGridValue: {
    width: '60%',
    fontFamily: Fonts.firaSansBold,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  modalRigWrap: {
    marginTop: 16,
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
  },
  modalRigLabel: {
    fontFamily: Fonts.firaSansBold,
    fontSize: 11,
    color: '#9AA0A6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalRigText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
    lineHeight: 18,
  },
  modalAboutText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 14,
    color: Colors.blueGrey,
    lineHeight: 20,
  },

  // Close btn
  modalCloseBtn: {
    marginHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.blueGrey,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 14,
    color: '#fff',
  },
});
