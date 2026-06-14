import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

let MapComponent: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ExpoMaps = require('expo-maps');
  if (ExpoMaps) {
    MapComponent = Platform.OS === 'ios' ? ExpoMaps.AppleMaps?.View : ExpoMaps.GoogleMaps?.View;
  }
} catch (error) {
  console.warn('ExpoMaps is not available on this device/environment. Using fallback.', error);
}

interface MapProps {
  style?: any;
  cameraPosition?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    zoom?: number;
  };
  markers?: {
    id: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    title?: string;
  }[];
}

const PlatformSpecificMap: React.FC<MapProps> = ({ style, cameraPosition, markers }) => {
  if (MapComponent) {
    return <MapComponent style={style} cameraPosition={cameraPosition} markers={markers} />;
  }

  // Fallback View if ExpoMaps is not compiled into the client (e.g. Expo Go)
  const coords = cameraPosition?.coordinates || markers?.[0]?.coordinates || { latitude: -23.55052, longitude: -46.633308 };

  const handleOpenMaps = async () => {
    const { latitude, longitude } = coords;
    const label = encodeURIComponent('Localização aproximada');
    const url = Platform.select({
      ios: `maps://0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      }
    } catch (err) {
      console.error('Error opening maps app:', err);
    }
  };

  return (
    <ThemedView style={[style, styles.fallbackContainer]} type="backgroundSelected">
      <FontAwesome name="map-marker" size={28} color="#3c87f7" style={{ marginBottom: 8 }} />
      <ThemedText type="smallBold" style={styles.fallbackTitle}>
        Visualizar no Mapa Externo
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.fallbackDesc}>
        Coordenadas: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
      </ThemedText>
      <Pressable onPress={handleOpenMaps} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.8 : 1 }]}>
        <FontAwesome name="external-link" size={12} color="#ffffff" style={{ marginRight: 6 }} />
        <ThemedText style={styles.btnText}>Abrir no Maps do Celular</ThemedText>
      </Pressable>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.15)',
    padding: 16,
    minHeight: 180,
  },
  fallbackTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  fallbackDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#3c87f7',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PlatformSpecificMap;
