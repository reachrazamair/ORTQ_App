import { StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontFamily: Fonts.gothamBold,
    fontSize: 24,
    color: Colors.blueGrey,
  },
  headerSub: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    marginTop: 2,
  },

  mapWrap: { flex: 1 },
  map: { flex: 1 },

  markerCustom: {
    width: 40,
    height: 40,
  },
  markerImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },

  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  recenterBtn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  recenterBtnActive: {
    backgroundColor: Colors.orange,
  },

  emptyState: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    marginTop: 12,
  },
  emptySubText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: '#9AA0A6',
    textAlign: 'center',
    marginTop: 4,
  },

  // Info sheet
  infoSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  infoHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E9ECEF',
    alignSelf: 'center',
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoName: {
    fontFamily: Fonts.gothamBold,
    fontSize: 16,
    color: Colors.blueGrey,
    flex: 1,
    marginRight: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: Fonts.firaSansRegular,
    fontSize: 13,
    color: Colors.blueGrey,
  },
  copyBtn: {
    padding: 4,
  },
});
