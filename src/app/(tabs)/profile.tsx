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
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const {
    currentUser,
    ads,
    login,
    register,
    logout,
    deleteAd,
    showToast,
    isLoading,
    updateProfile,
  } = useStore();

  // Auth Forms State
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  // Synced profile data
  const [prevUser, setPrevUser] = useState<any>(null);
  if (currentUser && prevUser !== currentUser) {
    setEditName(currentUser.name);
    setEditAvatar(currentUser.avatar);
    setPrevUser(currentUser);
  }
  if (!currentUser && prevUser !== null) {
    setPrevUser(null);
  }

  // Picker to switch profile photo
  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled) {
        const base64Data = result.assets[0].base64;
        const uri = base64Data
          ? `data:image/jpeg;base64,${base64Data}`
          : result.assets[0].uri;

        setEditAvatar(uri);
        showToast('Foto selecionada com sucesso!', 'success');
      }
    } catch (error) {
      showToast('Erro ao acessar a galeria de imagens.', 'error');
    }
  };

  // Submit profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast('Por favor, insira o seu nome.', 'error');
      return;
    }
    
    setIsSaving(true);
    const success = await updateProfile(editName.trim(), editAvatar);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  // Handle Authentication Submit
  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast('Preencha seu e-mail e senha.', 'error');
      return;
    }

    if (!isLoginTab && !name.trim()) {
      showToast('Por favor, informe seu nome para o cadastro.', 'error');
      return;
    }

    let success = false;
    if (isLoginTab) {
      success = await login(email.trim(), password.trim());
    } else {
      success = await register(name.trim(), email.trim(), password.trim());
    }

    if (success) {
      // Clear forms
      setEmail('');
      setName('');
      setPassword('');
    }
  };



  // Filter ads owned by the user (exclude unlisted items)
  const myAds = ads.filter((ad) => ad.userId === currentUser?.id && ad.exchangeAccept !== '_unlisted_');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* ==========================================
            GUEST / AUTH VIEW
            ========================================== */}
        {!currentUser ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollAuth}>
            <View style={styles.authHeader}>
              <SymbolView name="arrow.triangle.2.circlepath" tintColor="#3c87f7" size={54} />
              <ThemedText type="subtitle" style={styles.authTitle}>
                TrocaTroca
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Conecte-se para negociar e trocar seus produtos com facilidade
              </ThemedText>
            </View>

            {/* Switch Tab login/register */}
            <ThemedView style={styles.authTabContainer} type="backgroundElement">
              <Pressable
                onPress={() => setIsLoginTab(true)}
                style={[
                  styles.authTabBtn,
                  isLoginTab ? { backgroundColor: theme.background } : null,
                ]}
              >
                <ThemedText type="smallBold" themeColor={isLoginTab ? 'text' : 'textSecondary'}>
                  Entrar
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setIsLoginTab(false)}
                style={[
                  styles.authTabBtn,
                  !isLoginTab ? { backgroundColor: theme.background } : null,
                ]}
              >
                <ThemedText type="smallBold" themeColor={!isLoginTab ? 'text' : 'textSecondary'}>
                  Cadastrar
                </ThemedText>
              </Pressable>
            </ThemedView>

            {/* Input Forms */}
            <View style={styles.authForm}>
              {!isLoginTab && (
                <View style={styles.inputBlock}>
                  <ThemedText type="smallBold" style={styles.inputLabel}>Nome Completo</ThemedText>
                  <TextInput
                    placeholder="Ex: João da Silva"
                    placeholderTextColor={theme.textSecondary}
                    value={name}
                    onChangeText={setName}
                    style={[styles.inputField, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  />
                </View>
              )}

              <View style={styles.inputBlock}>
                <ThemedText type="smallBold" style={styles.inputLabel}>E-mail de Acesso</ThemedText>
                <TextInput
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.inputField, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>

              <View style={styles.inputBlock}>
                <ThemedText type="smallBold" style={styles.inputLabel}>Senha Secreta</ThemedText>
                <TextInput
                  placeholder="Digite sua senha"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={true}
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.inputField, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </View>

              <Pressable
                onPress={handleAuthSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.authSubmitBtn,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 14 }}>
                    {isLoginTab ? 'Acessar Conta' : 'Criar Conta Nova'}
                  </ThemedText>
                )}
              </Pressable>
            </View>


          </ScrollView>
        ) : (
          /* ==========================================
             LOGGED-IN VIEW
             ========================================== */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollProfile,
              { paddingBottom: BottomTabInset + Spacing.six },
            ]}
          >
            {/* Profile Info Header */}
            <ThemedView style={styles.profileHeader} type="backgroundElement">
              {isEditing ? (
                <View style={styles.editProfileForm}>
                  <ThemedText type="smallBold" style={styles.editLabel}>Foto do Perfil</ThemedText>
                  
                  <View style={styles.editAvatarWrapper}>
                    <Image source={{ uri: editAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' }} style={styles.profileAvatarBig} />
                    <Pressable onPress={handlePickAvatar} style={styles.changePhotoBtn}>
                      <SymbolView name="camera.fill" tintColor="#ffffff" size={12} />
                      <ThemedText style={styles.changePhotoText}>Alterar Foto</ThemedText>
                    </Pressable>
                  </View>

                  <View style={styles.inputBlock}>
                    <ThemedText type="smallBold" style={styles.inputLabel}>Nome de Exibição</ThemedText>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Seu nome completo"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.inputField, { color: theme.text, backgroundColor: theme.background }]}
                    />
                  </View>

                  <View style={styles.editActionsRow}>
                    <Pressable
                      onPress={handleSaveProfile}
                      disabled={isSaving}
                      style={[styles.saveChangesBtn, { backgroundColor: theme.primary }]}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <ThemedText type="smallBold" style={{ color: '#ffffff', fontSize: 13 }}>
                          Salvar
                        </ThemedText>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setEditName(currentUser.name);
                        setEditAvatar(currentUser.avatar);
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                      style={[styles.cancelBtn, { borderColor: theme.textSecondary }]}
                    >
                      <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 13 }}>
                        Cancelar
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.headerTop}>
                    <Image source={{ uri: currentUser.avatar }} style={styles.profileAvatar} />
                    <View style={styles.headerMeta}>
                      <ThemedText type="default" style={{ fontWeight: '800', fontSize: 20 }}>
                        {currentUser.name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {currentUser.email}
                      </ThemedText>
                      <ThemedText style={styles.regDateText}>
                        Membro desde: {new Date(currentUser.createdAt).toLocaleDateString('pt-BR')}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.headerButtonsRow}>
                    <Pressable
                      onPress={() => setIsEditing(true)}
                      style={[
                        styles.editProfileBtn,
                        { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <SymbolView name="pencil" tintColor={theme.primary} size={13} />
                      <ThemedText type="smallBold" style={{ color: theme.primary, fontSize: 12 }}>
                        Editar Perfil
                      </ThemedText>
                    </Pressable>
                    
                    <Pressable
                      onPress={logout}
                      style={[
                        styles.logoutBtn,
                        { backgroundColor: theme.background },
                      ]}
                    >
                      <SymbolView name="power" tintColor="#EF4444" size={13} />
                      <ThemedText type="smallBold" style={{ color: '#EF4444', fontSize: 12 }}>
                        Sair da Conta
                      </ThemedText>
                    </Pressable>
                  </View>
                </>
              )}
            </ThemedView>

            {/* Dynamic Score Dashboard */}
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Meu Nível de Confiança (Score)
            </ThemedText>
            
            <View style={styles.scoreDashboard}>
              {/* Total Score Display */}
              <ThemedView style={styles.scoreCard} type="backgroundElement">
                <ThemedText type="subtitle" style={styles.scoreTotalText}>
                  ★ {currentUser.score}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="textSecondary" style={{ fontSize: 11 }}>
                  Pontos Conquistados
                </ThemedText>
              </ThemedView>

              {/* Breakdown breakdown grid */}
              <View style={styles.breakdownGrid}>
                <ThemedView style={styles.breakdownCard} type="backgroundElement">
                  <ThemedText type="default" style={styles.breakdownNumber}>
                    {currentUser.tradesCount}
                  </ThemedText>
                  <ThemedText style={styles.breakdownLabel}>Trocas Feitas</ThemedText>
                  <ThemedText style={styles.breakdownPoints}>+10 pts cada</ThemedText>
                </ThemedView>
                
                <ThemedView style={styles.breakdownCard} type="backgroundElement">
                  <ThemedText type="default" style={styles.breakdownNumber}>
                    {currentUser.messagesCount}
                  </ThemedText>
                  <ThemedText style={styles.breakdownLabel}>Mensagens</ThemedText>
                  <ThemedText style={styles.breakdownPoints}>+1 pt cada</ThemedText>
                </ThemedView>
              </View>
            </View>



            {/* ==========================================
                USER'S ACTIVE ADS LIST
                ========================================== */}
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              Meus Anúncios Publicados ({myAds.length})
            </ThemedText>

            {myAds.length === 0 ? (
              <View style={styles.emptyAdsBox}>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center', marginBottom: Spacing.two }}>
                  Você ainda não publicou nenhum item para troca.
                </ThemedText>
                <Pressable
                  onPress={() => router.push('/publish' as any)}
                  style={styles.publishRedirectBtn}
                >
                  <ThemedText type="smallBold" style={{ color: '#ffffff' }}>Criar Primeiro Anúncio</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.myAdsGrid}>
                {myAds.map((myAd) => (
                  <ThemedView key={myAd.id} style={styles.myAdCard} type="backgroundElement">
                    <Pressable
                      onPress={() => router.push(`/ad/${myAd.id}`)}
                      style={({ pressed }) => [
                        { flexDirection: 'row', flex: 1, alignItems: 'center', opacity: pressed ? 0.9 : 1 }
                      ]}
                    >
                      <Image source={{ uri: myAd.images[0] }} style={styles.myAdImg} />
                      <View style={{ flex: 1, padding: Spacing.two }}>
                        <ThemedText type="smallBold" numberOfLines={1} style={{ color: '#3c87f7', textDecorationLine: 'underline' }}>
                          {myAd.title}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 }}>
                          <ThemedText style={styles.myAdCatText}>{myAd.category}</ThemedText>
                          {myAd.isTraded && (
                            <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <ThemedText style={{ color: '#10B981', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                                Troca Realizada
                              </ThemedText>
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                    
                    {/* Delete item button wrapper */}
                    <View style={{ justifyContent: 'center', paddingRight: Spacing.two }}>
                      <Pressable
                        onPress={() => deleteAd(myAd.id)}
                        style={({ pressed }) => [
                          styles.deleteAdBtn,
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                      >
                        <SymbolView name="trash.fill" tintColor="#EF4444" size={14} />
                        <ThemedText type="smallBold" style={{ color: '#EF4444', fontSize: 12 }}>
                          Excluir
                        </ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                ))}
              </View>
            )}
          </ScrollView>
        )}
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
  scrollAuth: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.four,
  },
  authHeader: {
    alignItems: 'center',
    width: '100%',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  authTabContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    borderRadius: Spacing.three,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authForm: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.three,
  },
  inputBlock: {
    gap: Spacing.one,
  },
  inputLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#3c87f7',
  },
  inputField: {
    height: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({
      web: { outlineStyle: 'none' as any },
    }),
  },
  authSubmitBtn: {
    backgroundColor: '#3c87f7',
    height: 48,
    borderRadius: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
    shadowColor: '#3c87f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },


  // Logged-in profile styles
  scrollProfile: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  profileHeader: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  headerMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  regDateText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '600',
  },
  logoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 8,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3c87f7',
    textTransform: 'uppercase',
    marginBottom: Spacing.three,
    letterSpacing: 0.5,
  },
  scoreDashboard: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  scoreCard: {
    flex: 1.2,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTotalText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f59e0b',
    marginBottom: 4,
  },
  breakdownGrid: {
    flex: 1.8,
    gap: Spacing.two,
  },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.two,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
  },
  breakdownNumber: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: Spacing.two,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  breakdownPoints: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },

  emptyAdsBox: {
    padding: Spacing.five,
    alignItems: 'center',
  },
  publishRedirectBtn: {
    backgroundColor: '#3c87f7',
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  myAdsGrid: {
    gap: Spacing.three,
  },
  myAdCard: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  myAdImg: {
    width: 90,
    height: 70,
  },
  myAdInfo: {
    flex: 1,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myAdCatText: {
    fontSize: 10,
    color: '#3c87f7',
    fontWeight: '700',
    marginTop: 2,
  },
  deleteAdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  editProfileForm: {
    width: '100%',
    gap: Spacing.three,
  },
  editLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: '#3c87f7',
    fontWeight: '700',
  },
  editAvatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  profileAvatarBig: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3c87f7',
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
  changePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  saveChangesBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1.5,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
    width: '100%',
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: 8,
    borderRadius: Spacing.two,
  },
});
