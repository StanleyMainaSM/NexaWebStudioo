import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  'https://placeholder.supabase.co';

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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