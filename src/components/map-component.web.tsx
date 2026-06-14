import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

// Este arquivo é usado APENAS para a plataforma web.
// Ele substitui o componente de mapa nativo por um iframe do Google Maps,
// evitando erros de importação de módulos nativos na web e oferecendo uma
// experiência interativa e integrada.
const PlatformSpecificMap: React.FC<any> = (props) => {
  const theme = useTheme();

  // Obtém as coordenadas da posição da câmera (ou usa coordenadas padrão de SP)
  const latitude = props.cameraPosition?.coordinates?.latitude ?? -23.55052;
  const longitude = props.cameraPosition?.coordinates?.longitude ?? -46.633308;
  const zoom = props.cameraPosition?.zoom ?? 15;

  // Cria a URL de incorporação do Google Maps para exibir o mapa e o marcador
  const mapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&t=m&hl=pt-BR&output=embed`;

  return (
    <View
      style={[
        styles.mapContainer,
        {
          borderColor: theme.backgroundSelected,
          backgroundColor: theme.backgroundElement,
        },
        props.style,
      ]}
    >
      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{
          border: 0,
          borderRadius: 12,
        }}
        allowFullScreen={true}
        loading="lazy"
        title="Google Maps"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    overflow: 'hidden',
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default PlatformSpecificMap;

