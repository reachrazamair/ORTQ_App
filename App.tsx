import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import BootSplash from 'react-native-bootsplash';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import Mapbox from '@rnmapbox/maps';
import Config from 'react-native-config';
import RootNavigator from './src/navigation/RootNavigator';
import { startNetworkSync } from './src/lib/syncService';

Mapbox.setAccessToken(Config.MAPBOX_TOKEN ?? '');

NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async response => response.status === 204,
  reachabilityLongTimeout: 60 * 1000,
  reachabilityShortTimeout: 5 * 1000,
  reachabilityRequestTimeout: 15 * 1000,
  reachabilityShouldRun: () => true,
});

const TAB_BAR_HEIGHT = 60;

function OfflineToast() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.toast, { bottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}
    >
      <View style={styles.dot} />
      <Text style={styles.toastText}>Offline mode</Text>
    </View>
  );
}

function AppContent() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    BootSplash.hide({ fade: true });
    const unsubscribeSync = startNetworkSync();
    const unsubscribeNet = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false);
    });
    return () => {
      unsubscribeSync();
      unsubscribeNet();
    };
  }, []);

  return (
    <>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      {isOffline && <OfflineToast />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#293349',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F27620',
  },
  toastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
