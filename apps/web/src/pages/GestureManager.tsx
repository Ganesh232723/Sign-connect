/**
 * GestureManager — Visual Guide + Live Practice + Custom Saver
 *
 * Three tabs:
 *  1. Quick Reference  — All common gestures with SVG hand diagrams
 *  2. Practice Live    — Camera on, AI shows you what sign it detects right now
 *  3. Save My Sign     — Train complex / personal signs via webcam
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Hand, Plus, Trash2, Camera, CheckCircle2, Sparkles,
  RefreshCw, AlertCircle, Zap, BookOpen, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getCustomGestures, saveCustomGesture, deleteCustomGesture,
  recognizeHandGesture,
  GESTURE_LIBRARY,
  type GestureEntry, type CustomGesture, type Landmark,
} from '@/services/gestureRecognizer'
import { useSettings } from '@/stores/settings'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

// ─── SVG Hand Diagram ───────────────────────────────────────────────────────────
interface FingerState {
  thumb: boolean | 'side'
  index: boolean | 'bent'
  middle: boolean | 'bent'
  ring: boolean | 'bent'
  pinky: boolean | 'bent'
}

function HandDiagram({ state, active = false }: { state: FingerState; active?: boolean }) {
  const base = active ? '#f97316' : '#64748b'
  const up = active ? '#f97316' : '#334155'
  const bent = active ? '#fb923c' : '#94a3b8'
  const down = '#e2e8f0'
  const stroke = active ? '#ea580c' : '#475569'

  // Helper: get finger color
  const fc = (v: boolean | 'bent' | 'side') =>
    v === true ? up : v === 'bent' ? bent : v === 'side' ? bent : down

  // Thumb position — goes left
  const thumbX = state.thumb === 'side' ? 14 : state.thumb ? 16 : 22
  const thumbY = state.thumb === 'side' ? 60 : state.thumb ? 52 : 68

  return (
    <svg viewBox="0 0 80 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Palm */}
      <rect x="18" y="55" width="44" height="38" rx="8" fill={base} opacity="0.15" stroke={stroke} strokeWidth="1.5" />

      {/* Thumb */}
      <ellipse cx={thumbX} cy={thumbY} rx="6" ry="10"
        fill={fc(state.thumb)} stroke={stroke} strokeWidth="1.2"
        transform={state.thumb === 'side' ? `rotate(-30,${thumbX},${thumbY})` : ''} />

      {/* Index */}
      <rect x="23" y={state.index === true ? 12 : state.index === 'bent' ? 28 : 46}
        width="9" height={state.index === true ? 44 : state.index === 'bent' ? 28 : 12}
        rx="4.5" fill={fc(state.index)} stroke={stroke} strokeWidth="1.2" />

      {/* Middle */}
      <rect x="34" y={state.middle === true ? 8 : state.middle === 'bent' ? 24 : 44}
        width="9" height={state.middle === true ? 48 : state.middle === 'bent' ? 32 : 13}
        rx="4.5" fill={fc(state.middle)} stroke={stroke} strokeWidth="1.2" />

      {/* Ring */}
      <rect x="45" y={state.ring === true ? 12 : state.ring === 'bent' ? 28 : 46}
        width="9" height={state.ring === true ? 44 : state.ring === 'bent' ? 28 : 12}
        rx="4.5" fill={fc(state.ring)} stroke={stroke} strokeWidth="1.2" />

      {/* Pinky */}
      <rect x="56" y={state.pinky === true ? 22 : state.pinky === 'bent' ? 34 : 52}
        width="8" height={state.pinky === true ? 35 : state.pinky === 'bent' ? 23 : 10}
        rx="4" fill={fc(state.pinky)} stroke={stroke} strokeWidth="1.2" />
    </svg>
  )
}

// ─── Hand connections for live canvas ──────────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

function drawHand(ctx: CanvasRenderingContext2D, lms: Landmark[], w: number, h: number) {
  ctx.save()
  ctx.shadowBlur = 8; ctx.shadowColor = '#f97316'
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.globalAlpha = 0.95
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(lms[a].x * w, lms[a].y * h)
    ctx.lineTo(lms[b].x * w, lms[b].y * h)
    ctx.stroke()
  }
  ctx.shadowBlur = 12; ctx.shadowColor = '#fb923c'
  for (const lm of lms) {
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.95; ctx.fill()
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.stroke()
  }
  ctx.restore()
}

// ─── Component ──────────────────────────────────────────────────────────────────
type Tab = 'reference' | 'practice' | 'custom'

export default function GestureManagerPage() {
  const { gpuEnabled } = useSettings()
  const [activeTab, setActiveTab] = useState<Tab>('reference')
  const [customList, setCustomList] = useState<CustomGesture[]>([])
  const [signName, setSignName] = useState('')
  const [signCategory, setSignCategory] = useState('General')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Practice / Trainer
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [capturedLandmarks, setCapturedLandmarks] = useState<Landmark[] | null>(null)
  const [liveSign, setLiveSign] = useState<string | null>(null)
  const [liveConf, setLiveConf] = useState(0)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef      = useRef<number>(0)
  const landmarkerRef = useRef<unknown>(null)

  useEffect(() => { setCustomList(getCustomGestures()) }, [])

  // ── Init MediaPipe ───────────────────────────────────────────────────────────
  const initMediaPipe = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current
    setDetecting(true)
    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      const opts = (delegate: 'GPU'|'CPU') => ({
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate,
        },
        runningMode: 'VIDEO' as const,
        numHands: 1,
      })
      let inst
      if (gpuEnabled) {
        try { inst = await HandLandmarker.createFromOptions(vision, opts('GPU')) }
        catch { inst = await HandLandmarker.createFromOptions(vision, opts('CPU')) }
      } else {
        inst = await HandLandmarker.createFromOptions(vision, opts('CPU'))
      }
      landmarkerRef.current = inst
      setDetecting(false)
      return inst
    } catch {
      setDetecting(false)
      return null
    }
  }, [gpuEnabled])

  // ── Camera helpers ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    await initMediaPipe()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise<void>(r => { videoRef.current!.onloadedmetadata = () => r() })
        await videoRef.current.play()
      }
      setIsCameraOn(true)
    } catch {
      toast.error('Could not access camera.')
    }
  }, [initMediaPipe])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setIsCameraOn(false)
    setLiveSign(null)
    setLiveConf(0)
    setCapturedLandmarks(null)
  }, [])

  // ── Detection loop ───────────────────────────────────────────────────────────
  const detectionLoop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const lander = landmarkerRef.current as {
      detectForVideo: (v: HTMLVideoElement, t: number) => { landmarks: Landmark[][] }
    } | null

    if (video && canvas && video.readyState >= 2 && lander) {
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const result = lander.detectForVideo(video, performance.now())
      if (result.landmarks?.length > 0) {
        const lms = result.landmarks[0] as Landmark[]
        setCapturedLandmarks(lms)
        drawHand(ctx, lms, canvas.width, canvas.height)

        // Live gesture detection for practice tab
        const gesture = recognizeHandGesture(lms)
        setLiveSign(gesture?.sign ?? null)
        setLiveConf(gesture?.confidence ?? 0)
      } else {
        setCapturedLandmarks(null)
        setLiveSign(null)
        setLiveConf(0)
      }
    }
    rafRef.current = requestAnimationFrame(detectionLoop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCamera = useCallback(async () => {
    await startCamera()
    rafRef.current = requestAnimationFrame(detectionLoop)
  }, [startCamera, detectionLoop])

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!signName.trim()) { toast.error('Enter a name for your sign'); return }
    if (!capturedLandmarks) { toast.error('Show your hand to the camera first!'); return }
    saveCustomGesture(signName, signCategory, capturedLandmarks)
    setCustomList(getCustomGestures())
    toast.success(`"${signName}" saved! It will now be auto-detected in Live Translation.`)
    setSignName(''); setCapturedLandmarks(null); setActiveTab('custom'); stopCamera()
  }

  const handleDelete = (id: string, name: string) => {
    deleteCustomGesture(id)
    setCustomList(getCustomGestures())
    toast.success(`Deleted "${name}"`)
  }

  useEffect(() => () => { stopCamera() }, [stopCamera])

  // ── Derived data ─────────────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(GESTURE_LIBRARY.map(g => g.category)))]
    return cats
  }, [])

  const autoGestures = useMemo(() =>
    GESTURE_LIBRARY.filter(g => g.autoDetected), [])

  const complexGestures = useMemo(() =>
    GESTURE_LIBRARY.filter(g => !g.autoDetected), [])

  const filteredGestures = useMemo(() => {
    const base = GESTURE_LIBRARY
    return base.filter(g =>
      (selectedCategory === 'All' || g.category === selectedCategory) &&
      (!searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [selectedCategory, searchQuery])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1">
              <Zap className="h-3 w-3" /> {autoGestures.length} Auto-Detected
            </Badge>
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs gap-1">
              <Camera className="h-3 w-3" /> {complexGestures.length} Save Manually
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
              {customList.length} My Custom
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-secondary">Gesture Guide</h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl">
            Common everyday gestures everyone knows — auto-detected live.
            Complex signs? Save them once with your camera and they work forever.
          </p>
        </div>
        <Button
          onClick={() => { setActiveTab('practice'); if (!isCameraOn) openCamera() }}
          className="bg-primary hover:bg-orange-600 text-white rounded-xl font-bold gap-2"
        >
          <Eye className="h-4 w-4" /> Practice Live
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'reference', label: 'Quick Reference', icon: BookOpen },
          { id: 'practice',  label: 'Practice Live',   icon: Eye },
          { id: 'custom',    label: `My Signs (${customList.length})`, icon: Sparkles },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id)
              if (id === 'practice' && !isCameraOn) openCamera()
              if (id !== 'practice' && isCameraOn) stopCamera()
            }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === id
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-500 hover:text-secondary'
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: QUICK REFERENCE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'reference' && (
        <div className="space-y-6">

          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Search gestures..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-primary bg-white w-48"
            />
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/50'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Info banner */}
          <div className="flex gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-green-700">
              <Zap className="h-4 w-4 shrink-0" />
              <span><strong>Green dot</strong> = detected automatically in Live Translation</span>
            </div>
            <div className="flex items-center gap-2 text-orange-700">
              <Camera className="h-4 w-4 shrink-0" />
              <span><strong>Orange</strong> = save once with camera → works forever</span>
            </div>
          </div>

          {/* Gesture cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredGestures.map(g => (
              <GestureCard key={g.name} gesture={g} onSave={() => {
                setActiveTab('practice')
                setSignName(g.name)
                if (!isCameraOn) openCamera()
              }} />
            ))}
          </div>

          {filteredGestures.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Hand className="h-10 w-10 mx-auto mb-3 text-slate-200" />
              <p className="font-medium">No gestures found</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: PRACTICE LIVE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'practice' && (
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Camera feed */}
          <div className="space-y-3">
            <h2 className="font-bold text-secondary">Live Camera — Show any gesture</h2>
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />

              {!isCameraOn && !detecting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Camera className="h-10 w-10 text-slate-500" />
                  <p className="text-sm font-medium">Camera Off</p>
                  <Button size="sm" onClick={openCamera} className="bg-primary text-white rounded-xl text-xs">
                    Turn On Camera
                  </Button>
                </div>
              )}

              {detecting && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 text-white">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Loading AI Hand Tracker…</p>
                </div>
              )}

              {/* Live result overlay */}
              {isCameraOn && liveSign && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
                  <div className="bg-black/80 backdrop-blur-sm border border-orange-500/60 rounded-xl px-5 py-2.5 shadow-lg shadow-orange-500/20 text-center">
                    <p className="text-orange-400 text-[10px] font-bold tracking-widest uppercase mb-0.5">Detected</p>
                    <p className="text-white font-extrabold text-xl leading-tight">{liveSign}</p>
                    <div className="flex justify-center mt-1 gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn(
                          'h-1 rounded-full transition-all',
                          i < Math.round(liveConf * 5) ? 'w-4 bg-orange-400' : 'w-2 bg-white/20'
                        )} />
                      ))}
                    </div>
                    <p className="text-orange-300 text-[10px] mt-0.5">{Math.round(liveConf * 100)}% confidence</p>
                  </div>
                </div>
              )}

              {isCameraOn && !liveSign && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2 text-center">
                    <p className="text-slate-400 text-xs">Show your hand — try any gesture!</p>
                  </div>
                </div>
              )}
            </div>

            {isCameraOn && (
              <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={stopCamera}>
                Stop Camera
              </Button>
            )}
          </div>

          {/* Right: reference + save form */}
          <div className="space-y-4">

            {/* Quick gesture cheat sheet */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Try these common gestures</p>
              <div className="grid grid-cols-3 gap-2">
                {autoGestures.slice(0, 12).map(g => (
                  <div key={g.name}
                    className={cn(
                      'flex flex-col items-center p-2 rounded-xl border transition-all',
                      liveSign === g.name
                        ? 'border-orange-400 bg-orange-50 shadow-sm scale-105'
                        : 'border-slate-200 bg-white'
                    )}
                  >
                    <span className="text-xl mb-1">{g.emoji}</span>
                    <p className="text-[10px] font-semibold text-secondary text-center leading-tight">{g.name}</p>
                    {liveSign === g.name && (
                      <span className="text-[9px] text-orange-600 font-bold mt-0.5">✓ Detected!</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-secondary text-base">Save a Complex Sign</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  For signs that need body position (Mother, Doctor, Home…) — show the sign to the camera and save it once.
                </p>
              </div>

              <form onSubmit={handleSaveCustom} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Sign Name</Label>
                  <Input
                    type="text" required placeholder="e.g. Mother, Doctor, Home…"
                    value={signName} onChange={e => setSignName(e.target.value)}
                    className="rounded-xl text-sm h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Category</Label>
                  <select
                    value={signCategory} onChange={e => setSignCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-primary"
                  >
                    <option value="General">General / Everyday</option>
                    <option value="Family">Family</option>
                    <option value="Emergency">Emergency / Medical</option>
                    <option value="Food">Food / Drink</option>
                    <option value="Travel">Travel / Place</option>
                    <option value="Emotions">Emotions</option>
                  </select>
                </div>

                <div className={cn(
                  'p-3 rounded-xl border text-xs font-medium flex items-center gap-2',
                  capturedLandmarks
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                )}>
                  {capturedLandmarks
                    ? <><CheckCircle2 className="h-4 w-4 shrink-0" /> Hand position captured — ready to save!</>
                    : <><AlertCircle className="h-4 w-4 shrink-0" /> Show your hand to the camera above to capture its position</>
                  }
                </div>

                <Button
                  type="submit"
                  disabled={!capturedLandmarks || !signName.trim()}
                  className="w-full bg-primary hover:bg-orange-600 text-white rounded-xl font-bold h-11 gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="h-4 w-4" /> Save Sign → Auto-Detect Forever
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: MY CUSTOM SIGNS
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {customList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                <Hand className="h-8 w-8 text-slate-300" />
              </div>
              <h3 className="font-bold text-secondary text-lg">No custom signs saved yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Save complex signs like "Mother", "Doctor", "Home" using your camera.
                Once saved, they're auto-detected just like built-in gestures.
              </p>
              <Button
                onClick={() => { setActiveTab('practice'); if (!isCameraOn) openCamera() }}
                className="bg-primary hover:bg-orange-600 text-white rounded-xl text-sm font-bold gap-2"
              >
                <Plus className="h-4 w-4" /> Save My First Sign
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{customList.length} saved sign{customList.length !== 1 ? 's' : ''} — all auto-detected in Live Translation</p>
                <Button
                  size="sm" variant="outline"
                  onClick={() => { setActiveTab('practice'); if (!isCameraOn) openCamera() }}
                  className="gap-1.5 text-xs rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> Add More
                </Button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customList.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-secondary text-lg">{item.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Saved {item.createdAt}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5">
                      <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-[10px]">{item.category}</Badge>
                      <span className="flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Auto-Detecting
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Gesture Card sub-component ─────────────────────────────────────────────────
function GestureCard({ gesture, onSave }: { gesture: GestureEntry; onSave: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm transition-all cursor-pointer select-none',
        expanded ? 'border-primary/50 shadow-md' : 'border-slate-200 hover:border-slate-300'
      )}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-3">
        {/* Hand diagram */}
        <div className={cn(
          'mx-auto mb-2 rounded-xl overflow-hidden transition-all',
          gesture.autoDetected ? 'bg-green-50' : 'bg-orange-50',
          expanded ? 'h-24' : 'h-16'
        )}>
          <HandDiagram state={gesture.fingerState} active={gesture.autoDetected} />
        </div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-lg">{gesture.emoji}</span>
          {gesture.autoDetected
            ? <span className="flex items-center gap-0.5 text-[9px] font-bold text-green-600">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
                AUTO
              </span>
            : <span className="text-[9px] font-bold text-orange-500">SAVE</span>
          }
        </div>

        <p className="text-xs font-bold text-secondary leading-tight">{gesture.name}</p>
        {!expanded && (
          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-1">{gesture.description}</p>
        )}
      </div>

      {/* Expanded: step-by-step instructions */}
      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-2" onClick={e => e.stopPropagation()}>
          <p className="text-[11px] text-slate-500 leading-snug">{gesture.description}</p>
          <div className="space-y-1">
            {gesture.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={cn(
                  'text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  gesture.autoDetected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                )}>
                  {i + 1}
                </span>
                <p className="text-[11px] text-slate-600 leading-snug">{step}</p>
              </div>
            ))}
          </div>
          {!gesture.autoDetected && (
            <Button
              size="sm"
              onClick={onSave}
              className="w-full mt-1 bg-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold gap-1"
            >
              <Camera className="h-3 w-3" /> Save This Sign via Camera
            </Button>
          )}
          {gesture.autoDetected && (
            <p className="text-[10px] text-green-600 font-semibold text-center mt-1">
              ✓ Already works in Live Translation — no setup needed
            </p>
          )}
        </div>
      )}
    </div>
  )
}
