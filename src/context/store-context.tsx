/* eslint-disable react-hooks/set-state-in-effect */
import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';

// ==========================================
// TYPES DEFINITION
// ==========================================

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  createdAt: string;
  score: number;
  tradesCount: number;
  messagesCount: number;
}

export interface Question {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  answer?: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  exchangeAccept: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userScore: number;
  distance?: number; // calculated dynamically in km
  questions: Question[];
  isTraded?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

export interface TradeOffer {
  id: string;
  adId: string;
  adTitle: string;
  adImage: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  linkedAdId?: string; // offer a listing they already have
  linkedAd?: Ad; // custom unlisted or linked ad details
  customItemTitle?: string;
  customItemDescription?: string;
  customItemImages?: string[];
  chat: ChatMessage[];
  createdAt: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  message: string | null;
  type: ToastType | null;
  visible: boolean;
}

export interface StoreContextType {
  currentUser: User | null;
  ads: Ad[];
  offers: TradeOffer[];
  toast: ToastState;
  userLocation: Location.LocationObject | null;
  userLocationCity: string | null;
  isLoading: boolean;
  themeMode: 'light' | 'dark' | 'system';

  // Theme Functions
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;

  // Auth Functions
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (name: string, avatarUrl: string) => Promise<boolean>;

  // Location Functions
  requestLocation: () => Promise<Location.LocationObject | null>;

  // Ad Functions
  publishAd: (adData: Omit<Ad, 'id' | 'createdAt' | 'userId' | 'userName' | 'userAvatar' | 'userScore' | 'questions'>) => Promise<boolean>;
  deleteAd: (adId: string) => Promise<void>;
  askQuestion: (adId: string, content: string) => Promise<void>;
  answerQuestion: (adId: string, questionId: string, answer: string) => Promise<void>;

  // Offer Functions
  createOffer: (offerData: Omit<TradeOffer, 'id' | 'senderId' | 'senderName' | 'senderAvatar' | 'status' | 'chat' | 'createdAt'>) => Promise<boolean>;
  respondToOffer: (offerId: string, status: 'accepted' | 'rejected') => Promise<void>;
  sendChatMessage: (offerId: string, content: string) => Promise<void>;

  // Toast Functions
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
}

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Default coordinates (São Paulo - SP) if geolocation is not available
const DEFAULT_LAT = -23.55052;
const DEFAULT_LNG = -46.633308;

// ==========================================
// HAVERSINE FORMULA FOR PROXIMITY
// ==========================================
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// (Mock databases removed)

// ==========================================
// BASE64 TO ARRAYBUFFER UTILITY
// ==========================================
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let bufferLength = base64.length * 0.75;
  if (base64[base64.length - 1] === '=') {
    bufferLength--;
    if (base64[base64.length - 2] === '=') {
      bufferLength--;
    }
  }

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const bytes = new Uint8Array(arrayBuffer);

  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const encoded1 = lookup[base64.charCodeAt(i)];
    const encoded2 = lookup[base64.charCodeAt(i + 1)];
    const encoded3 = lookup[base64.charCodeAt(i + 2)];
    const encoded4 = lookup[base64.charCodeAt(i + 3)];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return arrayBuffer;
}

// ==========================================
// PROVIDER IMPLEMENTATION
// ==========================================

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Conditional storage helper for SSR/Web/Native
  const storage = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        return require('@react-native-async-storage/async-storage').default;
      } catch (e) {
        console.error('Failed to load AsyncStorage on client:', e);
      }
    }
    return null;
  }, []);

  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (storage) {
        try {
          const savedTheme = await storage.getItem('theme_mode');
          if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
            setThemeModeState(savedTheme);
          }
        } catch (e) {
          console.error('Failed to load theme:', e);
        }
      }
    };
    loadTheme();
  }, [storage]);

  const setThemeMode = useCallback(async (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    if (storage) {
      try {
        await storage.setItem('theme_mode', mode);
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
    }
  }, [storage]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [userLocationCity, setUserLocationCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [toast, setToast] = useState<ToastState>({
    message: null,
    type: null,
    visible: false,
  });

  // Toast floating notification helpers
  const showToast = useCallback((message: string, type: ToastType) => {
    setToast({ message, type, visible: true });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // Auto hide toast after 3 seconds
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        hideToast();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible, hideToast]);

  const fetchAds = useCallback(async () => {
    setIsLoading(true);
    try {
      // We fetch all columns from 'ads', joining the seller's profile,
      // and joining all questions (along with the profiles of the people who asked them),
      // and joining offers to check if the trade has been accepted/completed.
      const { data, error } = await supabase
        .from('ads')
        .select(`
        *,
        profiles (
          name,
          avatar,
          score
        ),
        questions (
          *,
          profiles (
            name,
            avatar
          )
        ),
        offers!ad_id (
          status
        ),
        offers_linked:offers!linked_ad_id (
          status
        )
      `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Now, map the Postgres snake_case fields back into the camelCase 'Ad' type
        // expected by the frontend components:
        const mappedAds: Ad[] = data.map((item: any) => {
          const hasAcceptedOffer = (item.offers || []).some((o: any) => o.status === 'accepted') ||
                                   (item.offers_linked || []).some((o: any) => o.status === 'accepted');
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            images: item.images || [],
            exchangeAccept: item.exchange_accept,
            latitude: item.latitude,
            longitude: item.longitude,
            createdAt: item.created_at,
            userId: item.user_id,
            userName: item.profiles?.name || 'Usuário',
            userAvatar: item.profiles?.avatar || '',
            userScore: item.profiles?.score || 0,
            isTraded: hasAcceptedOffer,
            // Format public questions for the ad card
            questions: (item.questions || []).map((q: any) => ({
              id: q.id,
              userId: q.user_id,
              userName: q.profiles?.name || 'Anônimo',
              userAvatar: q.profiles?.avatar || '',
              content: q.content,
              createdAt: q.created_at,
              answer: q.answer || undefined,
            })),
          };
        });

        setAds(mappedAds);
      }
    } catch (e: any) {
      showToast(`Erro ao carregar anúncios: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentUser({
          id: data.id,
          name: data.name,
          email: data.email,
          avatar: data.avatar,
          createdAt: data.created_at,
          score: data.score || 0,
          tradesCount: data.trades_count || 0,
          messagesCount: data.messages_count || 0,
        });
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  }, []);

  const fetchOffers = useCallback(async () => {
    if (!currentUser) return;
    try {
      // Fetch all offers where the current user is either the sender or receiver
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          ad:ads!ad_id(*),
          linked_ad:ads!linked_ad_id(*),
          sender:profiles!sender_id(*),
          receiver:profiles!receiver_id(*),
          chat_messages (
            *,
            sender:profiles(*)
          )
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedOffers: TradeOffer[] = data.map((item: any) => ({
          id: item.id,
          adId: item.ad_id,
          adTitle: item.ad?.title || 'Anúncio indisponível',
          adImage: item.ad?.images?.[0] || 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200',
          senderId: item.sender_id,
          senderName: item.sender?.name || 'Comprador',
          senderAvatar: item.sender?.avatar || '',
          receiverId: item.receiver_id,
          message: item.message,
          status: item.status,
          linkedAdId: item.linked_ad_id || undefined,
          linkedAd: item.linked_ad ? {
            id: item.linked_ad.id,
            title: item.linked_ad.title,
            description: item.linked_ad.description,
            category: item.linked_ad.category,
            images: item.linked_ad.images || [],
            exchangeAccept: item.linked_ad.exchange_accept,
            latitude: item.linked_ad.latitude,
            longitude: item.linked_ad.longitude,
            createdAt: item.linked_ad.created_at,
            userId: item.linked_ad.user_id,
            userName: item.sender?.name || 'Usuário',
            userAvatar: item.sender?.avatar || '',
            userScore: item.sender?.score || 0,
            questions: [],
          } : undefined,
          customItemTitle: item.custom_item_title || undefined,
          customItemDescription: item.custom_item_description || undefined,
          customItemImages: item.custom_item_images || undefined,
          // Sort chat history chronologically
          chat: (item.chat_messages || [])
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((msg: any) => ({
              id: msg.id,
              senderId: msg.sender_id,
              content: msg.content,
              createdAt: msg.created_at,
            })),
          createdAt: item.created_at,
        }));

        setOffers(mappedOffers);
      }
    } catch (e: any) {
      console.error('Erro ao carregar ofertas:', e);
    }
  }, [currentUser]);

  // Load offers reactively & subscribe to live real-time chat messages!
  useEffect(() => {
    if (currentUser) {
      fetchOffers();

      // 📡 Create a WebSocket channel listening for new chat messages in PostgreSQL
      const channel = supabase
        .channel('realtime-chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            // A new message has arrived! Re-fetch our offers to display it instantly
            fetchOffers();
          }
        )
        .subscribe();

      // Clean up the WebSocket connection when the user logs out or leaves
      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setOffers([]);
    }
  }, [currentUser, fetchOffers]);


  // Auth state listener on mount
  useEffect(() => {
    fetchAds();
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    // 2. Listen to session updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAds, fetchProfile]);







  // Reverse geocode whenever userLocation is updated
  useEffect(() => {
    const getCityName = async () => {
      if (!userLocation) {
        setUserLocationCity(null);
        return;
      }
      try {
        if (Platform.OS === 'web') {
          // Fallback reverse geocoding via OpenStreetMap Nominatim for the Web platform
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.coords.latitude}&lon=${userLocation.coords.longitude}&zoom=10&addressdetails=1`,
            {
              headers: {
                'Accept': 'application/json',
              }
            }
          );
          const data = await response.json();
          if (data && data.address) {
            const address = data.address;
            const cityName = address.city || address.town || address.village || address.suburb || address.municipality || '';
            const regionName = address.state || address.region || '';
            const displayCity = cityName
              ? (regionName ? `${cityName} - ${regionName}` : cityName)
              : `${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)}`;
            setUserLocationCity(displayCity);
            return;
          }
        }

        const address = await Location.reverseGeocodeAsync({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        });
        if (address && address.length > 0) {
          const firstAddr = address[0];
          const cityName = firstAddr.city || firstAddr.subregion || firstAddr.district || '';
          const regionName = firstAddr.region || '';
          const displayCity = cityName 
            ? (regionName ? `${cityName} - ${regionName}` : cityName)
            : `${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)}`;
          setUserLocationCity(displayCity);
        } else {
          setUserLocationCity(`${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)}`);
        }
      } catch (e) {
        console.error('Failed to geocode location:', e);
        setUserLocationCity(`${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)}`);
      }
    };
    getCityName();
  }, [userLocation]);

  // Dynamically calculate current user score and counts based on active offers & messages
  const currentUserWithScore = useMemo(() => {
    if (!currentUser) return null;

    const tradesCount = offers.filter(o => o.status === 'accepted').length;
    const messagesCount = offers.reduce((acc, offer) => {
      return acc + offer.chat.filter(msg => msg.senderId === currentUser.id).length;
    }, 0);
    const score = tradesCount * 10 + messagesCount;

    return {
      ...currentUser,
      score,
      tradesCount,
      messagesCount,
    };
  }, [currentUser, offers]);

  // Synchronize score, trades_count, and messages_count back to Supabase profiles table
  useEffect(() => {
    if (currentUserWithScore) {
      const syncScore = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({
              score: currentUserWithScore.score,
              trades_count: currentUserWithScore.tradesCount,
              messages_count: currentUserWithScore.messagesCount,
            })
            .eq('id', currentUserWithScore.id);
          if (error) {
            console.error('Failed to sync score to profiles table:', error);
          }
        } catch (e) {
          console.error('Failed to sync score:', e);
        }
      };
      syncScore();
    }
  }, [
    currentUserWithScore?.score,
    currentUserWithScore?.tradesCount,
    currentUserWithScore?.messagesCount
  ]);

  // Recalculate proximity distances whenever the user location or ads changes
  const adsWithDistance = useMemo(() => {
    const lat = userLocation?.coords.latitude ?? DEFAULT_LAT;
    const lng = userLocation?.coords.longitude ?? DEFAULT_LNG;

    return ads.map((ad) => {
      const isMe = currentUserWithScore && ad.userId === currentUserWithScore.id;
      return {
        ...ad,
        userScore: isMe ? currentUserWithScore.score : ad.userScore,
        distance: getDistanceInKm(lat, lng, ad.latitude, ad.longitude),
      };
    });
  }, [ads, userLocation, currentUserWithScore]);

  // Auth: Supabase Log In
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const formattedEmail = email.toLowerCase().trim();

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      showToast(`Erro de login: ${error.message}`, 'error');
      setIsLoading(false);
      return false;
    }

    showToast('Login realizado com sucesso!', 'success');
    setIsLoading(false);
    return true;
  };

  // Auth: Supabase Registration
  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    const formattedEmail = email.toLowerCase().trim();

    const { data, error } = await supabase.auth.signUp({
      email: formattedEmail,
      password: password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      showToast(`Erro no cadastro: ${error.message}`, 'error');
      setIsLoading(false);
      return false;
    }

    if (data.user && !data.session) {
      showToast('Cadastro realizado! Por favor, verifique seu e-mail para confirmar a conta.', 'info');
    } else {
      showToast('Cadastro realizado com sucesso!', 'success');
    }
    setIsLoading(false);
    return true;
  };

  // Auth: Supabase Log Out
  const logout = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    setIsLoading(false);
    if (error) {
      showToast(`Erro ao sair: ${error.message}`, 'error');
    } else {
      showToast('Sessão encerrada com sucesso.', 'info');
    }
  };

  // Auth: Update profile name and/or avatar
  const updateProfile = async (name: string, avatarUrl: string): Promise<boolean> => {
    if (!currentUser) {
      showToast('Você precisa estar logado para atualizar o perfil.', 'error');
      return false;
    }
    setIsLoading(true);
    try {
      let publicAvatarUrl = avatarUrl;
      
      // If avatarUrl is a local file (e.g. from an image picker), upload it
      if (avatarUrl && !avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://')) {
        publicAvatarUrl = await uploadImage(avatarUrl, currentUser.id, 999);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          avatar: publicAvatarUrl,
        })
        .eq('id', currentUser.id);

      if (error) throw error;

      setCurrentUser((prev) => prev ? {
        ...prev,
        name: name.trim(),
        avatar: publicAvatarUrl,
      } : null);

      await fetchAds();
      showToast('Perfil atualizado com sucesso!', 'success');
      return true;
    } catch (e: any) {
      showToast(`Erro ao atualizar perfil: ${e.message}`, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Location: Request user GPS
  const requestLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permissão de localização negada.', 'error');
        setIsLoading(false);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setUserLocation(location);
      showToast('Localização atualizada com sucesso!', 'success');
      setIsLoading(false);
      return location;
    } catch {
      showToast('Erro ao obter localização do GPS.', 'error');
      setIsLoading(false);
      return null;
    }
  };

  // Request user location automatically on first load
  useEffect(() => {
    requestLocation();
  }, []);

  // Helper to upload a single image to Supabase Storage
  const uploadImage = async (uri: string, userId: string, index: number): Promise<string> => {
    // If it's already a remote URL, return it
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }

    try {
      let uploadBody: any;
      let contentType = 'image/jpeg';
      let fileExt = 'jpg';

      if (uri.startsWith('data:')) {
        // Parse the base64 data URL
        const parts = uri.split(';base64,');
        const header = parts[0]; // e.g., "data:image/jpeg"
        const base64Data = parts[1];
        
        // Extract content type
        contentType = header.split(':')[1] || 'image/jpeg';
        fileExt = contentType.split('/')[1] || 'jpg';
        if (fileExt === 'jpeg') fileExt = 'jpg';

        // Convert base64 to ArrayBuffer
        uploadBody = base64ToArrayBuffer(base64Data);
      } else {
        // Fallback for file:// or other URIs if base64 wasn't used
        const response = await fetch(uri);
        uploadBody = await response.blob();
        contentType = uploadBody.type || 'image/jpeg';
        if (uri.includes('.')) {
          const parts = uri.split('.');
          fileExt = parts.pop() || 'jpg';
        }
      }

      const pathName = `${userId}/${Date.now()}-${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ad-images')
        .upload(pathName, uploadBody, {
          contentType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('ad-images')
        .getPublicUrl(pathName);

      return data.publicUrl;
    } catch (err: any) {
      console.error('Error uploading image:', err);
      throw new Error(`Falha no upload da imagem: ${err.message}`);
    }
  };

  // Ads: Publish a new listing
  const publishAd = async (
    adData: Omit<Ad, 'id' | 'createdAt' | 'userId' | 'userName' | 'userAvatar' | 'userScore' | 'questions'>
  ): Promise<boolean> => {
    if (!currentUser) {
      showToast('Você precisa estar logado para publicar.', 'error');
      return false;
    }
    setIsLoading(true);
    const lat = userLocation?.coords.latitude ?? DEFAULT_LAT;
    const lng = userLocation?.coords.longitude ?? DEFAULT_LNG;
    try {
      // Upload all images to Supabase Storage
      const uploadedImages: string[] = [];
      if (adData.images && adData.images.length > 0) {
        for (let i = 0; i < adData.images.length; i++) {
          const publicUrl = await uploadImage(adData.images[i], currentUser.id, i);
          uploadedImages.push(publicUrl);
        }
      }

      const { error } = await supabase
        .from('ads')
        .insert({
          title: adData.title,
          description: adData.description,
          category: adData.category,
          images: uploadedImages,
          exchange_accept: adData.exchangeAccept,
          latitude: adData.latitude || lat,
          longitude: adData.longitude || lng,
          user_id: currentUser.id,
        });
      if (error) throw error;
      showToast('Anúncio publicado com sucesso!', 'success');
      await fetchAds(); // Refresh the list
      return true;
    } catch (e: any) {
      showToast(`Erro ao publicar anúncio: ${e.message}`, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Ads: Delete listing
  const deleteAd = async (adId: string) => {
    setIsLoading(true);
    try {
      // Get ad images before deleting
      const adToDelete = ads.find((a) => a.id === adId);
      if (adToDelete && adToDelete.images && adToDelete.images.length > 0) {
        const pathsToDelete = adToDelete.images
          .filter((img) => img.includes('/storage/v1/object/public/ad-images/'))
          .map((img) => {
            // Extract the path from public URL
            const parts = img.split('/ad-images/');
            return parts[1] || '';
          })
          .filter((path) => path !== '');

        if (pathsToDelete.length > 0) {
          try {
            const { error: storageError } = await supabase.storage
              .from('ad-images')
              .remove(pathsToDelete);
            if (storageError) {
              console.error('Failed to delete ad images from storage:', storageError);
            }
          } catch (storageErr) {
            console.error('Error removing files from storage:', storageErr);
          }
        }
      }

      const { error } = await supabase
        .rpc('delete_listing', { listing_id: adId });
      if (error) throw error;
      showToast('Anúncio removido com sucesso.', 'info');
      await fetchAds(); // Refresh the list
    } catch (e: any) {
      showToast(`Erro ao remover anúncio: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Q&A: Public Question Form
  const askQuestion = async (adId: string, content: string) => {
    if (!currentUser) {
      showToast('Acesse sua conta para fazer perguntas.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('questions')
        .insert({
          ad_id: adId,
          user_id: currentUser.id,
          content: content.trim(),
        });

      if (error) throw error;

      showToast('Pergunta enviada publicamente!', 'success');
      await fetchAds(); // Refresh ads and their questions
    } catch (e: any) {
      showToast(`Erro ao enviar pergunta: ${e.message}`, 'error');
    }
  };

  // Q&A: Seller Answer Question Form
  const answerQuestion = async (adId: string, questionId: string, answer: string) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update({ answer: answer.trim() })
        .eq('id', questionId);

      if (error) throw error;

      showToast('Resposta publicada com sucesso!', 'success');
      await fetchAds(); // Refresh ads and their questions
    } catch (e: any) {
      showToast(`Erro ao publicar resposta: ${e.message}`, 'error');
    }
  };


  // Offers: Create a private offer
  const createOffer = async (
    offerData: Omit<
      TradeOffer,
      'id' | 'senderId' | 'senderName' | 'senderAvatar' | 'status' | 'chat' | 'createdAt'
    >
  ): Promise<boolean> => {
    if (!currentUser) {
      showToast('Inicie uma sessão para oferecer uma troca.', 'error');
      return false;
    }

    setIsLoading(true);

    try {
      // Upload custom item images if present and contain local paths
      let uploadedCustomImages: string[] | null = null;
      if (offerData.customItemImages && offerData.customItemImages.length > 0) {
        uploadedCustomImages = [];
        for (let i = 0; i < offerData.customItemImages.length; i++) {
          const img = offerData.customItemImages[i];
          if (img && !img.startsWith('http://') && !img.startsWith('https://')) {
            const publicUrl = await uploadImage(img, currentUser.id, i + 200);
            uploadedCustomImages.push(publicUrl);
          } else {
            uploadedCustomImages.push(img);
          }
        }
      }

      let createdAdId: string | null = null;
      let finalLinkedAdId = offerData.linkedAdId || null;

      // If it's an unlisted custom item, create a real unlisted ad
      if (offerData.customItemTitle) {
        const targetAd = ads.find(a => a.id === offerData.adId);
        const lat = targetAd?.latitude ?? (userLocation?.coords.latitude ?? DEFAULT_LAT);
        const lng = targetAd?.longitude ?? (userLocation?.coords.longitude ?? DEFAULT_LNG);
        const category = targetAd?.category || 'Eletrônicos';

        const { data: insertedAd, error: adError } = await supabase
          .from('ads')
          .insert({
            title: offerData.customItemTitle,
            description: offerData.customItemDescription,
            category: category,
            images: uploadedCustomImages || [],
            exchange_accept: '_unlisted_', // Marker for unlisted/private ad
            latitude: lat,
            longitude: lng,
            user_id: currentUser.id,
          })
          .select()
          .single();

        if (adError) throw adError;
        createdAdId = insertedAd.id;
        finalLinkedAdId = insertedAd.id;
      }

      // 1. Insert the offer row
      const { data: insertedOffer, error: offerError } = await supabase
        .from('offers')
        .insert({
          ad_id: offerData.adId,
          sender_id: currentUser.id,
          receiver_id: offerData.receiverId,
          message: offerData.message,
          linked_ad_id: finalLinkedAdId,
          custom_item_title: null,
          custom_item_description: null,
          custom_item_images: null,
        })
        .select()
        .single();

      if (offerError) {
        // Cleanup created unlisted ad if offer insert fails
        if (createdAdId) {
          await supabase.from('ads').delete().eq('id', createdAdId);
        }
        throw offerError;
      }

      // 2. Automatically insert the initial message into the chat_messages table
      const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          offer_id: insertedOffer.id,
          sender_id: currentUser.id,
          content: offerData.message,
        });

      if (msgError) throw msgError;

      showToast('Sua proposta de troca foi enviada!', 'success');
      await fetchAds(); // Reload ads to include the newly created unlisted ad
      await fetchOffers(); // Reload offers
      return true;
    } catch (e: any) {
      showToast(`Erro ao criar proposta: ${e.message}`, 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Offers: Response from seller (accept/reject)
  const respondToOffer = async (offerId: string, status: 'accepted' | 'rejected') => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw error;

      if (status === 'accepted') {
        showToast('Troca Aceita! Parabéns pelo negócio.', 'success');
      } else {
        showToast('Proposta de troca recusada.', 'info');
      }
      await fetchOffers();
      await fetchAds();
    } catch (e: any) {
      showToast(`Erro ao responder à proposta: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Offers: Send private chat message
  const sendChatMessage = async (offerId: string, content: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          offer_id: offerId,
          sender_id: currentUser.id,
          content: content.trim(),
        });

      if (error) throw error;
      
      await fetchOffers(); // Refresh offers list with the new message
    } catch (e: any) {
      console.error('Erro ao enviar mensagem de chat:', e);
    }
  };



  return (
    <StoreContext.Provider
      value={{
        currentUser: currentUserWithScore,
        ads: adsWithDistance,
        offers,
        toast,
        userLocation,
        userLocationCity,
        isLoading,
        themeMode,
        setThemeMode,
        login,
        register,
        logout,
        updateProfile,
        requestLocation,
        publishAd,
        deleteAd,
        askQuestion,
        answerQuestion,
        createOffer,
        respondToOffer,
        sendChatMessage,
        showToast,
        hideToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );





};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
