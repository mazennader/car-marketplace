const SUPABASE_URL = "https://hkokxhfqvvnmcosauuos.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gNlP6Oxukb22eOyO-rGGHA_F01Cd4tH";

window.db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);