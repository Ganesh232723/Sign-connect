import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Shield,
  Smartphone, CheckCircle2, Loader2, ChevronLeft, Plus, X
} from 'lucide-react'

type AuthStep = 'choice' | 'email-form' | 'otp' | 'google-picker'
type AuthMode = 'login' | 'signup'

// ── Pre-seeded demo Google accounts (shown in the picker) ──────────────────
const DEMO_ACCOUNTS = [
  {
    id: 'g_1',
    name: 'Ganesh Kumar',
    email: 'ganesh.kumar@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ganesh',
  },
  {
    id: 'g_2',
    name: 'Demo User',
    email: 'demo.signconnect@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  },
]

// ── Google Account Picker Modal ────────────────────────────────────────────
function GoogleAccountPicker({
  onSelect,
  onAddAccount,
  onClose,
  loading,
}: {
  onSelect: (acc: typeof DEMO_ACCOUNTS[0]) => void
  onAddAccount: (name: string, email: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Card – mimics Google's account chooser */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] overflow-hidden"
        style={{ fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="relative flex flex-col items-center pt-8 pb-4 px-6 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Google logo */}
          <svg viewBox="0 0 74 24" className="h-6 mb-4" aria-label="Google">
            <path fill="#4285F4" d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z"/>
            <path fill="#34A853" d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
            <path fill="#FBBC05" d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12c0 3.26 2.53 5.81 5.43 5.81 1.39 0 2.49-.62 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 8.03c-1.76 0-3.1-1.5-3.1-3.52 0-2.05 1.34-3.52 3.1-3.52 1.74 0 3.1 1.5 3.1 3.54-.01 2.03-1.36 3.5-3.1 3.5z"/>
            <path fill="#EA4335" d="M38 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
            <path fill="#4285F4" d="M68.41 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
          </svg>
          <h2 className="text-xl font-normal text-gray-800 text-center">Choose an account</h2>
          <p className="text-sm text-gray-500 mt-1 text-center">to continue to <span className="font-medium text-gray-700">SignConnect</span></p>
        </div>

        {/* Account list */}
        <div className="py-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              onClick={() => onSelect(acc)}
              disabled={loading}
              className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors disabled:opacity-60 text-left"
            >
              <img
                src={acc.avatar}
                alt={acc.name}
                className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0 bg-gray-100"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{acc.name}</p>
                <p className="text-xs text-gray-500 truncate">{acc.email}</p>
              </div>
              {loading && <Loader2 className="w-4 h-4 animate-spin ml-auto text-blue-500 flex-shrink-0" />}
            </button>
          ))}

          {/* Add another account */}
          {!addingNew ? (
            <button
              onClick={() => setAddingNew(true)}
              className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">Use another account</p>
            </button>
          ) : (
            <div className="px-6 py-4 space-y-3 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700">Add your Google account</p>
              <input
                autoFocus
                type="text"
                placeholder="Full name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <input
                type="email"
                placeholder="Email address (@gmail.com)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName && newEmail) onAddAccount(newName, newEmail)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setAddingNew(false); setNewName(''); setNewEmail('') }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { if (newName && newEmail) onAddAccount(newName, newEmail) }}
                  disabled={!newName || !newEmail}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer"
            className="text-xs text-gray-500 hover:underline">Privacy Policy</a>
          <span className="text-gray-300">·</span>
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer"
            className="text-xs text-gray-500 hover:underline">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}

// ── OTP Input ──────────────────────────────────────────────────────────────
function OTPInput({ length = 6, onChange }: { length?: number; onChange: (v: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (i: number, v: string) => {
    const d = [...digits]
    d[i] = v.slice(-1)
    setDigits(d)
    onChange(d.join(''))
    if (v && i < length - 1) refs.current[i + 1]?.focus()
  }
  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={cn(
            'w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none',
            'transition-all focus:border-primary focus:ring-2 focus:ring-primary/20',
            d ? 'border-primary bg-orange-50 text-secondary' : 'border-slate-200 bg-white text-slate-400'
          )}
        />
      ))}
    </div>
  )
}

// ── Social button component ─────────────────────────────────────────────────
function SocialBtn({ onClick, disabled, icon, label, bg }: {
  onClick: () => void; disabled: boolean
  icon: React.ReactNode; label: string; bg: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-semibold text-sm',
        'transition-all hover:scale-[1.02] active:scale-100 border',
        bg
      )}
    >
      {icon}
      {label}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Auth() {
  const navigate = useNavigate()
  const { login, loginWithProvider } = useAuth()
  const [step, setStep]         = useState<AuthStep>('choice')
  const [mode, setMode]         = useState<AuthMode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPass]     = useState('')
  const [showPass, setShow]     = useState(false)
  const [otp, setOtp]           = useState('')
  const [loading, setLoad]      = useState(false)
  const [otpTimer, setTimer]    = useState(0)
  const [showGooglePicker, setShowGooglePicker] = useState(false)

  // OTP countdown
  useEffect(() => {
    if (otpTimer <= 0) return
    const t = setInterval(() => setTimer(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [otpTimer])

  // ── Google account chosen from picker ─────────────────────────────────────
  function handleGoogleAccountSelect(acc: { id: string; name: string; email: string; avatar: string }) {
    setLoad(true)
    // Simulate a brief "signing in" moment
    setTimeout(() => {
      const role = acc.email.toLowerCase().includes('admin') ? 'admin' : 'user'
      login({
        id: acc.id,
        email: acc.email,
        name: acc.name,
        avatar: acc.avatar,
        provider: 'google',
        role,
      })
      toast.success(`Welcome, ${acc.name}! 🎉`)
      setShowGooglePicker(false)
      setLoad(false)
      navigate('/app')
    }, 800)
  }

  // ── Add a custom Google account ───────────────────────────────────────────
  function handleAddGoogleAccount(name: string, email: string) {
    setLoad(true)
    setTimeout(() => {
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'user'
      login({
        id: `g_custom_${Date.now()}`,
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        provider: 'google',
        role,
      })
      toast.success(`Welcome, ${name}! 🎉`)
      setShowGooglePicker(false)
      setLoad(false)
      navigate('/app')
    }, 800)
  }

  // ── Social / Provider Login ───────────────────────────────────────────────
  // Strategy:
  //  1. Check if Supabase is reachable.
  //  2. Try real Supabase OAuth (signInWithOAuth) – works when Supabase is live
  //  3. If Supabase is unreachable (paused/deleted), fall back to built-in picker
  async function oauthLogin(provider: 'google' | 'facebook' | 'twitter') {
    setLoad(true)
    try {
      // Pre-flight health check: ping the Supabase URL to see if it resolves.
      // If the project is paused, this will throw an error immediately instead of
      // redirecting the user to a broken "Hmm... can't reach this page" error.
      const env = (import.meta as unknown as { env: Record<string, string> }).env || {}
      const supabaseUrl = env.VITE_SUPABASE_URL || 'https://qnbvgjwookuuwsjatzhr.supabase.co'
      
      const isLive = await Promise.race([
        fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET' }).then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000))
      ])

      if (!isLive) {
        throw new Error('NXDOMAIN') // Force fallback
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/app`,
          // Force account-chooser so users can switch Google accounts
          queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
        },
      })
      if (error) {
        throw error
      }
      // Supabase will redirect browser to Google – loading stays true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      const isOffline =
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('Failed') ||
        msg.includes('timeout') ||
        msg.includes('ERR_NAME_NOT_RESOLVED') ||
        msg.includes('NXDOMAIN')

      if (isOffline && provider === 'google') {
        // Supabase is down – show built-in Google picker as fallback
        setLoad(false)
        setShowGooglePicker(true)
      } else if (isOffline) {
        toast('Backend is offline. Use Google or Guest login.', { icon: 'ℹ️' })
        setLoad(false)
      } else {
        toast.error(msg || 'Sign-in failed')
        setLoad(false)
      }
    }
  }

  // ── Email / password ──────────────────────────────────────────────────────
  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoad(true)
    
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user'
    
    if (mode === 'signup') {
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(password)) {
        toast.error('Password must be at least 8 chars and contain uppercase, lowercase, and numbers.')
        setLoad(false)
        return
      }
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        // If Supabase is down, fall back to local auth
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
          login({ email, name: email.split('@')[0], provider: 'email', role })
          toast.success('Account created! (Offline mode)')
          navigate('/app')
          setLoad(false)
          return
        }
        toast.error(error.message)
        setLoad(false)
        return
      }
      login({ email, name: email.split('@')[0], provider: 'email', role })
      toast.success('Account created & profile saved! Please check your email to verify.')
      navigate('/app')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // If Supabase is down, fall back to local auth
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
          login({ email, name: email.split('@')[0], provider: 'email', role })
          toast.success('Welcome back! (Offline mode)')
          navigate('/app')
          setLoad(false)
          return
        }
        toast.error(error.message)
        setLoad(false)
        return
      }
      login({ email, name: email.split('@')[0], provider: 'email', role })
      toast.success('Welcome back! Profile saved.')
      navigate('/app')
    }
    setLoad(false)
  }

  // ── OTP / Magic link ──────────────────────────────────────────────────────
  async function sendOTP() {
    if (!email) { toast.error('Enter your email first'); return }
    setLoad(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
        toast.success('OTP sent to your email! (demo mode)')
        setStep('otp')
        setTimer(60)
        setLoad(false)
        return
      }
      toast.error(error.message)
      setLoad(false)
      return
    }
    toast.success('OTP sent to your email!')
    setStep('otp')
    setTimer(60)
    setLoad(false)
  }

  async function verifyOTP() {
    setLoad(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) {
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
        // Offline fallback – accept any 6-digit code in demo mode
        const role = email.toLowerCase().includes('admin') ? 'admin' : 'user'
        login({ email, name: email.split('@')[0], provider: 'email', role })
        toast.success('Verified! Welcome to SignConnect. (Offline mode)')
        navigate('/app')
        setLoad(false)
        return
      }
      toast.error(error.message)
      setLoad(false)
      return
    }
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user'
    login({ email, name: email.split('@')[0], provider: 'email', role })
    toast.success('Verified! Welcome to SignConnect.')
    navigate('/app')
    setLoad(false)
  }

  function handleGuestLogin() {
    loginWithProvider('guest')
    toast.success('Logged in as Guest! All features enabled.')
    navigate('/app')
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Google Account Picker modal */}
      {showGooglePicker && (
        <GoogleAccountPicker
          onSelect={handleGoogleAccountSelect}
          onAddAccount={handleAddGoogleAccount}
          onClose={() => setShowGooglePicker(false)}
          loading={loading}
        />
      )}

      <div className="flex-1 flex min-h-0">

        {/* LEFT decorative panel */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-secondary to-slate-900 p-12 text-white relative overflow-hidden">
          {/* Background circles */}
          <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-primary/20" />
          <div className="absolute bottom-[-60px] left-[-60px] w-60 h-60 rounded-full bg-primary/10" />

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight">SignConnect</span>
            </Link>
            <p className="text-slate-400 text-sm mt-1">Real-Time Indian Sign Language AI</p>
          </div>

          <div className="relative z-10">
            <div className="text-5xl mb-6">🤟</div>
            <h2 className="text-3xl font-extrabold leading-tight mb-4">
              Breaking barriers,<br />one sign at a time.
            </h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Join thousands of users using AI-powered ISL translation to communicate effortlessly across languages and communities.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: '🎥', text: 'Real-time camera gesture detection' },
                { icon: '🌐', text: 'Supports all 22 Indian languages' },
                { icon: '🔒', text: 'Secure, private, and accessible' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-xl">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-xs relative z-10">© 2026 SignConnect. All rights reserved.</p>
        </div>

        {/* RIGHT auth panel */}
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <div className="w-full max-w-md">

            {/* ── STEP: Choice (social + method) ── */}
            {step === 'choice' && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                <div className="text-center mb-8">
                  <Badge className="bg-orange-50 text-primary border-primary/20 mb-4">Secure Login</Badge>
                  <h1 className="text-3xl font-extrabold text-secondary">Welcome back</h1>
                  <p className="text-slate-500 mt-2 text-sm">Sign in to continue to SignConnect</p>
                </div>

                {/* Social buttons */}
                <div className="space-y-3 mb-6">
                  <SocialBtn
                    disabled={loading}
                    onClick={() => oauthLogin('google')}
                    bg="border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    icon={
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    }
                    label="Continue with Google"
                  />
                  <SocialBtn
                    disabled={loading}
                    onClick={() => oauthLogin('facebook')}
                    bg="bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2]"
                    icon={
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    }
                    label="Continue with Facebook"
                  />
                  <SocialBtn
                    disabled={loading}
                    onClick={() => oauthLogin('twitter')}
                    bg="bg-black hover:bg-slate-800 text-white border-black"
                    icon={
                      <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    }
                    label="Continue with X (Twitter)"
                  />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">or continue with</span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Method choices */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    onClick={() => setStep('email-form')}
                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:border-primary hover:bg-orange-50 transition-all"
                  >
                    <Mail className="h-6 w-6 text-primary" />
                    <span className="text-sm font-semibold text-secondary">Email & Password</span>
                  </button>
                  <button
                    onClick={() => { setStep('email-form'); setMode('login') }}
                    className="flex flex-col items-center gap-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl hover:border-primary hover:bg-orange-50 transition-all"
                    title="Enter email then request OTP"
                  >
                    <Smartphone className="h-6 w-6 text-primary" />
                    <span className="text-sm font-semibold text-secondary">Magic OTP</span>
                  </button>
                </div>

                {/* Guest / Demo Access */}
                <button
                  onClick={handleGuestLogin}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-primary/50 bg-orange-50/50 hover:bg-orange-100/60 text-primary font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>⚡</span> Continue as Guest (Instant Access)
                </button>

                <p className="text-center text-xs text-slate-400 mt-6">
                  By continuing you agree to our{' '}
                  <Link to="#" className="text-primary hover:underline">Terms</Link> &{' '}
                  <Link to="#" className="text-primary hover:underline">Privacy Policy</Link>.
                </p>
              </div>
            )}

            {/* ── STEP: Email form ── */}
            {step === 'email-form' && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                <button
                  onClick={() => setStep('choice')}
                  className="flex items-center gap-1 text-slate-400 hover:text-secondary text-sm mb-6 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>

                <div className="mb-8">
                  <h1 className="text-2xl font-extrabold text-secondary">
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {mode === 'login' ? 'Enter your credentials to continue' : 'Fill in the details to get started'}
                  </p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="email" type="email" required
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-10 rounded-xl border-slate-200 focus:border-primary h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="password" type={showPass ? 'text' : 'password'} required
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPass(e.target.value)}
                        className="pl-10 pr-10 rounded-xl border-slate-200 focus:border-primary h-12"
                      />
                      <button type="button" onClick={() => setShow(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-secondary">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'login' && (
                    <div className="text-right">
                      <Link to="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
                    </div>
                  )}

                  <Button type="submit" disabled={loading}
                    className="w-full h-12 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold text-base gap-2">
                    {loading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><ArrowRight className="h-4 w-4" /> {mode === 'login' ? 'Sign in' : 'Create account'}</>}
                  </Button>
                </form>

                {/* OTP option */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <p className="text-xs text-blue-700 font-medium">Prefer passwordless? Use a one-time code.</p>
                  </div>
                  <button onClick={sendOTP} disabled={loading || !email}
                    className="text-xs text-blue-700 font-bold hover:text-blue-900 disabled:opacity-50 whitespace-nowrap">
                    Send OTP
                  </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-5">
                  {mode === 'login'
                    ? <span>No account? <button onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">Sign up</button></span>
                    : <span>Have an account? <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Sign in</button></span>}
                </p>
              </div>
            )}

            {/* ── STEP: OTP verification ── */}
            {step === 'otp' && (
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
                <div className="w-16 h-16 bg-orange-50 border-2 border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold text-secondary mb-2">Check your email</h1>
                <p className="text-slate-500 text-sm mb-2">
                  We sent a 6-digit code to <strong className="text-secondary">{email}</strong>
                </p>
                <p className="text-xs text-slate-400 mb-8">Enter it below to verify your identity.</p>

                <OTPInput onChange={setOtp} />

                <Button
                  onClick={verifyOTP}
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 bg-primary hover:bg-orange-600 text-white rounded-xl font-bold mt-6 gap-2"
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><CheckCircle2 className="h-4 w-4" /> Verify & Continue</>}
                </Button>

                <div className="mt-5 flex items-center justify-center gap-2 text-sm">
                  {otpTimer > 0
                    ? <span className="text-slate-400">Resend in <strong className="text-secondary">{otpTimer}s</strong></span>
                    : (
                      <button onClick={sendOTP}
                        className="text-primary font-semibold hover:underline">
                        Resend OTP
                      </button>
                    )}
                </div>

                <button onClick={() => setStep('choice')}
                  className="flex items-center justify-center gap-1 text-slate-400 hover:text-secondary text-sm mt-4 mx-auto transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Use different method
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
