import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';

const CATEGORIES = ['Todos', 'Eletrônicos', 'Moda', 'Esportes', 'Casa', 'Livros'];

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { ads, userLocationCity, requestLocation, isLoading } = useStore();
  
  const { width } = useWindowDimensions();
  const numColumns = width < 744 ? 1 : width < 1128 ? 2 : width < 1440 ? 3 : 4;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState<'distance' | 'recent'>('distance');

  // Infinite Scroll State
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [prevFilters, setPrevFilters] = useState(() => ({
    searchQuery: '',
    selectedCategory: 'Todos',
    sortBy: 'distance' as 'distance' | 'recent',
    ads,
  }));

  // Filter and Sort the full list
  const getFilteredAds = () => {
    let result = ads.filter((ad) => ad.exchangeAccept !== '_unlisted_');

    // Search query filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ad) =>
          ad.title.toLowerCase().includes(q) ||
          ad.description.toLowerCase().includes(q) ||
          ad.exchangeAccept.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'Todos') {
      result = result.filter((ad) => ad.category === selectedCategory);
    }

    // Sorting
    if (sortBy === 'distance') {
      // Sort by distance (ads with no distance computed go to the end)
      result.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    } else {
      // Sort by date (newest first)
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  };

  const filteredAds = getFilteredAds();

  // If filters changed, reset page to 1 directly during render
  if (
    prevFilters.searchQuery !== searchQuery ||
    prevFilters.selectedCategory !== selectedCategory ||
    prevFilters.sortBy !== sortBy ||
    prevFilters.ads !== ads
  ) {
    setPage(1);
    setPrevFilters({
      searchQuery,
      selectedCategory,
      sortBy,
      ads,
    });
  }

  const visibleAds = filteredAds.slice(0, page * 10);
  const hasMore = filteredAds.length > visibleAds.length;

  // Load more simulator (infinite scroll)
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 600); // smooth feel
  };

  // Helper to format distances nicely
  const formatDistance = (dist?: number) => {
    if (dist === undefined) return 'Carregando...';
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m de distância`;
    }
    return `${dist.toFixed(1)} km de distância`;
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ==========================================
            HEADER BAR & SEARCH
            ========================================== */}
        {Platform.OS !== 'web' && (
          <ThemedView style={styles.header}>
            <View>
              <ThemedText type="subtitle" style={styles.logoTitle}>
                TrocaTroca
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Anúncios e trocas inteligentes
              </ThemedText>
            </View>
          </ThemedView>
        )}

        {/* ==========================================
            SEARCH INPUT
            ========================================== */}
        <ThemedView style={styles.searchWrapper}>
          <ThemedView type="backgroundSelected" style={styles.searchBox}>
            <FontAwesome
              name="search"
              size={18}
              color={theme.textSecondary}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="O que você está procurando?"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <FontAwesome
                  name="times-circle"
                  size={16}
                  color={theme.textSecondary}
                />
              </Pressable>
            )}
          </ThemedView>
        </ThemedView>

        {/* ==========================================
            LOCATION & PROXIMITY BADGE
            ========================================== */}
        <ThemedView style={styles.locationBar} type="backgroundElement">
          <View style={styles.locationLeft}>
            <FontAwesome
              name="map-marker"
              size={20}
              color={theme.primary}
              style={{ marginRight: 4 }}
            />
            <View style={styles.locationInfo}>
              <ThemedText type="smallBold" style={styles.locationTitle}>
                Localização de Busca
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.locationText} numberOfLines={1}>
                {userLocationCity || 'Padrão (São Paulo - SP)'}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={requestLocation}
            style={({ pressed }) => [
              styles.locationBtn,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                Atualizar Proximidade
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        {/* ==========================================
            CATEGORIES
            ========================================== */}
        <View style={styles.categoryScrollContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryBtn,
                    isActive
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: isActive ? '#ffffff' : theme.text,
                      fontSize: 13,
                    }}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ==========================================
            SORT TOGGLE & RESULTS COUNT
            ========================================== */}
        <View style={styles.filterBar}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {filteredAds.length} {filteredAds.length === 1 ? 'anúncio encontrado' : 'anúncios encontrados'}
          </ThemedText>
          <View style={styles.toggleWrapper}>
            <Pressable
              onPress={() => setSortBy('distance')}
              style={[
                styles.toggleBtn,
                sortBy === 'distance'
                  ? { backgroundColor: theme.backgroundSelected }
                  : null,
              ]}
            >
              <ThemedText
                type="smallBold"
                themeColor={sortBy === 'distance' ? 'text' : 'textSecondary'}
                style={{ fontSize: 12 }}
              >
                Mais Próximos
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSortBy('recent')}
              style={[
                styles.toggleBtn,
                sortBy === 'recent'
                  ? { backgroundColor: theme.backgroundSelected }
                  : null,
              ]}
            >
              <ThemedText
                type="smallBold"
                themeColor={sortBy === 'recent' ? 'text' : 'textSecondary'}
                style={{ fontSize: 12 }}
              >
                Recentes
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* ==========================================
            ADS FEED LIST
            ========================================== */}
        <FlatList
          key={numColumns}
          numColumns={numColumns}
          data={visibleAds}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.feedList,
            { paddingBottom: BottomTabInset + Spacing.five },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome
                name="info-circle"
                size={40}
                color={theme.textSecondary}
              />
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.emptyText}>
                Nenhum anúncio encontrado para estes filtros.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                console.log('👉 CLIQUEI NO AD COM ID:', item.id);
                console.log('👉 ROTA PARA NAVEGAÇÃO:', `/ad/${item.id}`);
                router.push(`/ad/${item.id}`);
              }}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.95 : 1 },
                item.isTraded ? styles.tradedCard : null,
              ]}
            >
              {/* Product Cover Photo */}
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.images[0] }}
                  style={styles.cardImage}
                  contentFit="cover"
                  transition={200}
                />
                {/* Distance Overlay */}
                <View style={styles.distanceBadge}>
                  <FontAwesome name="map-marker" size={10} color="#ffffff" />
                  <ThemedText style={styles.distanceText}>
                    {formatDistance(item.distance)}
                  </ThemedText>
                </View>
                {/* Category Badge */}
                <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.categoryBadgeText}>
                    {item.category}
                  </ThemedText>
                </View>
                {item.isTraded && (
                  <View style={styles.tradedOverlay}>
                    <View style={styles.tradedBadge}>
                      <ThemedText style={styles.tradedBadgeText}>
                        Troca Realizada
                      </ThemedText>
                    </View>
                  </View>
                )}
              </View>

              {/* Card Details */}
              <View style={styles.cardInfo}>
                <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.cardDesc} numberOfLines={2}>
                  {item.description}
                </ThemedText>

                {/* Trade details */}
                <View style={[styles.tradeBox, { borderLeftColor: theme.primary, backgroundColor: `${theme.primary}10` }]}>
                  <ThemedText style={[styles.tradeHeader, { color: theme.primary }]}>Aceita Trocar Por:</ThemedText>
                  <ThemedText style={styles.tradeBody} numberOfLines={1}>
                    {item.exchangeAccept}
                  </ThemedText>
                </View>

                {/* Seller & Q&A Stats */}
                <View style={styles.footerRow}>
                  <View style={styles.sellerRow}>
                    <Image source={{ uri: item.userAvatar }} style={styles.sellerAvatar} />
                    <View>
                      <ThemedText style={styles.sellerName}>{item.userName}</ThemedText>
                      <ThemedText style={styles.sellerScore}>
                        ★ {item.userScore} Pontos
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.statsRow}>
                    <FontAwesome name="comments" size={14} color={theme.textSecondary} />
                    <ThemedText style={styles.statsText} themeColor="textSecondary">
                      {item.questions.length} Q&A
                    </ThemedText>
                  </View>
                </View>
              </View>
            </Pressable>
          )}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loaderFooter}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: Spacing.two }}>
                  Carregando mais...
                </ThemedText>
              </View>
            ) : hasMore && filteredAds.length > 10 ? (
              <Pressable onPress={handleLoadMore} style={[styles.loadMoreBtn, { borderColor: theme.primary }]}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Carregar Mais Anúncios
                </ThemedText>
              </Pressable>
            ) : null
          }
        />
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
    paddingTop: Platform.select({ web: 15, default: 0 }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 9999,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingLeft: Spacing.two,
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationInfo: {
    marginLeft: Spacing.two,
    flex: 1,
  },
  locationTitle: {
    fontSize: 12,
  },
  locationText: {
    fontSize: 11,
  },
  locationBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  categoryScrollContainer: {
    height: 38,
    marginBottom: Spacing.three,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  categoryBtn: {
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: 18,
    height: 32,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  toggleWrapper: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
  },
  feedList: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
    margin: Spacing.two,
    minWidth: 250,
  },
  imageWrapper: {
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: Spacing.two,
    left: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: Spacing.three,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  tradeBox: {
    borderLeftWidth: 3,
    padding: Spacing.two,
    borderRadius: 4,
    marginBottom: Spacing.three,
  },
  tradeHeader: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tradeBody: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.two,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sellerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  sellerScore: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
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
    maxWidth: 240,
  },
  loaderFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  loadMoreBtn: {
    alignSelf: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
    borderWidth: 1.5,
  },
  tradedCard: {
    opacity: 0.7,
    ...Platform.select({
      web: {
        filter: 'grayscale(90%)',
      } as any,
    }),
  },
  tradedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tradedBadge: {
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tradedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
