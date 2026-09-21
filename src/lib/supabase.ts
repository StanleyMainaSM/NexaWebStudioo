import { createClient } from '@supabase/supabase-js';

const PRODUCTION_SUPABASE_URL = 'https://uhbyruktnhktjeuqsqut.supabase.co';
const PRODUCTION_ANON_KEY = 'sb_publishable_HtIrApOSgOzN-Y2QBUR0Gw_t4i0510w';
const REVOKED_ANON_KEYS = new Set([
  'sb_publishable_Qh8k6f0pMdQfwNb4_nhWIA_rn1XVwkg',
]);

let rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || PRODUCTION_SUPABASE_URL;
if (rawSupabaseUrl) {
  rawSupabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
}
export const supabaseUrl = rawSupabaseUrl || PRODUCTION_SUPABASE_URL;

let rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
if (!rawAnonKey || REVOKED_ANON_KEYS.has(rawAnonKey.trim())) {
  rawAnonKey = PRODUCTION_ANON_KEY;
}
export const supabaseAnonKey = rawAnonKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return new Proxy({}, {
            get: (_, p) => {
              if (p === 'onAuthStateChange') {
                return () => ({ data: { subscription: { unsubscribe: () => {} } } });
              }
              if (p === 'getSession') {
                return () => Promise.resolve({ data: { session: null }, error: null });
              }
              if (p === 'getUser') {
                return () => Promise.resolve({ data: { user: null }, error: null });
              }
              return () => Promise.resolve({ data: null, error: { message: "Supabase is not configured. Please connect a database in the environment variables." }});
            }
          });
        }
        if (prop === 'from' || prop === 'rpc') {
          const chain: any = () => new Proxy({}, {
            get: (_, p) => {
              if (p === 'then') return undefined;
              if (['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'single', 'maybeSingle', 'order', 'limit', 'match', 'or'].includes(p as string)) {
                return chain;
              }
              return () => Promise.resolve({ data: null, error: { message: "Supabase is not configured. Please connect a database in the environment variables." }});
            }
          });
          return chain;
        }
        if (prop === 'channel') {
           return () => ({
             on: () => ({ subscribe: () => {} }),
             subscribe: () => {},
             unsubscribe: () => {}
           });
        }
        if (prop === 'removeChannel') {
          return () => {};
        }
        return undefined;
      }
    }) as any);

export interface Review {
  id: string;
  project_id: string | null;
  client_id: string | null;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  reviewer_name: string | null;
}

export interface Testimonial {
  id: string;
  name: string;
  stars: number;
  comment: string;
  is_public: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}