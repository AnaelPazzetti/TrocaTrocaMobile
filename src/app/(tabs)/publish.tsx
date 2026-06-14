import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PlatformSpecificMap from '@/components/map-component';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';

const CATEGORIES = ['Eletrônicos', 'Moda', 'Esportes', 'Casa', 'Livros'];

export default function PublishScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { currentUser, publishAd, showToast } = useStore();

  // Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [exchangeAccept, setExchangeAccept] = useState('');
  
  // Images & Location States
  const [images, setImages] = useState<string[]>([]);
  const [adLocation, setAdLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Loading states
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authentication Gate check
  if (!currentUser) {
    return (
      <ThemedView style={styles.authGateContainer}>
        <SafeAreaView style={styles.authGateContent}>
          <SymbolView name="lock.shield.fill" tintColor="#3c87f7" size={60} />
          <ThemedText type="subtitle" style={styles.authGateTitle}>
            Área Privada
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.authGateDesc}>
            Para publicar um anúncio ou gerenciar suas trocas, você precisa estar conectado a uma conta.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/profile' as any)}
            style={({ pressed }) => [
              styles.authGateBtn,
              { opacity: pressed ? 0.8 : 1 } as any,
            ]}
          >
            <ThemedText style={{ color: '#ffffff' }} type="smallBold">
              Ir para Login / Cadastro
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // Pick multiple images from gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Slightly reduced quality to ensure compact base64 strings
        base64: true, // Output base64 representation
      });

      if (!result.canceled) {
        const base64Data = result.assets[0].base64;
        const uri = base64Data
          ? `data:image/jpeg;base64,${base64Data}`
          : result.assets[0].uri;

        if (images.includes(uri)) {
          showToast('Esta foto já foi adicionada.', 'info');
        } else {
          setImages((prev) => [...prev, uri]);
          showToast('Imagem adicionada com sucesso!', 'success');
        }
      }
    } catch (error) {
      showToast('Erro ao acessar a galeria.', 'error');
    }
  };

  // Remove selected image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    showToast('Imagem removida.', 'info');
  };

  // Capture current user GPS location
  const handleGetLocation = async () => {
    try {
      setIsFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permissão de GPS negada.', 'error');
        setIsFetchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setAdLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      showToast('Localização capturada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao obter coordenadas do GPS.', 'error');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Handle Publish Submit
  const handlePublish = async () => {
    if (!title.trim() || !description.trim() || !exchangeAccept.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    if (images.length === 0) {
      // If no images picked, use beautiful mock default Unsplash placeholders to look stunning
      images.push('https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=600');
    }

    setIsSubmitting(true);
    
    // Call Context Publisher
    const success = await publishAd({
      title: title.trim(),
      description: description.trim(),
      category,
      exchangeAccept: exchangeAccept.trim(),
      images,
      latitude: adLocation?.latitude || -23.55052,
      longitude: adLocation?.longitude || -46.633308,
    });

    setIsSubmitting(false);

    if (success) {
      // Clear form
      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setExchangeAccept('');
      setImages([]);
      setAdLocation(null);
      
      // Navigate to Home Feed
      router.push('/' as any);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header Title */}
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Criar Novo Anúncio
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Preencha os dados abaixo para oferecer um item para troca
          </ThemedText>
        </ThemedView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.six },
          ]}
        >
          {/* ==========================================
              IMAGES UPLOADER
              ========================================== */}
          <ThemedView style={styles.section} type="backgroundElement">
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Fotos do Produto
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
              Adicione fotos nítidas do seu item. Primeira foto será a capa.
            </ThemedText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesContainer}>
              {images.map((uri, index) => (
                <View key={uri} style={styles.imageCard}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  <Pressable
                    onPress={() => handleRemoveImage(index)}
                    style={styles.deleteImageBtn}
                  >
                    <SymbolView name="xmark.circle.fill" tintColor="#EF4444" size={18} />
                  </Pressable>
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <ThemedText style={styles.coverBadgeText}>CAPA</ThemedText>
                    </View>
                  )}
                </View>
              ))}

              <Pressable
                onPress={handlePickImage}
                style={[
                  styles.addImageBtn,
                  { borderColor: theme.backgroundSelected, backgroundColor: theme.background },
                ]}
              >
                <SymbolView name="camera.fill" tintColor="#3c87f7" size={24} />
                <ThemedText style={{ color: '#3c87f7', fontSize: 11, fontWeight: '700', marginTop: Spacing.one }}>
                  Adicionar Foto
                </ThemedText>
              </Pressable>
            </ScrollView>
          </ThemedView>

          {/* ==========================================
              FORM FIELDS
              ========================================== */}
          <View style={styles.formContainer}>
            {/* Title */}
            <View style={styles.inputBlock}>
              <ThemedText type="smallBold" style={styles.inputLabel}>
                Título do Anúncio *
              </ThemedText>
              <TextInput
                placeholder="Ex: PlayStation 4 Slim 1TB"
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {/* Category Select */}
            <View style={styles.inputBlock}>
              <ThemedText type="smallBold" style={styles.inputLabel}>
                Categoria *
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map((cat) => {
                  const isActive = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.catBtn,
                        isActive
                          ? { backgroundColor: '#3c87f7' }
                          : { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: isActive ? '#ffffff' : theme.text, fontSize: 12 }}
                      >
                        {cat}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputBlock}>
              <ThemedText type="smallBold" style={styles.inputLabel}>
                Descrição Detalhada *
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Descreva o estado de conservação, tempo de uso, o que acompanha e detalhes técnicos do seu produto."
                placeholderTextColor={theme.textSecondary}
                value={description}
                onChangeText={setDescription}
                style={[
                  styles.textarea,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {/* Exchange Interests */}
            <View style={styles.inputBlock}>
              <ThemedText type="smallBold" style={styles.inputLabel}>
                O que você aceita em troca? *
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Ex: Nintendo Switch, Notebook Core i5 de 8GB RAM ou Celular equivalente."
                placeholderTextColor={theme.textSecondary}
                value={exchangeAccept}
                onChangeText={setExchangeAccept}
                style={[
                  styles.textarea,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {/* ==========================================
                GEOLOCATION CAPTURE
                ========================================== */}
            <View style={styles.inputBlock}>
              <ThemedText type="smallBold" style={styles.inputLabel}>
                Localização do Item *
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
                Capture sua localização atual para que os usuários mais próximos te encontrem primeiro.
              </ThemedText>

              <Pressable
                onPress={handleGetLocation}
                disabled={isFetchingLocation}
                style={({ pressed }) => [
                  styles.locationBtn,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 } as any,
                ]}
              >
                {isFetchingLocation ? (
                  <ActivityIndicator size="small" color="#3c87f7" />
                ) : (
                  <>
                    <SymbolView name="mappin.circle.fill" tintColor="#3c87f7" size={18} />
                    <ThemedText type="smallBold" style={{ color: '#3c87f7', fontSize: 13 }}>
                      {adLocation ? 'Localização Capturada ✓' : 'Capturar Localização Atual GPS'}
                    </ThemedText>
                  </>
                )}
              </Pressable>

              {adLocation && (
                <View style={styles.mapPreviewWrapper}>
                  <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.one }}>
                    Prévia da localização aproximada no mapa:
                  </ThemedText>
                  <PlatformSpecificMap
                    style={styles.map}
                    cameraPosition={{
                      coordinates: {
                        latitude: adLocation.latitude,
                        longitude: adLocation.longitude,
                      },
                      zoom: 14,
                    }}
                    markers={[
                      {
                        id: 'my-ad-location',
                        coordinates: {
                          latitude: adLocation.latitude,
                          longitude: adLocation.longitude,
                        },
                        title: 'Meu anúncio',
                      },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* Submit button */}
            <Pressable
              onPress={handlePublish}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed ? 0.9 : 1 } as any,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15 }}>
                  Publicar Anúncio
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.four,
  },
  section: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  imageCard: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 9,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(60, 135, 247, 0.9)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    gap: Spacing.four,
  },
  inputBlock: {
    gap: Spacing.two,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#3c87f7',
  },
  input: {
    height: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  textarea: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  categoryScroll: {
    gap: Spacing.two,
  },
  catBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 16,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Spacing.three,
  },
  mapPreviewWrapper: {
    marginTop: Spacing.two,
  },
  map: {
    height: 180,
    width: '100%',
    borderRadius: Spacing.two,
  },
  submitBtn: {
    backgroundColor: '#3c87f7',
    height: 50,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#3c87f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  
  // Auth Gate Styles
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authGateContent: {
    alignItems: 'center',
    padding: Spacing.five,
    width: '100%',
    maxWidth: 400,
  },
  authGateTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  authGateDesc: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.five,
  },
  authGateBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3c87f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
});
