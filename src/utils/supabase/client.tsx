import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a singleton Supabase client instance to avoid multiple instances
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);
