import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import PlatformSpecificMap from '@/components/map-component';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdDetailsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const {
    ads,
    offers,
    currentUser,
    askQuestion,
    answerQuestion,
    createOffer,
    showToast,
  } = useStore();

  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const ad = React.useMemo(() => {
    const foundAd = ads.find((a) => a.id === id);
    if (!foundAd) return undefined;
    if (foundAd.exchangeAccept === '_unlisted_') {
      const isParticipant =
        currentUser &&
        (foundAd.userId === currentUser.id ||
          offers.some(
            (o) =>
              (o.linkedAdId === foundAd.id || o.adId === foundAd.id) &&
              (o.senderId === currentUser.id || o.receiverId === currentUser.id)
          ));
      if (!isParticipant) {
        return undefined;
      }
    }
    return foundAd;
  }, [ads, id, currentUser, offers]);

  // States
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [newQuestionText, setNewQuestionText] = useState('');
  
  // Q&A Seller Reply State
  const [replyingQuestionId, setReplyingQuestionId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Offer Modal States
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [offerType, setOfferType] = useState<'link' | 'custom'>('link');
  const [selectedMyAdId, setSelectedMyAdId] = useState<string | null>(null);
  
  // Custom Offer Item States
  const [customItemTitle, setCustomItemTitle] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemImages, setCustomItemImages] = useState<string[]>([]);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Zoom & Layout States
  const [carouselWidth, setCarouselWidth] = useState(SCREEN_WIDTH);
  const [isZoomModalVisible, setIsZoomModalVisible] = useState(false);
  const [zoomImageUri, setZoomImageUri] = useState<string | null>(null);
  
  const carouselScrollRef = useRef<ScrollView>(null);

  const handleCarouselLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setCarouselWidth(width);
    }
  };

  if (!ad) {
    return (
      <ThemedView style={styles.errorContainer}>
        <FontAwesome name="exclamation-triangle" size={40} color="#EF4444" />
        <ThemedText type="smallBold" style={{ marginTop: Spacing.three }}>
          Anúncio não encontrado ou removido.
        </ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ThemedText style={{ color: '#ffffff' }} type="smallBold">Voltar</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const isOwner = currentUser?.id === ad.userId;
  
  // User's other ads to link in the offer (exclude unlisted items)
  const myAdsToLink = ads.filter((a) => a.userId === currentUser?.id && a.exchangeAccept !== '_unlisted_');

  // Handle Carousel Scroll
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const offset = event.nativeEvent.contentOffset.x;
    const activeIndex = Math.floor((offset + slideSize / 2) / slideSize);
    setActivePhotoIndex(activeIndex);
  };

  const handleNextPhoto = () => {
    if (activePhotoIndex < ad.images.length - 1) {
      const nextIndex = activePhotoIndex + 1;
      setActivePhotoIndex(nextIndex);
      carouselScrollRef.current?.scrollTo({
        x: nextIndex * carouselWidth,
        animated: true,
      });
    }
  };

  const handlePrevPhoto = () => {
    if (activePhotoIndex > 0) {
      const prevIndex = activePhotoIndex - 1;
      setActivePhotoIndex(prevIndex);
      carouselScrollRef.current?.scrollTo({
        x: prevIndex * carouselWidth,
        animated: true,
      });
    }
  };

  // Submit Q&A
  const handleAskQuestion = () => {
    if (!currentUser) {
      showToast('Acesse sua conta para fazer perguntas.', 'error');
      router.push('/profile' as any);
      return;
    }
    if (!newQuestionText.trim()) return;
    askQuestion(ad.id, newQuestionText.trim());
    setNewQuestionText('');
  };

  // Submit Q&A Reply (Seller)
  const handleAnswerQuestion = (qId: string) => {
    if (!replyText.trim()) return;
    answerQuestion(ad.id, qId, replyText.trim());
    setReplyText('');
    setReplyingQuestionId(null);
  };

  // Picker to switch custom offer images
  const handlePickCustomImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const base64Data = result.assets[0].base64;
        const uri = base64Data
          ? `data:image/jpeg;base64,${base64Data}`
          : result.assets[0].uri;

        if (customItemImages.includes(uri)) {
          showToast('Esta foto já foi adicionada.', 'info');
        } else {
          setCustomItemImages((prev) => [...prev, uri]);
          showToast('Imagem adicionada com sucesso!', 'success');
        }
      }
    } catch {
      showToast('Erro ao acessar a galeria de imagens.', 'error');
    }
  };

  const handleRemoveCustomImage = (index: number) => {
    setCustomItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Trade Offer
  const handleSendOffer = async () => {
    if (!currentUser) {
      showToast('Inicie uma sessão para oferecer uma troca.', 'error');
      setIsOfferModalVisible(false);
      router.push('/profile' as any);
      return;
    }

    if (!offerMessage.trim()) {
      showToast('Por favor, digite uma mensagem para a proposta.', 'error');
      return;
    }

    if (offerType === 'link' && !selectedMyAdId) {
      showToast('Por favor, selecione um anúncio para vincular.', 'error');
      return;
    }

    if (offerType === 'custom' && (!customItemTitle.trim() || !customItemDesc.trim())) {
      showToast('Por favor, preencha o título e a descrição do seu item.', 'error');
      return;
    }

    setIsSubmittingOffer(true);

    const success = await createOffer({
      adId: ad.id,
      adTitle: ad.title,
      adImage: ad.images[0],
      receiverId: ad.userId,
      message: offerMessage.trim(),
      linkedAdId: offerType === 'link' ? selectedMyAdId! : undefined,
      customItemTitle: offerType === 'custom' ? customItemTitle.trim() : undefined,
      customItemDescription: offerType === 'custom' ? customItemDesc.trim() : undefined,
      customItemImages: offerType === 'custom' && customItemImages.length > 0
        ? customItemImages
        : undefined,
    });

    setIsSubmittingOffer(false);
    if (success) {
      setIsOfferModalVisible(false);
      setOfferMessage('');
      setSelectedMyAdId(null);
      setCustomItemTitle('');
      setCustomItemDesc('');
      setCustomItemImages([]);
      router.push('/trades' as any);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Floating Back Button */}
      <SafeAreaView style={styles.floatingHeader} edges={['top']}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.circleBackBtn,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <FontAwesome name="chevron-left" size={16} color={theme.text} />
        </Pressable>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[
          styles.mainContentWrapper,
          isDesktop ? styles.desktopMainWrapper : null,
          ad.isTraded ? styles.tradedAdDetails : null,
        ]}>
          {/* Left Column for details */}
          <View style={isDesktop ? styles.leftColumn : styles.fullWidthColumn}>
            {/* ==========================================
                TITLE & CATEGORY INFO
                ========================================== */}
            <ThemedView style={styles.adSection}>
              {ad.isTraded && (
                <View style={styles.detailTradedBanner}>
                  <FontAwesome name="check-circle" size={16} color="#10B981" />
                  <ThemedText style={styles.detailTradedBannerText}>
                    Troca Realizada
                  </ThemedText>
                </View>
              )}
              <View style={styles.categoryRow}>
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.badgeText}>{ad.category}</ThemedText>
                </View>
                {ad.distance !== undefined && (
                  <View style={styles.distanceBadge}>
                    <FontAwesome name="map-marker" size={12} color={theme.primary} />
                    <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                      {ad.distance < 1
                        ? `${Math.round(ad.distance * 1000)}m de você`
                        : `${ad.distance.toFixed(1)} km de você`}
                    </ThemedText>
                  </View>
                )}
              </View>

              <ThemedText type="subtitle" style={styles.titleText}>
                {ad.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.dateText}>
                Publicado em {new Date(ad.createdAt).toLocaleDateString('pt-BR')}
              </ThemedText>

              {/* Responsive containment photo carousel */}
              <View style={[styles.carouselContainer, { marginTop: Spacing.three }]} onLayout={handleCarouselLayout}>
                <ScrollView
                  ref={carouselScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  style={styles.carouselScroll}
                >
                  {ad.images.map((img, i) => (
                    <Pressable key={i} onPress={() => { setZoomImageUri(img); setIsZoomModalVisible(true); }}>
                      <Image 
                        source={{ uri: img }} 
                        style={{ width: carouselWidth, height: 350 }} 
                        contentFit="contain" 
                      />
                    </Pressable>
                  ))}
                </ScrollView>

                {ad.images.length > 1 && (
                  <>
                    {activePhotoIndex > 0 && (
                      <Pressable
                        onPress={handlePrevPhoto}
                        style={[styles.carouselArrowBtn, styles.carouselLeftArrow]}
                      >
                        <FontAwesome name="chevron-left" size={14} color="#ffffff" />
                      </Pressable>
                    )}
                    {activePhotoIndex < ad.images.length - 1 && (
                      <Pressable
                        onPress={handleNextPhoto}
                        style={[styles.carouselArrowBtn, styles.carouselRightArrow]}
                      >
                        <FontAwesome name="chevron-right" size={14} color="#ffffff" />
                      </Pressable>
                    )}
                  </>
                )}

                {/* Dots Indicator */}
                <View style={styles.dotsRow}>
                  {ad.images.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: i === activePhotoIndex ? theme.primary : 'rgba(255,255,255,0.4)',
                          width: i === activePhotoIndex ? 16 : 8,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <ThemedText type="smallBold" style={styles.sectionHeader}>
                Descrição do Item
              </ThemedText>
              <ThemedText type="small" themeColor="text" style={styles.descText}>
                {ad.description}
              </ThemedText>
            </ThemedView>

            {/* ==========================================
                EXCHANGE PREFERENCES
                ========================================== */}
            {ad.exchangeAccept === '_unlisted_' ? (
              <ThemedView style={[styles.adSection, styles.exchangeSection, { borderLeftColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)' }]}>
                <View style={styles.exchangeIconContainer}>
                  <FontAwesome name="lock" size={20} color="#F59E0B" />
                </View>
                <View style={styles.exchangeTextContainer}>
                  <ThemedText type="smallBold" style={{ color: '#F59E0B', fontSize: 13, textTransform: 'uppercase' }}>
                    Tipo de Anúncio
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.exchangeBodyText}>
                    Item de Proposta Privada (Não Listado)
                  </ThemedText>
                </View>
              </ThemedView>
            ) : (
              <ThemedView style={[styles.adSection, styles.exchangeSection, { borderLeftColor: theme.primary, backgroundColor: `${theme.primary}10` }]}>
                <View style={styles.exchangeIconContainer}>
                  <FontAwesome name="refresh" size={20} color={theme.primary} />
                </View>
                <View style={styles.exchangeTextContainer}>
                  <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 13, textTransform: 'uppercase' }}>
                    Sugestões de Troca do Vendedor
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.exchangeBodyText}>
                    {ad.exchangeAccept}
                  </ThemedText>
                </View>
              </ThemedView>
            )}

            {/* ==========================================
                SELLER CARD
                ========================================== */}
            <ThemedView style={styles.adSection}>
              <ThemedText type="smallBold" style={styles.sectionHeader}>
                Quem está anunciando
              </ThemedText>
              <View style={styles.sellerCard}>
                <Image source={{ uri: ad.userAvatar }} style={styles.sellerAvatar} />
                <View style={styles.sellerInfo}>
                  <ThemedText type="default" style={{ fontWeight: '700' }}>
                    {ad.userName}
                  </ThemedText>
                  <View style={styles.sellerMeta}>
                    <ThemedText style={styles.scoreText}>
                      ★ {ad.userScore} Pontos de Troca
                    </ThemedText>
                    <View style={styles.dividerDot} />
                    <ThemedText type="small" themeColor="textSecondary">
                      Membro verificado
                    </ThemedText>
                  </View>
                </View>
              </View>
            </ThemedView>

            {/* ==========================================
                APPROXIMATE LOCATION MAP
                ========================================== */}
            <ThemedView style={styles.adSection}>
              <ThemedText type="smallBold" style={styles.sectionHeader}>
                Localização Aproximada
              </ThemedText>
              <PlatformSpecificMap
                style={styles.map}
                cameraPosition={{
                  coordinates: {
                    latitude: ad.latitude,
                    longitude: ad.longitude,
                  },
                  zoom: 14,
                }}
                markers={[
                  {
                    id: 'ad-location',
                    coordinates: {
                      latitude: ad.latitude,
                      longitude: ad.longitude,
                    },
                    title: 'Local aproximado',
                  },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary" style={styles.mapInfo}>
                Por segurança, a localização exata não é revelada publicamente no mapa.
              </ThemedText>
            </ThemedView>

            {/* ==========================================
                Q&A SECTION (PUBLIC COMMENTS)
                ========================================== */}
            {ad.exchangeAccept !== '_unlisted_' && (
              <ThemedView style={styles.adSection}>
                <ThemedText type="smallBold" style={styles.sectionHeader}>
                  Perguntas e Respostas ({ad.questions.length})
                </ThemedText>

                {/* Questions List */}
                {ad.questions.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noQuestions}>
                    Ninguém perguntou nada ainda. Seja o primeiro!
                  </ThemedText>
                ) : (
                  <View style={styles.questionsList}>
                    {ad.questions.map((q) => (
                      <View key={q.id} style={styles.questionBlock}>
                        {/* User Question */}
                        <View style={styles.questionHeader}>
                          <Image source={{ uri: q.userAvatar }} style={styles.qaAvatar} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <ThemedText type="smallBold" style={{ fontSize: 13 }}>
                                {q.userName}
                              </ThemedText>
                              <ThemedText style={styles.qaDate}>
                                {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                              </ThemedText>
                            </View>
                            <ThemedText type="small" style={styles.qaContent}>
                              {q.content}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Seller Answer */}
                        {q.answer ? (
                          <View style={[styles.answerBlock, { backgroundColor: theme.backgroundSelected }]}>
                            <FontAwesome name="arrow-right" size={12} color={theme.textSecondary} style={{ marginTop: 2 }} />
                            <View style={{ flex: 1, marginLeft: Spacing.one }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                                  Resposta de {ad.userName} (Vendedor)
                                </ThemedText>
                              </View>
                              <ThemedText type="small" style={styles.answerText}>
                                {q.answer}
                              </ThemedText>
                            </View>
                          </View>
                        ) : isOwner ? (
                          /* Seller Reply Form */
                          replyingQuestionId === q.id ? (
                            <View style={styles.replyForm}>
                              <TextInput
                                placeholder="Escreva sua resposta..."
                                placeholderTextColor={theme.textSecondary}
                                value={replyText}
                                onChangeText={setReplyText}
                                style={[
                                  styles.replyInput,
                                  { color: theme.text, backgroundColor: theme.backgroundSelected },
                                ]}
                              />
                              <View style={styles.replyActions}>
                                <Pressable
                                  onPress={() => setReplyingQuestionId(null)}
                                  style={styles.cancelReplyBtn}
                                >
                                  <ThemedText type="smallBold" themeColor="textSecondary">Cancelar</ThemedText>
                                </Pressable>
                                <Pressable
                                  onPress={() => handleAnswerQuestion(q.id)}
                                  style={[styles.submitReplyBtn, { backgroundColor: theme.primary }]}
                                >
                                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Responder</ThemedText>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => {
                                setReplyingQuestionId(q.id);
                                setReplyText('');
                              }}
                              style={styles.replyTriggerBtn}
                            >
                              <FontAwesome name="reply" size={12} color={theme.primary} />
                              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                                Responder Pergunta
                              </ThemedText>
                            </Pressable>
                          )
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {/* Ask Question Form */}
                {!isOwner && (
                  <View style={styles.askQuestionBox}>
                    <TextInput
                      placeholder="Tem alguma dúvida sobre o anúncio?"
                      placeholderTextColor={theme.textSecondary}
                      value={newQuestionText}
                      onChangeText={setNewQuestionText}
                      style={[
                        styles.askInput,
                        { color: theme.text, backgroundColor: theme.backgroundSelected },
                      ]}
                    />
                    <Pressable onPress={handleAskQuestion} style={[styles.askBtn, { backgroundColor: theme.primary }]}>
                      <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                        Perguntar
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            )}
          </View>

          {/* Right Column for Sticky Card (Desktop Only) */}
          {isDesktop && (
            <View style={styles.rightColumn}>
              <ThemedView style={styles.stickyCard} type="backgroundElement">
                <ThemedText type="smallBold" style={styles.stickyCardHeader}>
                  {ad.exchangeAccept === '_unlisted_' ? 'Item Privado' : 'Oferecer uma Troca'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.four, lineHeight: 18 }}>
                  {ad.exchangeAccept === '_unlisted_' 
                    ? 'Este item faz parte de uma proposta de troca privada em andamento.' 
                    : 'Envie uma proposta de troca com algum de seus itens cadastrados ou adicione uma oferta customizada.'}
                </ThemedText>

                {ad.exchangeAccept === '_unlisted_' ? (
                  <View style={[styles.disabledActionBtn, { backgroundColor: '#F59E0B' }]}>
                    <FontAwesome name="lock" size={18} color="#ffffff" />
                    <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                      Item de Proposta Privada
                    </ThemedText>
                  </View>
                ) : isOwner ? (
                  <View style={styles.ownerBadge}>
                    <FontAwesome name="check-circle" size={16} color="#10B981" />
                    <ThemedText type="smallBold" style={{ color: '#10B981', fontSize: 13, marginLeft: 6 }}>
                      Dono do Anúncio
                    </ThemedText>
                  </View>
                ) : ad.isTraded ? (
                  <View style={[styles.disabledActionBtn, { backgroundColor: '#9CA3AF' }]}>
                    <FontAwesome name="lock" size={18} color="#ffffff" />
                    <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                      Troca Realizada
                    </ThemedText>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setIsOfferModalVisible(true)}
                    style={({ pressed }) => [
                      styles.primaryActionBtn,
                      { opacity: pressed ? 0.9 : 1, backgroundColor: theme.primary },
                    ]}
                  >
                    <FontAwesome name="refresh" size={18} color="#ffffff" />
                    <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                      Propor Troca Direta
                    </ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            </View>
          )}

          {/* Spacer */}
          <View style={{ height: BottomTabInset + Spacing.five }} />
        </View>
      </ScrollView>

      {/* ==========================================
          ACTION FOOTER (OFFER TRADE BUTTON - Mobile Only)
          ========================================== */}
      {!isDesktop && (
        <View style={[styles.actionFooter, { backgroundColor: theme.background, borderTopColor: theme.backgroundSelected }]}>
          {ad.exchangeAccept === '_unlisted_' ? (
            <View style={[styles.disabledActionBtn, { backgroundColor: '#F59E0B', width: '100%', justifyContent: 'center' }]}>
              <FontAwesome name="lock" size={18} color="#ffffff" />
              <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                Item de Proposta Privada
              </ThemedText>
            </View>
          ) : isOwner ? (
            <View style={styles.ownerBadge}>
              <FontAwesome name="check-circle" size={16} color="#10B981" />
              <ThemedText type="smallBold" style={{ color: '#10B981', fontSize: 14, marginLeft: 6 }}>
                Este é o seu próprio anúncio
              </ThemedText>
            </View>
          ) : ad.isTraded ? (
            <View style={[styles.disabledActionBtn, { backgroundColor: '#9CA3AF' }]}>
              <FontAwesome name="lock" size={18} color="#ffffff" />
              <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                Troca Realizada
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsOfferModalVisible(true)}
              style={({ pressed }) => [
                styles.primaryActionBtn,
                { opacity: pressed ? 0.9 : 1, backgroundColor: theme.primary },
              ]}
            >
              <FontAwesome name="refresh" size={18} color="#ffffff" />
              <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 15, marginLeft: 8 }}>
                Oferecer Troca (Proposta Privada)
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {/* ==========================================
          TRADE OFFER MODAL
          ========================================== */}
      <Modal
        visible={isOfferModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent} type="background">
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <ThemedText type="default" style={{ fontWeight: '700' }}>
                Nova Proposta de Troca
              </ThemedText>
              <Pressable onPress={() => setIsOfferModalVisible(false)} style={styles.closeModalBtn}>
                <FontAwesome name="times" size={18} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Product preview */}
              <View style={styles.targetPreview}>
                <Image source={{ uri: ad.images[0] }} style={styles.targetImg} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold" numberOfLines={1}>{ad.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">De: {ad.userName}</ThemedText>
                </View>
              </View>

              {/* Message Input */}
              <ThemedText type="smallBold" style={styles.modalSectionTitle}>
                Mensagem da Proposta
              </ThemedText>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="Ex: Olá! Vi seu anúncio e achei muito interessante. O que acha de trocar pelo item..."
                placeholderTextColor={theme.textSecondary}
                value={offerMessage}
                onChangeText={setOfferMessage}
                style={[
                  styles.modalTextarea,
                  { color: theme.text, backgroundColor: theme.backgroundSelected },
                ]}
              />

              {/* Offer Type selector */}
              <ThemedText type="smallBold" style={styles.modalSectionTitle}>
                O que você quer oferecer em troca?
              </ThemedText>
              <View style={styles.modalTabs}>
                <Pressable
                  onPress={() => setOfferType('link')}
                  style={[
                    styles.modalTabBtn,
                    offerType === 'link' ? { borderColor: '#3c87f7', borderBottomWidth: 2 } : null,
                  ]}
                >
                  <ThemedText type="smallBold" themeColor={offerType === 'link' ? 'text' : 'textSecondary'}>
                    Vincular meu anúncio
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setOfferType('custom')}
                  style={[
                    styles.modalTabBtn,
                    offerType === 'custom' ? { borderColor: '#3c87f7', borderBottomWidth: 2 } : null,
                  ]}
                >
                  <ThemedText type="smallBold" themeColor={offerType === 'custom' ? 'text' : 'textSecondary'}>
                    Item não listado
                  </ThemedText>
                </Pressable>
              </View>

              {/* Linking existing ad */}
              {offerType === 'link' ? (
                <View style={styles.linkListContainer}>
                  {myAdsToLink.length === 0 ? (
                    <View style={styles.noMyAds}>
                      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.two }}>
                        Você não possui anúncios cadastrados para vincular.
                      </ThemedText>
                      <Pressable
                        onPress={() => {
                          setIsOfferModalVisible(false);
                          router.push('/publish' as any);
                        }}
                        style={styles.inlinePublishBtn}
                      >
                        <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Criar um Anúncio Novo</ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <View>
                      <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
                        Selecione um de seus anúncios publicados:
                      </ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linkAdScroll}>
                        {myAdsToLink.map((myAd) => {
                          const isSelected = selectedMyAdId === myAd.id;
                          return (
                            <Pressable
                              key={myAd.id}
                              onPress={() => setSelectedMyAdId(myAd.id)}
                              style={[
                                styles.linkAdCard,
                                { backgroundColor: theme.backgroundSelected },
                                isSelected ? { borderWidth: 2, borderColor: '#3c87f7' } : null,
                              ]}
                            >
                              <Image source={{ uri: myAd.images[0] }} style={styles.linkAdImg} />
                              <ThemedText type="smallBold" numberOfLines={1} style={styles.linkAdTitle}>
                                {myAd.title}
                              </ThemedText>
                              <ThemedText style={{ fontSize: 10, color: '#3c87f7', fontWeight: '700' }}>
                                {myAd.category}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                /* Custom item fields */
                <View style={styles.customItemForm}>
                  <TextInput
                    placeholder="Título do seu item (Ex: Violão Fender semi-novo)"
                    placeholderTextColor={theme.textSecondary}
                    value={customItemTitle}
                    onChangeText={setCustomItemTitle}
                    style={[
                      styles.modalInput,
                      { color: theme.text, backgroundColor: theme.backgroundSelected },
                    ]}
                  />
                  <TextInput
                    multiline
                    numberOfLines={3}
                    placeholder="Descrição detalhada e estado de conservação do item..."
                    placeholderTextColor={theme.textSecondary}
                    value={customItemDesc}
                    onChangeText={setCustomItemDesc}
                    style={[
                      styles.modalTextarea,
                      { color: theme.text, backgroundColor: theme.backgroundSelected, marginTop: Spacing.two },
                    ]}
                  />
                  
                  <ThemedText type="smallBold" style={{ color: '#3c87f7', fontSize: 11, textTransform: 'uppercase', marginTop: Spacing.two }}>
                    Fotos do Produto
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalImagesScroll}>
                    {customItemImages.map((uri, idx) => (
                      <View key={uri} style={styles.modalImageWrapper}>
                        <Image source={{ uri }} style={styles.modalImageThumbnail} />
                        <Pressable
                          onPress={() => handleRemoveCustomImage(idx)}
                          style={styles.modalDeleteImgBtn}
                        >
                          <FontAwesome name="times-circle" size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      onPress={handlePickCustomImage}
                      style={[
                        styles.modalAddImgBtn,
                        { borderColor: theme.backgroundSelected, backgroundColor: theme.background },
                      ]}
                    >
                      <FontAwesome name="camera" size={18} color="#3c87f7" />
                      <ThemedText style={{ color: '#3c87f7', fontSize: 9, fontWeight: '700', marginTop: 2 }}>
                        Adicionar
                      </ThemedText>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              {/* Submit / Cancel Buttons */}
              <View style={styles.modalSubmitContainer}>
                <Pressable
                  onPress={() => setIsOfferModalVisible(false)}
                  style={[styles.modalBtn, { backgroundColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold">Cancelar</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSendOffer}
                  disabled={isSubmittingOffer}
                  style={[styles.modalBtn, { backgroundColor: '#3c87f7' }]}
                >
                  {isSubmittingOffer ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Enviar Proposta</ThemedText>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>

      {/* Zoom Image Modal */}
      <Modal
        visible={isZoomModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsZoomModalVisible(false)}
      >
        <Pressable 
          style={styles.zoomModalBackground} 
          onPress={() => setIsZoomModalVisible(false)}
        >
          <Pressable 
            style={styles.zoomCloseBtn} 
            onPress={() => setIsZoomModalVisible(false)}
          >
            <FontAwesome name="times-circle" size={32} color="#ffffff" />
          </Pressable>
          {zoomImageUri && (
            <Image 
              source={{ uri: zoomImageUri }} 
              style={styles.zoomModalImage} 
              contentFit="contain" 
            />
          )}
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  backBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    marginTop: Spacing.four,
  },
  floatingHeader: {
    position: 'absolute',
    left: Spacing.four,
    top: 0,
    zIndex: 10,
  },
  circleBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollContent: {
    flexGrow: 1,
  },
  carouselContainer: {
    height: 350,
    position: 'relative',
  },
  carouselScroll: {
    flex: 1,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 350,
  },
  dotsRow: {
    position: 'absolute',
    bottom: Spacing.four,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  mainContentWrapper: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  desktopMainWrapper: {
    flexDirection: 'row',
    gap: Spacing.five,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingTop: Platform.select({ web: 90, default: 0 }),
  },
  leftColumn: {
    flex: 1.8,
    gap: Spacing.four,
  },
  rightColumn: {
    flex: 1.2,
    maxWidth: 400,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 100,
        alignSelf: 'flex-start',
      } as any,
    }),
  },
  fullWidthColumn: {
    width: '100%',
    gap: Spacing.four,
  },
  stickyCard: {
    padding: Spacing.four,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  stickyCardHeader: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  adSection: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: Spacing.three,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  exchangeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  exchangeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  exchangeTextContainer: {
    flex: 1,
  },
  exchangeBodyText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.three,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  scoreText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9ca3af',
    marginHorizontal: Spacing.two,
  },
  map: {
    height: 200,
    width: '100%',
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
  },
  mapInfo: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.two,
    fontStyle: 'italic',
  },
  noQuestions: {
    fontStyle: 'italic',
    paddingVertical: Spacing.two,
  },
  questionsList: {
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  questionBlock: {
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  questionHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  qaAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  qaDate: {
    fontSize: 10,
    color: '#9ca3af',
  },
  qaContent: {
    fontWeight: '500',
    marginTop: 2,
  },
  answerBlock: {
    flexDirection: 'row',
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
    marginLeft: 36,
  },
  answerText: {
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  replyTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
    marginLeft: 36,
  },
  replyForm: {
    marginTop: Spacing.two,
    marginLeft: 36,
    gap: Spacing.two,
  },
  replyInput: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  cancelReplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
  },
  submitReplyBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: 6,
  },
  askQuestionBox: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  askInput: {
    flex: 1,
    height: 40,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  askBtn: {
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Spacing.two,
    height: 40,
  },
  actionFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Spacing.three,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    height: '80%',
    padding: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.three,
  },
  closeModalBtn: {
    padding: Spacing.one,
  },
  modalScroll: {
    flexGrow: 1,
  },
  targetPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginBottom: Spacing.three,
  },
  targetImg: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    textTransform: 'uppercase',
  },
  modalTextarea: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    fontWeight: '500',
    width: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  modalTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: Spacing.three,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  linkListContainer: {
    marginBottom: Spacing.three,
  },
  noMyAds: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  inlinePublishBtn: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  linkAdScroll: {
    gap: Spacing.two,
  },
  linkAdCard: {
    width: 120,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  linkAdImg: {
    width: 100,
    height: 70,
    borderRadius: 6,
    marginBottom: Spacing.one,
  },
  linkAdTitle: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  customItemForm: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  modalInput: {
    height: 40,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  photoPlaceholderCard: {
    height: 80,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  modalImagesScroll: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  modalImageWrapper: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: Spacing.one,
    overflow: 'hidden',
  },
  modalImageThumbnail: {
    width: '100%',
    height: '100%',
  },
  modalDeleteImgBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
  },
  modalAddImgBtn: {
    width: 60,
    height: 60,
    borderRadius: Spacing.one,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  modalBtn: {
    flex: 1,
    height: 48,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: Platform.select({ ios: 60, default: 40 }),
    right: 30,
    zIndex: 10000,
  },
  zoomModalImage: {
    width: '95%',
    height: '85%',
  },
  carouselArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      } as any,
    }),
  },
  carouselLeftArrow: {
    left: Spacing.three,
  },
  carouselRightArrow: {
    right: Spacing.three,
  },
  detailTradedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    marginBottom: Spacing.three,
    alignSelf: 'flex-start',
  },
  detailTradedBannerText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tradedAdDetails: {
    opacity: 0.75,
    ...Platform.select({
      web: {
        filter: 'grayscale(90%)',
      } as any,
    }),
  },
  disabledActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Spacing.three,
    width: '100%',
    maxWidth: 500,
    opacity: 0.8,
  },
});
