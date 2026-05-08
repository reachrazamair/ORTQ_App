import { Image, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import Icon from 'react-native-vector-icons/Ionicons';
import Config from 'react-native-config';
import { Colors } from '../../theme/colors';
import { styles } from '../../styles/mapStyles';
import { getMarkerColor } from '../../utils/mapHelpers';
import { useMap } from '../../hooks/useMap';
import InfoSheet from '../../components/map/InfoSheet';

Mapbox.setAccessToken(Config.MAPBOX_TOKEN ?? '');

export default function MapScreen() {
  const {
    cameraRef,
    userCoords,
    trails,
    selectedTrail,
    isFollowing,
    loading,
    initialCenter,
    setSelectedTrail,
    setIsFollowing,
    handleRecenter,
  } = useMap();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Map</Text>
        {loading && <Text style={styles.headerSub}>Loading trails...</Text>}
        {!loading && trails.length > 0 && (
          <Text style={styles.headerSub}>
            {trails.length} trail{trails.length > 1 ? 's' : ''} on map
          </Text>
        )}
      </View>

      <View style={styles.mapWrap}>
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Outdoors}
          onTouchStart={() => setIsFollowing(false)}
        >
          <Mapbox.Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: initialCenter ?? [-104.9903, 39.7392],
              zoomLevel: 12,
            }}
          />

          {/* User location */}
          <Mapbox.UserLocation visible animated />

          {/* Trail markers */}
          {trails.map(trail => {
            if (!trail.hidden_point) return null;
            const isCustomIcon =
              trail.user_trail_status === 'completed' ||
              trail.user_trail_status === 'unlocked';
            return (
              <Mapbox.MarkerView
                key={trail.id}
                coordinate={[
                  trail.hidden_point.longitude,
                  trail.hidden_point.latitude,
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTrail(trail);
                    setIsFollowing(false);
                  }}
                  activeOpacity={0.8}
                  style={
                    isCustomIcon
                      ? styles.markerCustom
                      : [
                          styles.marker,
                          {
                            backgroundColor: getMarkerColor(
                              trail.user_trail_status,
                            ),
                          },
                        ]
                  }
                >
                  {trail.user_trail_status === 'completed' ? (
                    <Image
                      source={require('../../../assets/marker_completed.png')}
                      style={styles.markerImage}
                    />
                  ) : trail.user_trail_status === 'unlocked' ? (
                    <Image
                      source={require('../../../assets/marker_unlocked.png')}
                      style={styles.markerImage}
                    />
                  ) : (
                    <Icon name="lock-closed" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              </Mapbox.MarkerView>
            );
          })}
        </Mapbox.MapView>

        {/* Recenter button */}
        <TouchableOpacity
          style={[styles.recenterBtn, isFollowing && styles.recenterBtnActive]}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Icon
            name="locate"
            size={22}
            color={isFollowing ? '#fff' : Colors.blueGrey}
          />
        </TouchableOpacity>

        {/* Empty state */}
        {!loading && trails.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="map-outline" size={40} color="#9AA0A6" />
            <Text style={styles.emptyText}>No unlocked trails yet.</Text>
            <Text style={styles.emptySubText}>
              Unlock trails in Explorer to see them here.
            </Text>
          </View>
        )}
      </View>

      {/* Info bottom sheet */}
      {selectedTrail && (
        <InfoSheet
          trail={selectedTrail}
          userCoords={userCoords}
          onClose={() => setSelectedTrail(null)}
        />
      )}
    </SafeAreaView>
  );
}
