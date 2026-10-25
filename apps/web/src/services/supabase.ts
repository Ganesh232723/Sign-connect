/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const env = (import.meta as unknown as { env: Record<string, string> }).env || {}
const supabaseUrl     = env.VITE_SUPABASE_URL     || 'https://qnbvgjwookuuwsjatzhr.supabase.co'
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || ''

// ── Supabase availability check ────────────────────────────────────────────
// Supabase free-tier projects pause after 7 days of inactivity and the DNS
// stops resolving entirely.  All database and auth helpers below are wrapped
// in try/catch so the UI keeps working in "offline / local-only" mode
// whenever the backend is unreachable.

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      // Allow token refresh now that we have a live backend
      autoRefreshToken: true,
      // CRITICAL for Google OAuth: must be true to read the token from the redirect URL
      detectSessionInUrl: true,
      // Persist session in localStorage so it survives page reloads
      persistSession: true,
    },
    global: {
      // Short timeout so we fail fast when the project is paused
      fetch: (url, options) =>
        Promise.race([
          fetch(url, options),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Supabase timeout – backend unreachable')), 5000)
          ),
        ]) as Promise<Response>,
    },
  }
)

// Whether Supabase anon key is configured at all
const DB_ENABLED = Boolean(supabaseAnonKey)

// ── Silent no-op helpers when Supabase is down ────────────────────────────
// Each exported function returns a safe empty/null value on any network error
// so callers don't need to know whether the backend is available.

export interface TranslationSession {
  id?: string
  user_id?: string | null
  started_at?: string
  ended_at?: string | null
  language_output: string
  duration_seconds?: number | null
}

export interface TranscriptEntry {
  id?: string
  session_id: string
  text: string
  confidence: number
  spoken_at: string
  language: string
}

export async function createSession(language: string): Promise<string | null> {
  if (!DB_ENABLED) return null
  try {
    const { data, error } = await supabase
      .from('translation_sessions')
      .insert({ language_output: language, started_at: new Date().toISOString() })
      .select('id')
      .single()
    if (error) return null
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function endSession(sessionId: string, durationSeconds: number) {
  if (!DB_ENABLED || !sessionId) return
  try {
    await supabase
      .from('translation_sessions')
      .update({ ended_at: new Date().toISOString(), duration_seconds: durationSeconds })
      .eq('id', sessionId)
  } catch {
    // silent – backend offline
  }
}

export async function saveTranscript(entry: TranscriptEntry) {
  if (!DB_ENABLED || !entry.session_id) return
  try {
    await supabase.from('transcripts').insert(entry)
  } catch {
    // silent – backend offline
  }
}

export async function fetchHistory() {
  if (!DB_ENABLED) return []
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*, translation_sessions(language_output)')
      .order('spoken_at', { ascending: false })
      .limit(100)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

// ── Course Progress ────────────────────────────────────────────────────────
export async function fetchCourseProgress(userId: string) {
  if (!DB_ENABLED || !userId) return []
  try {
    const { data, error } = await supabase
      .from('course_progress')
      .select('course_id, lesson_id')
      .eq('user_id', userId)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export async function saveCourseProgress(userId: string, courseId: string, lessonId: string) {
  if (!DB_ENABLED || !userId) return
  try {
    const { error } = await supabase
      .from('course_progress')
      .insert({ user_id: userId, course_id: courseId, lesson_id: lessonId })
    if (error && error.code !== '23505') {
      // 23505 = unique constraint (already completed) – ignore silently
    }
  } catch {
    // silent – backend offline
  }
}

// ── Video Reviews ──────────────────────────────────────────────────────────
export async function fetchVideoReviews(videoId: string) {
  if (!DB_ENABLED || !videoId) return []
  try {
    const { data, error } = await supabase
      .from('video_reviews')
      .select('user_name, rating, comment, created_at')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

export async function saveVideoReview(videoId: string, userName: string, rating: number, comment: string) {
  if (!DB_ENABLED || !videoId) return
  try {
    await supabase
      .from('video_reviews')
      .insert({ video_id: videoId, user_name: userName, rating, comment })
  } catch {
    // silent – backend offline
  }
}

// ── Admin Dashboard Metrics ────────────────────────────────────────────────
export async function fetchAdminMetrics() {
  if (!DB_ENABLED) return null
  try {
    const { count: sessionCount } = await supabase
      .from('translation_sessions')
      .select('*', { count: 'exact', head: true })
    const { count: transcriptCount } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact', head: true })
    return {
      totalSessions: sessionCount || 0,
      totalTranscripts: transcriptCount || 0,
    }
  } catch {
    return null
  }
}

export async function fetchAdminSessions() {
  if (!DB_ENABLED) return []
  try {
    const { data, error } = await supabase
      .from('translation_sessions')
      .select('id, user_id, language_output, started_at, ended_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}
