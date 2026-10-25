import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/stores/auth'
import Navbar from '@/components/layout/Navbar'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import LiveTranslation from '@/pages/LiveTranslation'
import GestureManagerPage from '@/pages/GestureManager'
import VideoGalleryPage from '@/pages/VideoGallery'
import CoursesPage from '@/pages/Courses'
import HistoryPage from '@/pages/History'
import SupportPage from '@/pages/Support'
import AdminPage from '@/pages/Admin'
import SettingsPage from '@/pages/Settings'

// ── Auth strategy ─────────────────────────────────────────────────────────
// Primary: Zustand store persists to localStorage → survives page reloads
//          with zero network calls (always works, even offline).
// Secondary: Supabase onAuthStateChange → fires when Supabase is reachable
//            and upgrades the local session with the real Supabase user object.
// This means: the app ALWAYS works locally, and ALSO syncs to Supabase when
// the project is up (new project created, or resumed after inactivity).

function App() {
  const { login, logout } = useAuth()

  useEffect(() => {
    // ── Try to hydrate from Supabase session (silent if backend is down) ──
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const u = session.user
          const role = u.email?.toLowerCase().includes('admin') ? 'admin' : 'user'
          login({
            id: u.id,
            email: u.email || '',
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
            provider: (u.app_metadata?.provider as 'google' | 'email' | 'facebook' | 'twitter') || 'email',
            role,
          })
        }
      })
      .catch(() => {
        // Supabase project is paused / offline – Zustand localStorage takes over
      })

    // ── Listen for auth changes (sign-in via Google OAuth redirect, sign-out) ──
    let subscription: { unsubscribe: () => void } | null = null
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          const u = session.user
          const role = u.email?.toLowerCase().includes('admin') ? 'admin' : 'user'
          login({
            id: u.id,
            email: u.email || '',
            name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
            avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
            provider: (u.app_metadata?.provider as 'google' | 'email' | 'facebook' | 'twitter') || 'email',
            role,
          })
        } else if (event === 'SIGNED_OUT') {
          logout()
        }
      })
      subscription = data.subscription
    } catch {
      // Supabase not reachable – local auth already active
    }

    return () => {
      subscription?.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />

          {/* Dashboard (sidebar layout) */}
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<LiveTranslation />} />
            <Route path="gestures" element={<GestureManagerPage />} />
            <Route path="videos" element={<VideoGalleryPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Legacy redirect */}
          <Route path="/live" element={<LiveTranslation />} />
        </Routes>
      </main>
      <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-medium' }} />
    </div>
  )
}

export default App
