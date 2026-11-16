import { createClient } from
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hzqmfoewpdtwmrytqkpz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3xj4vgjhQJSM3V4XQYiyKg_1khR6FKj';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
console.log("ReelRated Supabase connection loaded!");