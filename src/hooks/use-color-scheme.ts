import { useColorScheme as useRNColorScheme } from 'react-native';
import { useContext } from 'react';
import { StoreContext } from '@/context/store-context';

export function useColorScheme() {
  const store = useContext(StoreContext);
  const systemScheme = useRNColorScheme();

  if (store && store.themeMode && store.themeMode !== 'system') {
    return store.themeMode;
  }
  return systemScheme;
}
