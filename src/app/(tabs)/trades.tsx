import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';

export default function TradesScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const {
    currentUser,
    offers,
    ads,
    respondToOffer,
    sendChatMessage,
  } = useStore();

  // Tab: 'sent' (made by current user) or 'received' (made by others to current user)
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('received');
  
  // Expanded Offer Detail State
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

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
            Para visualizar suas ofertas e mensagens privadas, é necessário conectar-se à sua conta.
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

  // Filter offers based on tab selection
  const filteredOffers = offers.filter((o) => {
    if (activeTab === 'sent') {
      return o.senderId === currentUser.id;
    } else {
      return o.receiverId === currentUser.id;
    }
  });

  // Handle Send Chat message
  const handleSendMessage = (offerId: string) => {
    if (!chatInput.trim()) return;
    sendChatMessage(offerId, chatInput.trim());
    setChatInput('');
  };

  // Helper to resolve linked ad detail
  const getLinkedAdInfo = (offer: typeof offers[0]) => {
    if (!offer.linkedAdId) return null;
    return ads.find((a) => a.id === offer.linkedAdId) || offer.linkedAd;
  };

  // Get status color styling
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'accepted':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: 'Aceita' };
      case 'rejected':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: 'Recusada' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', label: 'Pendente' };
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Minhas Trocas
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Negocie propostas e gerencie ofertas enviadas ou recebidas
          </ThemedText>
        </ThemedView>

        {/* Tab switch control */}
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => {
              setActiveTab('received');
              setExpandedOfferId(null);
            }}
            style={[
              styles.tabBtn,
              { borderBottomColor: activeTab === 'received' ? '#3c87f7' : 'transparent' },
            ]}
          >
            <ThemedText
              type="smallBold"
              themeColor={activeTab === 'received' ? 'text' : 'textSecondary'}
            >
              Ofertas Recebidas
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setActiveTab('sent');
              setExpandedOfferId(null);
            }}
            style={[
              styles.tabBtn,
              { borderBottomColor: activeTab === 'sent' ? '#3c87f7' : 'transparent' },
            ]}
          >
            <ThemedText
              type="smallBold"
              themeColor={activeTab === 'sent' ? 'text' : 'textSecondary'}
            >
              Ofertas Enviadas
            </ThemedText>
          </Pressable>
        </View>

        {/* Offers list scroll */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: BottomTabInset + Spacing.five },
          ]}
        >
          {filteredOffers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <SymbolView
                name="arrow.triangle.2.circlepath.camera"
                tintColor={theme.textSecondary}
                size={40}
              />
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.emptyText}>
                {activeTab === 'received'
                  ? 'Você ainda não recebeu propostas de troca para seus anúncios.'
                  : 'Você ainda não fez propostas de troca em outros anúncios.'}
              </ThemedText>
            </View>
          ) : (
            filteredOffers.map((offer) => {
              const isExpanded = expandedOfferId === offer.id;
              const badge = getStatusBadgeStyle(offer.status);
              const linkedAd = getLinkedAdInfo(offer);

              return (
                <ThemedView key={offer.id} style={styles.offerCard} type="backgroundElement">
                  {/* Card Header collapsed summary */}
                  <Pressable
                    onPress={() => setExpandedOfferId(isExpanded ? null : offer.id)}
                    style={styles.offerCardHeader}
                  >
                    <View style={styles.headerInfo}>
                      <Image source={{ uri: offer.adImage }} style={styles.adThumb} />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {offer.adTitle}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {activeTab === 'received' ? `De: ${offer.senderName}` : `Para dono do anúncio`}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.headerRight}>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <ThemedText style={{ color: badge.text, fontSize: 10, fontWeight: '700' }}>
                          {badge.label}
                        </ThemedText>
                      </View>
                      <SymbolView
                        name={isExpanded ? 'chevron.up' : 'chevron.down'}
                        tintColor={theme.textSecondary}
                        size={14}
                      />
                    </View>
                  </Pressable>

                  {/* Expanded conversation and offer details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <View style={styles.divider} />
                      
                      {/* Swapping items comparison */}
                      <ThemedText type="smallBold" style={styles.detailsLabel}>
                        Itens na Negociação
                      </ThemedText>

                      <View style={styles.tradeComparison}>
                        {/* Target Product */}
                        <Pressable
                          onPress={() => router.push(`/ad/${offer.adId}`)}
                          style={({ pressed }) => [
                            styles.comparisonCol,
                            styles.clickableAdCol,
                            { opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          <Image source={{ uri: offer.adImage }} style={styles.compareImg} />
                          <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 12, color: '#3c87f7', textDecorationLine: 'underline' }}>
                            {offer.adTitle}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <ThemedText style={styles.compareRoleText}>Item Desejado</ThemedText>
                            <SymbolView name="arrow.up.right" tintColor="#3c87f7" size={10} />
                          </View>
                        </Pressable>

                        {/* Trade Symbol */}
                        <View style={styles.compareSymbol}>
                          <SymbolView name="arrow.left.and.right" tintColor="#3c87f7" size={18} />
                        </View>

                        {/* Offerer Product */}
                        {offer.linkedAdId ? (
                          /* Case 1: Linked listed item */
                          <Pressable
                            onPress={() => router.push(`/ad/${offer.linkedAdId}`)}
                            style={({ pressed }) => [
                              styles.comparisonCol,
                              styles.clickableAdCol,
                              { opacity: pressed ? 0.8 : 1 },
                            ]}
                          >
                            <Image source={{ uri: linkedAd?.images[0] || offer.adImage }} style={styles.compareImg} />
                            <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 12, color: '#3c87f7', textDecorationLine: 'underline' }}>
                              {linkedAd?.title || 'Carregando...'}
                            </ThemedText>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <ThemedText style={styles.compareRoleText}>
                                {linkedAd?.exchangeAccept === '_unlisted_'
                                  ? 'Item Customizado'
                                  : activeTab === 'sent'
                                  ? 'Meu Item Anunciado'
                                  : 'Item Oferecido'}
                              </ThemedText>
                              <SymbolView name="arrow.up.right" tintColor="#3c87f7" size={10} />
                            </View>
                          </Pressable>
                        ) : (
                          /* Case 2: Custom item */
                          <View style={styles.comparisonCol}>
                            <Image source={{ uri: offer.customItemImages?.[0] || 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=200' }} style={styles.compareImg} />
                            <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 12 }}>
                              {offer.customItemTitle}
                            </ThemedText>
                            <ThemedText style={styles.compareRoleText}>Item Customizado</ThemedText>
                          </View>
                        )}
                      </View>

                      {/* Custom Item description if custom */}
                      {!offer.linkedAdId && (
                        <View style={[styles.customDescBox, { backgroundColor: theme.backgroundSelected }]}>
                          <ThemedText type="smallBold" style={{ fontSize: 12, color: '#3c87f7', marginBottom: 2 }}>
                            Detalhes do Item Não Listado:
                          </ThemedText>
                          <ThemedText type="small" style={{ fontSize: 12 }}>
                            {offer.customItemDescription}
                          </ThemedText>
                        </View>
                      )}

                      {/* Chat negotiation history */}
                      <ThemedText type="smallBold" style={[styles.detailsLabel, { marginTop: Spacing.four }]}>
                        Mensagens da Negociação
                      </ThemedText>

                      <View style={[styles.chatBox, { backgroundColor: theme.backgroundSelected }]}>
                        <ScrollView
                          nestedScrollEnabled={true}
                          style={styles.chatScroll}
                          contentContainerStyle={{ gap: Spacing.two }}
                        >
                          {offer.chat.map((msg) => {
                            const isMe = msg.senderId === currentUser.id;
                            return (
                              <View
                                key={msg.id}
                                style={[
                                  styles.chatBubble,
                                  isMe ? styles.bubbleRight : styles.bubbleLeft,
                                  isMe ? { backgroundColor: '#3c87f7' } : { backgroundColor: theme.background },
                                ]}
                              >
                                <ThemedText
                                  style={{
                                    color: isMe ? '#ffffff' : theme.text,
                                    fontSize: 12,
                                    fontWeight: '500',
                                  }}
                                >
                                  {msg.content}
                                </ThemedText>
                                <ThemedText
                                  style={[
                                    styles.chatTime,
                                    { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary },
                                  ]}
                                >
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </ThemedText>
                              </View>
                            );
                          })}
                        </ScrollView>

                        {/* Send Chat input bar */}
                        <View style={styles.chatInputRow}>
                          <TextInput
                            placeholder="Tire dúvidas ou combine a troca..."
                            placeholderTextColor={theme.textSecondary}
                            value={chatInput}
                            onChangeText={setChatInput}
                            style={[
                              styles.chatInput,
                              { color: theme.text, backgroundColor: theme.background },
                            ]}
                          />
                          <Pressable
                            onPress={() => handleSendMessage(offer.id)}
                            style={styles.chatSendBtn}
                          >
                            <SymbolView name="paperplane.fill" tintColor="#ffffff" size={12} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Seller Action Decision buttons (Only shown to receiver in pending state) */}
                      {activeTab === 'received' && offer.status === 'pending' && (
                        <View style={styles.decisionRow}>
                          <Pressable
                            onPress={() => respondToOffer(offer.id, 'rejected')}
                            style={[styles.decisionBtn, styles.rejectBtn]}
                          >
                            <SymbolView name="xmark" tintColor="#ffffff" size={14} />
                            <ThemedText style={{ color: '#ffffff', fontSize: 13 }} type="smallBold">
                              Recusar Proposta
                            </ThemedText>
                          </Pressable>
                          
                          <Pressable
                            onPress={() => respondToOffer(offer.id, 'accepted')}
                            style={[styles.decisionBtn, styles.acceptBtn]}
                          >
                            <SymbolView name="checkmark" tintColor="#ffffff" size={14} />
                            <ThemedText style={{ color: '#ffffff', fontSize: 13 }} type="smallBold">
                              Aceitar Troca
                            </ThemedText>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}
                </ThemedView>
              );
            })
          )}
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  offerCard: {
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  offerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  adThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
  },
  expandedContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: Spacing.three,
  },
  detailsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3c87f7',
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  tradeComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  comparisonCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  clickableAdCol: {
    backgroundColor: 'rgba(60, 135, 247, 0.04)',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(60, 135, 247, 0.12)',
    shadowColor: '#3c87f7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  compareImg: {
    width: 60,
    height: 44,
    borderRadius: 6,
  },
  compareRoleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  compareSymbol: {
    paddingHorizontal: Spacing.one,
  },
  customDescBox: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  chatBox: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  chatScroll: {
    maxHeight: 180,
    minHeight: 100,
    paddingRight: Spacing.one,
  },
  chatBubble: {
    maxWidth: '80%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    position: 'relative',
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  chatTime: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  chatInput: {
    flex: 1,
    height: 36,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 12,
    fontWeight: '500',
      ...Platform.select({
        web: { outlineStyle: 'none' as any },
      }),
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3c87f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 38,
    borderRadius: Spacing.two,
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  acceptBtn: {
    backgroundColor: '#10B981',
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
