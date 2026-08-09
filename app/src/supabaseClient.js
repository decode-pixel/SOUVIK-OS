import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xqcxygwodbttrdtonpzv.supabase.co';
const supabaseKey = 'sb_publishable_yWeyMxEqKfVXfRWn7gm8_w__lWULU0X';

export const supabase = createClient(supabaseUrl, supabaseKey);
