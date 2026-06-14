import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Get our environment variables from Expo.
// In Expo, EXPO_PUBLIC_ prefix makes them available in client-side code automatically.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing! Make sure to add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.'
  );
}

// ========================================================
// PERSISTENT STORAGE ADAPTER
// ========================================================
// In React Native/Expo, we don't have localStorage.
// However, the `@react-native-async-storage/async-storage` library crashes during
// Server-Side Rendering (SSR) in Node.js on Web because it tries to access `window.localStorage`.
// To solve this, we conditionally require AsyncStorage ONLY when 'window' exists (in the browser/device client).
// On the server side (Node.js), we fall back to a simple in-memory session object.

let customStorage = null;

if (typeof window !== 'undefined') {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    customStorage = {
      getItem: async (key: string) => {
        try {
          return await AsyncStorage.getItem(key);
        } catch (e) {
          console.error('Failed to get Supabase session from AsyncStorage:', e);
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await AsyncStorage.setItem(key, value);
        } catch (e) {
          console.error('Failed to save Supabase session to AsyncStorage:', e);
        }
      },
      removeItem: async (key: string) => {
        try {
          await AsyncStorage.removeItem(key);
        } catch (e) {
          console.error('Failed to delete Supabase session from AsyncStorage:', e);
        }
      },
    };
  } catch (e) {
    console.error('Failed to load AsyncStorage on client:', e);
  }
}

// In-memory fallback storage for server-side rendering (SSR) in Node.js
const memoryStorage: Record<string, string> = {};
const fallbackStorage = {
  getItem: (key: string) => memoryStorage[key] || null,
  setItem: (key: string, value: string) => { memoryStorage[key] = value; },
  removeItem: (key: string) => { delete memoryStorage[key]; },
};

// ========================================================
// CLIENT INITIALIZATION
// ========================================================
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    storage: customStorage || fallbackStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevents issues in mobile environment deep-linking
  },
});
