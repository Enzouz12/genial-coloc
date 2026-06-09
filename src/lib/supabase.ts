import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase, initialisé seulement si les variables d'environnement
 * sont présentes. Sinon `supabase` vaut null et l'app retombe sur le
 * stockage localStorage (voir storage.ts).
 *
 * La clé anon est publique par conception : elle est destinée au navigateur
 * et protégée côté base par les règles RLS.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

export const supabase = hasSupabaseConfig
  ? createClient(url as string, anonKey as string)
  : null;
