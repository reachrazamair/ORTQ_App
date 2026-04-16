import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import Config from 'react-native-config';
import RootNavigator from './src/navigation/RootNavigator';
import { startNetworkSync } from './src/lib/syncService';

Mapbox.setAccessToken(Config.MAPBOX_TOKEN ?? '');

export default function App() {
  useEffect(() => {
    const unsubscribe = startNetworkSync();
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
