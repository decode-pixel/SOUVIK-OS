import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xqcxygwodbttrdtonpzv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yWeyMxEqKfVXfRWn7gm8_w__lWULU0X';

export const supabase = createClient(supabaseUrl, supabaseKey);
