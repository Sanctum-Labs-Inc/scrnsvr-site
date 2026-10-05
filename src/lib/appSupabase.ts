import { createClient } from '@supabase/supabase-js';

// The ScrnSvr app's Supabase project, which holds app accounts. (lib/supabase.ts
// is the waitlist's project.) The anon key is public by design: what it can
// do is limited by the project's row-level security.
const url = 'https://obpnkyunkleugwrlwjqh.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icG5reXVua2xldWd3cmx3anFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzU5NzAsImV4cCI6MjA3NDM1MTk3MH0.icMnKQrljtNYTQDEjR0OKivmf_miWi-VGbiKg0OybKM';

// Used by /reset-password, which reads the recovery session from the link's
// URL fragment. Kept in memory only, so nothing lingers in this browser.
export const appSupabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
});
