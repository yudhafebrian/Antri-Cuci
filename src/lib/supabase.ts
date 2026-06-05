import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QueueRow {
  id: string;
  type: 'regular' | 'premium';
  plat: string;
  wa: string;
  nama: string;
  merk: string;
  paket: string;
  size: string;
  harga: number;
  notes: string;
  stage: string;
  times: Record<string, string>;
  queue_number: number | null;
  created_at: string;
}

export interface HistoryRow {
  id: string;
  plat: string;
  wa: string;
  nama: string;
  merk: string;
  created_at: string;
}
