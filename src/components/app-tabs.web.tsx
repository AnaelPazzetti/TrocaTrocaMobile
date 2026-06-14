import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Pressable, View, StyleSheet, Platform } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/context/store-context';
import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href={"/" as any} asChild>
            <TabButton>Início</TabButton>
          </TabTrigger>
          <TabTrigger name="publish" href={"/publish" as any} asChild>
            <TabButton>Anunciar</TabButton>
          </TabTrigger>
          <TabTrigger name="trades" href={"/trades" as any} asChild>
            <TabButton>Trocas</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href={"/profile" as any} asChild>
            <TabButton>Perfil</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <View style={styles.contentWrapper}>
        <TabSlot style={{ height: '100%' }} />
      </View>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={[
          styles.tabButtonView,
          isFocused ? { borderColor: theme.primary, borderWidth: 1 } : null,
        ]}>
        <ThemedText
          type="smallBold"
          themeColor={isFocused ? 'primary' : 'textSecondary'}
          style={{ fontSize: 13 }}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useStore();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          🤝 TrocaTroca
        </ThemedText>

        <View style={styles.triggersWrapper}>
          {props.children}
        </View>

        <View style={[styles.themeSwitchContainer, { backgroundColor: theme.backgroundSelected }]}>
          <Pressable
            onPress={() => setThemeMode('light')}
            style={[
              styles.themeOptionBtn,
              themeMode === 'light' && { backgroundColor: theme.backgroundElement }
            ]}
          >
            <SymbolView
              tintColor={themeMode === 'light' ? theme.primary : theme.textSecondary}
              name="sun.max.fill"
              size={13}
            />
            <ThemedText
              type="smallBold"
              style={[
                styles.themeOptionText,
                { color: themeMode === 'light' ? theme.primary : theme.textSecondary }
              ]}
            >
              Claro
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setThemeMode('dark')}
            style={[
              styles.themeOptionBtn,
              themeMode === 'dark' && { backgroundColor: theme.backgroundElement }
            ]}
          >
            <SymbolView
              tintColor={themeMode === 'dark' ? theme.primary : theme.textSecondary}
              name="moon.fill"
              size={13}
            />
            <ThemedText
              type="smallBold"
              style={[
                styles.themeOptionText,
                { color: themeMode === 'dark' ? theme.primary : theme.textSecondary }
              ]}
            >
              Escuro
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 100,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 85,
  },
  innerContainer: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 'auto',
  },
  triggersWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { transition: 'all 0.2s ease' } as any,
    }),
  },
  themeSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 9999,
    marginLeft: Spacing.three,
  },
  themeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    gap: 6,
    ...Platform.select({
      web: { transition: 'all 0.2s ease' } as any,
    }),
  },
  themeOptionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
