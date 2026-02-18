import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Public client — respects RLS, safe for server-side reads
export const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);

// Admin client — bypasses RLS, use only in API routes / cron jobs / scripts
// Never import this in client components or expose it to the browser
// Falls back to anon key if service role key is not configured (build-time safe)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
