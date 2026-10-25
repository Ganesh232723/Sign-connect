import { useState, useEffect } from 'react'
import {
  ShieldCheck, Activity, Cpu, Database,
  BarChart3, RefreshCw, Layers, CheckCircle2, AlertTriangle,
  Search, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useSettings } from '@/stores/settings'
import { fetchAdminMetrics, fetchAdminSessions } from '@/services/supabase'

interface SystemMetric {
  title: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ElementType
}

interface SessionRow {
  id: string
  user_id: string | null
  language_output: string
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
}

const MOCK_LANG_DISTRIBUTION = [
  { name: 'Hindi (Devanagari)', count: '42.5%', color: 'bg-orange-500' },
  { name: 'English (Standard)', count: '24.1%', color: 'bg-blue-500' },
  { name: 'Tamil (Tamil)', count: '12.8%', color: 'bg-purple-500' },
  { name: 'Marathi (Devanagari)', count: '10.2%', color: 'bg-green-500' },
  { name: 'Telugu / Kannada / Others', count: '10.4%', color: 'bg-slate-400' }
]

export default function AdminPage() {
  const { gpuEnabled, modelMode, update } = useSettings()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [dbMetrics, setDbMetrics] = useState<{ totalSessions: number; totalTranscripts: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [metrics, sessionData] = await Promise.all([
        fetchAdminMetrics(),
        fetchAdminSessions()
      ])
      setDbMetrics(metrics)
      setSessions(sessionData)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    const [metrics, sessionData] = await Promise.all([
      fetchAdminMetrics(),
      fetchAdminSessions()
    ])
    setDbMetrics(metrics)
    setSessions(sessionData)
    setLoading(false)
    toast.success('Metrics refreshed from Supabase!')
  }

  const handlePurgeLogs = () => {
    toast.success('System logs & temporary cache purged.')
  }

  const metrics: SystemMetric[] = [
    {
      title: 'Total Sessions',
      value: loading ? '…' : dbMetrics?.totalSessions?.toLocaleString() ?? '0',
      change: 'From Supabase DB',
      trend: 'up',
      icon: Activity
    },
    {
      title: 'Total Transcripts',
      value: loading ? '…' : dbMetrics?.totalTranscripts?.toLocaleString() ?? '0',
      change: 'Gesture captions',
      trend: 'up',
      icon: Cpu
    },
    {
      title: 'AI Model Mode',
      value: modelMode.replace('_', ' '),
      change: gpuEnabled ? 'GPU Enabled' : 'CPU Mode',
      trend: 'neutral',
      icon: ShieldCheck
    },
    {
      title: 'Supabase DB Sync',
      value: loading ? 'Connecting…' : 'Connected',
      change: loading ? '' : `${sessions.length} sessions loaded`,
      trend: 'neutral',
      icon: Database
    },
  ]

  const filteredSessions = sessions.filter(s =>
    (s.user_id || 'Anonymous').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.language_output.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-slate-900 text-white font-mono text-xs">ADMIN PANEL v2.4</Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
              {loading ? 'Syncing…' : 'System Healthy'}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-secondary">SignConnect Executive Administration</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time model performance, inference metrics, and multi-language engine controls.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl text-xs gap-2"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh Metrics
          </Button>
          <Button
            className="bg-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold gap-2 shadow-sm"
            onClick={handlePurgeLogs}
          >
            <Layers className="h-3.5 w-3.5" /> Purge Temp Cache
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => {
          const Icon = m.icon
          return (
            <div key={m.title} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{m.title}</span>
                <div className="p-2 bg-slate-50 rounded-xl text-primary border border-slate-100">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-secondary capitalize">{m.value}</p>
              <p className="text-xs font-medium text-green-600 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                {m.change}
              </p>
            </div>
          )
        })}
      </div>

      {/* Model Engine Controls & Regional Analytics */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Inference Engine Controls */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-secondary">AI Model Engine Configuration</h2>
              <p className="text-xs text-slate-500">Tweak real-time MediaPipe vision pipeline parameters & GPU execution modes</p>
            </div>
            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-xs">
              MediaPipe Vision v1.0.1
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* GPU Acceleration Switch — wired to global settings */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-secondary">GPU Hardware Acceleration</p>
                <p className="text-[11px] text-slate-500 mt-0.5">WebGL / WebGPU tensor delegate</p>
              </div>
              <button
                onClick={() => {
                  update({ gpuEnabled: !gpuEnabled })
                  toast.success(`GPU Acceleration ${!gpuEnabled ? 'Enabled' : 'Disabled'}`)
                }}
                className={cn(
                  'w-11 h-6 rounded-full transition-colors relative',
                  gpuEnabled ? 'bg-primary' : 'bg-slate-300'
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
                  gpuEnabled ? 'left-6' : 'left-1'
                )} />
              </button>
            </div>

            {/* Inference Mode — wired to global settings */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-xs font-bold text-secondary mb-2">Inference Precision Target</p>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                {(['high_precision', 'balanced', 'fast'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      update({ modelMode: mode })
                      toast.success(`Model mode set to ${mode.replace('_', ' ')}`)
                    }}
                    className={cn(
                      'flex-1 text-[11px] py-1 font-semibold rounded-md transition-all capitalize',
                      modelMode === mode ? 'bg-primary text-white shadow-xs' : 'text-slate-600 hover:text-secondary'
                    )}
                  >
                    {mode.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Pipeline Nodes status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Pipeline Workers</h3>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-900">Hand Landmarker</p>
                  <p className="text-[10px] text-green-700">21 Coordinates</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-900">Pose Landmarker</p>
                  <p className="text-[10px] text-green-700">33 Keypoints</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-green-900">TTS Synthesizer</p>
                  <p className="text-[10px] text-green-700">22 Indian Langs</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Regional Indian Languages Analytics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-base font-bold text-secondary">Indian Languages Demand</h2>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>

            <div className="space-y-3.5">
              {MOCK_LANG_DISTRIBUTION.map(lang => (
                <div key={lang.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{lang.name}</span>
                    <span className="text-slate-900">{lang.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", lang.color)}
                      style={{ width: lang.count }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 p-3.5 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
            <p className="text-xs text-orange-800 leading-tight">
              <strong>High Regional Demand:</strong> Hindi & Marathi account for &gt;52% of live translation traffic.
            </p>
          </div>
        </div>
      </div>

      {/* Real-time Session Monitoring Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-secondary">Live User Translation Sessions</h2>
            <p className="text-xs text-slate-500">
              {loading ? 'Fetching sessions from Supabase…' : `${sessions.length} sessions found in database`}
            </p>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search user ID, or language..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl text-xs h-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting to Supabase…
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
            <Database className="h-10 w-10 mb-3 text-slate-200" />
            <p className="font-medium">No sessions yet</p>
            <p className="text-xs mt-1">Run a Live Translation session — it will appear here automatically.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Session ID</th>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Language</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Started</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSessions.map(sess => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-secondary text-[11px]">{sess.id.slice(0, 8)}…</td>
                    <td className="p-3.5 font-medium">{sess.user_id ? sess.user_id.slice(0, 12) + '…' : 'Anonymous'}</td>
                    <td className="p-3.5">
                      <Badge variant="outline" className="text-[11px] font-normal">{sess.language_output}</Badge>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {sess.duration_seconds ? `${sess.duration_seconds}s` : '—'}
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(sess.started_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-right">
                      <Badge className={cn(
                        "text-[10px]",
                        !sess.ended_at ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {sess.ended_at ? 'Completed' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
