import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export const isSupabaseConfigured: boolean =
  Boolean(rawUrl) &&
  Boolean(rawAnonKey) &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('seu-projeto.supabase.co') &&
  rawAnonKey !== 'sua-anon-key-publica';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const RECEIPTS_BUCKET = 'receipts';
