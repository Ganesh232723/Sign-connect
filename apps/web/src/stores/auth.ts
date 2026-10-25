import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  provider: 'google' | 'facebook' | 'twitter' | 'email' | 'guest'
  role: 'user' | 'admin'
  joinedAt: string
}

interface AuthState {
  user: UserProfile | null
  isAuthenticated: boolean
  login: (user: Partial<UserProfile> & { email: string }) => void
  loginWithProvider: (provider: 'google' | 'facebook' | 'twitter' | 'guest', customInfo?: { name?: string; email?: string }) => UserProfile
  logout: () => void
  updateProfile: (data: Partial<UserProfile>) => void
}

const PROVIDER_DEFAULTS = {
  google: {
    name: 'Google User',
    email: 'user@gmail.com',
  },
  facebook: {
    name: 'Facebook User',
    email: 'user@facebook.com',
  },
  twitter: {
    name: 'X / Twitter User',
    email: 'user@x.com',
  },
  guest: {
    name: 'Guest Explorer',
    email: 'guest@signconnect.ai',
  }
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (userData) => {
        const profile: UserProfile = {
          id: userData.id || `usr_${Date.now()}`,
          name: userData.name || userData.email.split('@')[0],
          email: userData.email,
          avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.email)}`,
          provider: userData.provider || 'email',
          role: userData.role || 'user',
          joinedAt: userData.joinedAt || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        }
        set({ user: profile, isAuthenticated: true })
      },

      loginWithProvider: (provider, customInfo) => {
        const defaults = PROVIDER_DEFAULTS[provider]
        const name = customInfo?.name || defaults.name
        const email = customInfo?.email || defaults.email
        const profile: UserProfile = {
          id: `usr_${provider}_${Date.now()}`,
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
          provider: provider,
          role: 'user',
          joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        }
        set({ user: profile, isAuthenticated: true })
        return profile
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      updateProfile: (data) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      name: 'signconnect-auth-user',
    }
  )
)
