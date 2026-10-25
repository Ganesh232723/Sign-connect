import { useEffect, useState } from 'react'
import { useSettings, INDIAN_LANGUAGES } from '@/stores/settings'
import { useAuth } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Globe, Volume2, Sliders, Eye, RefreshCw, CheckCircle2,
  Info, Camera, Mic, User, Save, LogOut
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { update, reset, ...settings } = useSettings()
  const { user, updateProfile } = useAuth()
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [editName, setEditName] = useState(user?.name || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')

  useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditEmail(user.email)
    }
  }, [user])

  // Enumerate cameras
  useEffect(() => {
    async function load() {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null)
        const devs = await navigator.mediaDevices.enumerateDevices()
        setCameras(devs.filter(d => d.kind === 'videoinput'))
        tmp?.getTracks().forEach(t => t.stop())
      } catch { /* no permission yet */ }
    }
    load()
  }, [])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile({ name: editName, email: editEmail })
    toast.success('Account profile updated & saved!')
  }

  const providerBadges: Record<string, { label: string; bg: string }> = {
    google: { label: 'Google Account', bg: 'bg-red-50 text-red-700 border-red-200' },
    facebook: { label: 'Facebook Account', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    twitter: { label: 'X (Twitter) Account', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    email: { label: 'Email Verified', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    guest: { label: 'Guest Mode', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }

  const currentBadge = user?.provider ? providerBadges[user.provider] : null

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Settings & Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account information, translation preferences, camera, and voice settings.</p>
      </div>

      <div className="space-y-5">

        {/* ── User Profile Information ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-secondary">Account Profile</h2>
                <p className="text-xs text-slate-500">Your profile information is saved and linked to your translation sessions.</p>
              </div>
            </div>
            {currentBadge && (
              <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-1", currentBadge.bg)}>
                {currentBadge.label}
              </Badge>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <img
                src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
                alt="Profile Avatar"
                className="w-14 h-14 rounded-full bg-white border-2 border-primary/20 shadow-xs object-cover"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-secondary text-sm">{user?.name || 'Explorer'}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Active Session</Badge>
                </div>
                <p className="text-xs text-slate-400">Signed in via {user?.provider?.toUpperCase() || 'DIRECT ACCESS'}</p>
                <p className="text-[11px] text-slate-400">Member since: {user?.joinedAt || 'Recently'}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Full Name</label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                  className="text-sm rounded-xl h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Email Address</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="text-sm rounded-xl h-10"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" className="bg-primary hover:bg-orange-600 text-white rounded-xl gap-1.5 text-xs font-semibold">
                <Save className="h-3.5 w-3.5" /> Save Profile Info
              </Button>
            </div>
          </form>
        </section>

        {/* ── Output Language ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-secondary">Output Language</h2>
              <p className="text-xs text-slate-500">All 22 Scheduled Indian Languages + English. Speech & captions will appear in the selected language.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {INDIAN_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => update({ outputLanguage: lang.code })}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all text-left',
                  settings.outputLanguage === lang.code
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-primary/40 hover:bg-orange-50'
                )}
              >
                <div>
                  <p>{lang.label}</p>
                  <p className="text-xs text-slate-400 font-normal">{lang.script}</p>
                </div>
                {settings.outputLanguage === lang.code && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── Camera Device ── */}
        {cameras.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-orange-50 rounded-xl">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-secondary">Camera Device</h2>
                <p className="text-xs text-slate-500">
                  {cameras.length} camera{cameras.length > 1 ? 's' : ''} detected. Works across laptops, tablets, and external webcams.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {cameras.map((cam, i) => (
                <button
                  key={cam.deviceId}
                  onClick={() => update({ cameraDeviceId: cam.deviceId })}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left',
                    settings.cameraDeviceId === cam.deviceId
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-primary/40 hover:bg-orange-50'
                  )}
                >
                  <span>{cam.label || `Camera ${i + 1}`}</span>
                  {settings.cameraDeviceId === cam.deviceId && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Voice / TTS ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-secondary">Voice Output (TTS)</h2>
              <p className="text-xs text-slate-500">Translated captions are read aloud in the selected language.</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Enable Voice Output</label>
              <button onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
                className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  settings.ttsEnabled ? 'bg-primary' : 'bg-slate-200')}>
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                  settings.ttsEnabled ? 'translate-x-6' : 'translate-x-1')} />
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-slate-700">Speech Speed</label>
                <Badge variant="outline" className="text-xs">{settings.ttsRate.toFixed(1)}×</Badge>
              </div>
              <input type="range" min="0.5" max="2" step="0.1" value={settings.ttsRate}
                onChange={e => update({ ttsRate: parseFloat(e.target.value) })}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-slate-400"><span>Slow</span><span>Normal</span><span>Fast</span></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-slate-700">Voice Pitch</label>
                <Badge variant="outline" className="text-xs">{settings.ttsPitch.toFixed(1)}</Badge>
              </div>
              <input type="range" min="0.5" max="2" step="0.1" value={settings.ttsPitch}
                onChange={e => update({ ttsPitch: parseFloat(e.target.value) })}
                className="w-full accent-orange-500" />
              <div className="flex justify-between text-xs text-slate-400"><span>Low</span><span>Normal</span><span>High</span></div>
            </div>
          </div>
        </section>

        {/* ── Speech Input ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-secondary">Voice Input</h2>
              <p className="text-xs text-slate-500">Speak in any Indian language — it will be normalised to English, then translated to your output language.</p>
            </div>
          </div>
          <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              The mic listens in <strong>{INDIAN_LANGUAGES.find(l => l.code === settings.outputLanguage)?.label ?? 'English'}</strong>.
              You can change this by selecting a different Output Language above.
            </p>
          </div>
        </section>

        {/* ── AI Confidence ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Sliders className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-secondary">Confidence Threshold</h2>
              <p className="text-xs text-slate-500">Only emit captions above this accuracy score.</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-slate-700">Threshold</label>
              <Badge variant="outline" className="text-xs">{Math.round(settings.confidenceThreshold * 100)}%</Badge>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={settings.confidenceThreshold}
              onChange={e => update({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full accent-orange-500" />
            <div className="flex justify-between text-xs text-slate-400"><span>Show All</span><span>Balanced</span><span>High Accuracy</span></div>
          </div>
        </section>

        {/* ── Accessibility ── */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-orange-50 rounded-xl">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-secondary">Accessibility</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: 'showSkeleton', label: 'Show AI Hand Skeleton', desc: 'Draw landmarks and joint lines over the camera feed.' },
              { key: 'highContrast', label: 'High Contrast Mode', desc: 'Increase text contrast for low-vision users.' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => update({ [key]: !settings[key as keyof typeof settings] } as never)}
                  className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    settings[key as keyof typeof settings] ? 'bg-primary' : 'bg-slate-200')}>
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                    settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Supabase note ── */}
        <div className="flex gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            <strong>Data Storage:</strong> All sessions and captions are automatically saved to Supabase.
            View them in the <strong>Session History</strong> panel.
          </p>
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={() => toast.success('Settings saved!')} className="bg-primary hover:bg-orange-600 text-white rounded-xl px-8">
            Save Settings
          </Button>
          <Button variant="outline" onClick={() => { reset(); toast('Reset to defaults.') }}
            className="rounded-xl gap-2 text-slate-600">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
          
          <Button variant="outline" onClick={async () => {
            await supabase.auth.signOut();
            useAuth.getState().logout();
            toast.success('Signed out');
            window.location.href = '/auth';
          }} className="rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 ml-auto md:hidden">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
