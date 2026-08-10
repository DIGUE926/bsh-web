import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types de base (à étendre selon le schéma)
export type League = {
  id: string
  name: string
  slug: string
  created_at?: string
}

export type Team = {
  id: string
  name: string
  league_id: string
  logo_url?: string | null
  created_at?: string
}

export type Player = {
  id: string
  name: string
  team_id: string
  position?: string | null
  jersey_number?: number | null
  created_at?: string
}
