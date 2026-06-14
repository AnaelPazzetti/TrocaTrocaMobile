import React, { useEffect, useState } from 'react';
import { StyleSheet, Animated, Pressable, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useStore } from '@/context/store-context';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export function ToastNotification() {
  const { toast, hideToast } = useStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  // Track rendering state during fade-out
  const [shouldRender, setShouldRender] = useState(false);
  const [prevVisible, setPrevVisible] = useState(false);

  // Animation values
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));

  // Adjust rendering flag directly in render
  if (toast.visible && !prevVisible) {
    setShouldRender(true);
    setPrevVisible(true);
  }
  if (!toast.visible && prevVisible) {
    setPrevVisible(false);
  }

  useEffect(() => {
    if (toast.visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: insets.top > 0 ? insets.top + Spacing.two : Spacing.three,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [toast.visible, insets.top, translateY, opacity]);

  if (!shouldRender) {
    return null;
  }

  // Get background colors and icons depending on notification type
  let accentColor = '#3c87f7'; // Info blue
  let symbolIcon = 'info.circle';
  let badgeLabel = 'INFO';
  
  if (toast.type === 'success') {
    accentColor = '#10B981'; // Green
    symbolIcon = 'checkmark.circle';
    badgeLabel = 'SUCESSO';
  } else if (toast.type === 'error') {
    accentColor = '#EF4444'; // Red
    symbolIcon = 'exclamationmark.triangle';
    badgeLabel = 'ERRO';
  }

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: theme.backgroundElement,
          borderColor: accentColor,
        },
      ]}
    >
      <Pressable onPress={hideToast} style={styles.pressArea}>
        <View style={[styles.indicator, { backgroundColor: accentColor }]} />
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <ThemedText style={[styles.badge, { color: accentColor }]} type="smallBold">
              {badgeLabel}
            </ThemedText>
            {Platform.OS === 'ios' && (
              <SymbolView
                tintColor={accentColor}
                name={symbolIcon as any}
                size={16}
              />
            )}
          </View>
          <ThemedText style={styles.messageText} type="small">
            {toast.message}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 99999,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    maxWidth: 500,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  pressArea: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 65,
  },
  indicator: {
    width: 6,
  },
  contentContainer: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  badge: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  messageText: {
    fontWeight: '600',
    lineHeight: 18,
  },
});
