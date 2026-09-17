import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const VPS_SUPABASE_URL = 'http://2.25.229.18:8000';
const VPS_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg5NjAwNDYxLCJleHAiOjIxMDQ5NjA0NjF9.OFcLnCPS3h5j_AySCPElhGxG0L7EbTO_I0fyJFUeJOI';

let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || VPS_SUPABASE_URL;
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || VPS_ANON_KEY;

if (supabaseUrl.includes('ipbzdgkbrozrjeohonbo')) {
  supabaseUrl = VPS_SUPABASE_URL;
  supabaseAnonKey = VPS_ANON_KEY;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
