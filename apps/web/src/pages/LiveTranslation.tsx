import {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react'
import {
  Camera, Square, Volume2, VolumeX, Activity, Zap,
  Settings2, Clock, Languages, AlertCircle, Hand,
  Mic, MicOff, MonitorSpeaker, BarChart3, ArrowRightLeft,
  Wifi, RefreshCw, BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { tts, stt, type STTCallback } from '@/services/tts'
import { useSettings, INDIAN_LANGUAGES } from '@/stores/settings'
import { createSession, endSession, saveTranscript } from '@/services/supabase'
import {
  recognizeHandGesture, setGestureContext,
  type Landmark,
  GESTURE_LIBRARY_SLIM, type GestureEntrySlim
} from '@/services/gestureRecognizer'
import { translateText, toEnglish } from '@/services/translator'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import VideoRecorder from '@/components/webcam/VideoRecorder'
import toast from 'react-hot-toast'

// ─── Types ─────────────────────────────────────────────────────────────────
interface Caption {
  id:               string
  inputMode:        'gesture' | 'speech'
  sourceText:       string   // English (normalised)
  translatedText:   string   // target language
  sourceLang:       string
  targetLang:       string
  gestureAccuracy:  number
  translationConf:  number
  overallScore:     number
  timestamp:        Date
}

// ─── Hand skeleton connections ──────────────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

/** Draw hand skeleton with bright neon colors and glowing joints. */
function drawHand(
  ctx: CanvasRenderingContext2D,
  lms: Landmark[], w: number, h: number, boneColor: string, jointColor: string
) {
  ctx.save()

  // ── Bones with glow ───────────────────────────────────────────────────────
  ctx.shadowBlur    = 8
  ctx.shadowColor   = boneColor
  ctx.strokeStyle   = boneColor
  ctx.lineWidth     = 3
  ctx.globalAlpha   = 0.95
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath()
    ctx.moveTo(lms[a].x * w, lms[a].y * h)
    ctx.lineTo(lms[b].x * w, lms[b].y * h)
    ctx.stroke()
  }

  // ── Joints ────────────────────────────────────────────────────────────────
  ctx.shadowBlur  = 12
  ctx.shadowColor = jointColor
  for (const lm of lms) {
    ctx.beginPath()
    ctx.arc(lm.x * w, lm.y * h, 7, 0, Math.PI * 2)
    ctx.fillStyle   = '#ffffff'
    ctx.globalAlpha = 0.95
    ctx.fill()
    ctx.strokeStyle = jointColor
    ctx.lineWidth   = 2.5
    ctx.stroke()
  }

  ctx.restore()
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function LiveTranslation() {
  const settings = useSettings()

  // ── state ──────────────────────────────────────────────────────────────────
  const [isRunning,       setIsRunning]       = useState(false)
  const [micOn,           setMicOn]           = useState(false)
  const [captions,        setCaptions]        = useState<Caption[]>([])
  const [currentGesture,  setCurrentGesture]  = useState<string | null>(null)
  const [currentTranslation, setCurrentTranslation] = useState<string | null>(null)
  const [partialSpeech,   setPartialSpeech]   = useState('')
  const [fps,             setFps]             = useState(0)
  const [sessionId,       setSessionId]       = useState<string | null>(null)
  const [elapsed,         setElapsed]         = useState(0)
  const [cameraError,     setCameraError]     = useState<string | null>(null)
  const [modelState,      setModelState]      = useState<'idle'|'loading'|'ready'|'failed'>('idle')
  const [devices,         setDevices]         = useState<MediaDeviceInfo[]>([])
  const [selectedDevId,   setSelectedDevId]   = useState<string>('')
  const [tab,             setTab]             = useState<'captions'|'library'|'accuracy'>('captions')
  const [activeStream,    setActiveStream]    = useState<MediaStream | null>(null)
  const [stabilizingProgress, setStabilizingProgress] = useState<{ gesture: string; count: number } | null>(null)
  const [gestureTranslations, setGestureTranslations] = useState<Record<string, string>>({})
  const [loadingTranslations, setLoadingTranslations] = useState(false)
  const translEpoch = useRef(0) // FIX P6: epoch prevents stale batch writes

  // Accuracy stats
  const [totalCaptions,   setTotalCaptions]   = useState(0)
  const [totalAccuracy,   setTotalAccuracy]   = useState(0)
  const [translErrors,    setTranslErrors]    = useState(0)

  // ── Inference-loop refs (FIX P2: keep all mutable loop state in refs — not closures)
  const videoRef        = useRef<HTMLVideoElement>(null)
  const canvasRef       = useRef<HTMLCanvasElement>(null)
  const rafRef          = useRef<number>(0)
  const streamRef       = useRef<MediaStream | null>(null)
  const landmarkerRef   = useRef<any>(null)
  const modelReadyRef   = useRef(false)           // FIX P7: track ready without state dep
  const sessionStart    = useRef<Date | null>(null)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const fpsFrame        = useRef(0)
  const lastFpsTime     = useRef(Date.now())
  // FIX P1+P3: improved buffer — only non-empty frames tracked; release guard
  const signBuffer      = useRef<string[]>([])    // last N non-empty frames
  const emptyCount      = useRef(0)               // consecutive empty frames
  const lastGestureOut  = useRef<string | null>(null)
  const lastGestureTs   = useRef(0)
  const gestureReleased = useRef(true)            // FIX P3: must release before re-fire
  const captionsEnd     = useRef<HTMLDivElement>(null)
  const libraryRef      = useRef<HTMLDivElement>(null)
  // Stable refs for loop — avoids closure rebuilding (FIX P2)
  const langMetaRef     = useRef(INDIAN_LANGUAGES[0])
  const sessionIdRef    = useRef<string | null>(null)
  const settingsRef     = useRef({ showSkeleton: true, confidenceThreshold: 0.6 })

  const langMeta     = useMemo(() =>
    INDIAN_LANGUAGES.find(l => l.code === settings.outputLanguage) ?? INDIAN_LANGUAGES[0],
    [settings.outputLanguage]
  )
  // Keep refs in sync so the inference loop never needs closure captures (FIX P2)
  useEffect(() => { langMetaRef.current = langMeta }, [langMeta])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
  useEffect(() => {
    settingsRef.current = {
      showSkeleton: settings.showSkeleton,
      confidenceThreshold: settings.confidenceThreshold,
    }
  }, [settings.showSkeleton, settings.confidenceThreshold])

  const avgAccuracy  = totalCaptions > 0
    ? Math.round((totalAccuracy / totalCaptions) * 100) : 0

  // FIX P6: epoch-based pre-translation prevents race conditions on language switch
  useEffect(() => {
    const epoch = ++translEpoch.current
    if (langMeta.apiCode === 'en') {
      const map: Record<string, string> = {}
      for (const g of GESTURE_LIBRARY_SLIM) map[g.name] = g.name
      setGestureTranslations(map)
      return
    }
    setLoadingTranslations(true)
    async function translateLibrary() {
      const map: Record<string, string> = {}
      const batch = 5
      for (let i = 0; i < GESTURE_LIBRARY_SLIM.length; i += batch) {
        if (translEpoch.current !== epoch) return // stale epoch — abort
        const slice = GESTURE_LIBRARY_SLIM.slice(i, i + batch)
        await Promise.all(slice.map(async (g) => {
          try {
            const { translated } = await translateText(g.name, langMeta.apiCode, 'en')
            map[g.name] = translated !== g.name ? translated : g.name
          } catch { map[g.name] = g.name }
        }))
      }
      if (translEpoch.current !== epoch) return // stale epoch — discard result
      setGestureTranslations(map)
      setLoadingTranslations(false)
    }
    translateLibrary()
  }, [langMeta.apiCode])

  // ── Auto-scroll library panel to active gesture card ───────────────────────
  useEffect(() => {
    if (!currentGesture || tab !== 'library') return
    const el = document.getElementById(`gesture-card-${currentGesture.replace(/[^a-z0-9]/gi, '-')}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentGesture, tab])

  // ── Camera sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (settings.cameraDeviceId) setSelectedDevId(settings.cameraDeviceId)
  }, [settings.cameraDeviceId])

  // FIX P9: remove selectedDevId from deps — it caused an infinite loop
  useEffect(() => {
    async function listDevices() {
      try {
        const tmp = await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null)
        const devs = await navigator.mediaDevices.enumerateDevices()
        const cams = devs.filter(d => d.kind === 'videoinput')
        setDevices(cams)
        if (cams.length) {
          setSelectedDevId(prev => prev || settings.cameraDeviceId || cams[0].deviceId)
        }
        tmp?.getTracks().forEach(t => t.stop())
      } catch { /* permissions not yet granted */ }
    }
    listDevices()
    navigator.mediaDevices.addEventListener('devicechange', listDevices)
    return () => navigator.mediaDevices.removeEventListener('devicechange', listDevices)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — only run on mount + device-change events

  // ── TTS sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    tts.configure({
      enabled: settings.ttsEnabled,
      rate:    settings.ttsRate,
      pitch:   settings.ttsPitch,
    })
  }, [settings.ttsEnabled, settings.ttsRate, settings.ttsPitch])

  // ── Scroll captions ────────────────────────────────────────────────────────
  useEffect(() => {
    captionsEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [captions])

  // FIX P7: modelState removed from deps — track readiness via ref instead of state
  const initMediaPipe = useCallback(async () => {
    if (modelReadyRef.current && landmarkerRef.current) return landmarkerRef.current
    setModelState('loading')
    try {
      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      const makeOpts = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate,
        },
        runningMode: 'VIDEO' as const,
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence:  0.5,
        minTrackingConfidence:      0.5,
      })
      let landmarkerInstance
      if (settings.gpuEnabled) {
        try {
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, makeOpts('GPU'))
        } catch {
          console.warn('[SignConnect] GPU delegate failed, falling back to CPU')
          landmarkerInstance = await HandLandmarker.createFromOptions(vision, makeOpts('CPU'))
        }
      } else {
        landmarkerInstance = await HandLandmarker.createFromOptions(vision, makeOpts('CPU'))
      }
      landmarkerRef.current = landmarkerInstance
      modelReadyRef.current = true
      setModelState('ready')
      return landmarkerInstance
    } catch (e) {
      console.error('MediaPipe error:', e)
      setModelState('failed')
      throw e
    }
  }, [settings.gpuEnabled]) // FIX P7: no modelState dep

  // FIX P8: stop old tracks BEFORE acquiring new stream to prevent leak
  const startCamera = useCallback(async () => {
    // Explicitly stop all tracks of the existing stream first
    const oldStream = streamRef.current
    if (oldStream) {
      oldStream.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraError(null)
    try {
      const videoConstraints: MediaTrackConstraints = selectedDevId
        ? { deviceId: { exact: selectedDevId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints })
      streamRef.current = stream
      setActiveStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await new Promise<void>(r => { videoRef.current!.onloadedmetadata = () => r() })
        await videoRef.current.play()
      }
    } catch (err: any) {
      console.error('Camera error:', err)
      let msg = 'Camera could not be accessed.'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
        msg = 'Camera permission required. Please enable camera access in your browser.'
      else if (err.name === 'NotFoundError')
        msg = 'No compatible camera detected.'
      else if (err.name === 'NotReadableError')
        msg = 'Camera is already in use by another application.'
      setCameraError(msg)
      toast.error(msg)
      throw err
    }
  }, [selectedDevId])

  // FIX P2+P10: emitCaption uses stable langMetaRef/sessionIdRef refs, not captured closures
  const emitCaption = useCallback(async (
    englishText: string,
    mode: 'gesture' | 'speech',
    gestureAcc: number,
    sourceLang = 'en'
  ) => {
    const meta    = langMetaRef.current
    const tgtCode = meta.apiCode
    let translated  = englishText
    let translConf  = 1.0
    if (tgtCode !== 'en') {
      const result = await translateText(englishText, tgtCode, 'en')
      translated  = result.translated
      translConf  = result.confidence
      if (result.translated === englishText) setTranslErrors(e => e + 1)
    }
    setCurrentTranslation(translated)
    const overall = +(Math.sqrt(gestureAcc * translConf)).toFixed(3)
    const cap: Caption = {
      id:              crypto.randomUUID(),
      inputMode:       mode,
      sourceText:      englishText,
      translatedText:  translated,
      sourceLang,
      targetLang:      meta.code,
      gestureAccuracy: gestureAcc,
      translationConf: translConf,
      overallScore:    overall,
      timestamp:       new Date(),
    }
    setCaptions(prev => [...prev.slice(-79), cap])
    setTotalCaptions(c => c + 1)
    setTotalAccuracy(a => a + overall)
    tts.speak(translated, meta.code)
    const sid = sessionIdRef.current
    if (sid) {
      saveTranscript({
        session_id: sid,
        text:       translated,
        confidence: overall,
        spoken_at:  new Date().toISOString(),
        language:   meta.code,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // FIX P2: no closure deps — reads from stable refs at call-time

  // FIX P1+P2+P3: Stable inference loop — reads from refs only, no closure state
  const inferenceLoop = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    const lander = landmarkerRef.current as {
      detectForVideo: (v: HTMLVideoElement, t: number) => {
        landmarks: Landmark[][]
        handedness: { categoryName: string }[][]
      }
    } | null

    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(inferenceLoop)
      return
    }
    if (canvas.width !== video.videoWidth) {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
    }
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // FPS counter
    fpsFrame.current++
    const now = Date.now()
    if (now - lastFpsTime.current >= 1000) {
      setFps(fpsFrame.current)
      fpsFrame.current = 0
      lastFpsTime.current = now
    }

    if (lander) {
      try {
        const result = lander.detectForVideo(video, performance.now())
        const HAND_COLORS: [string, string][] = [
          ['#f97316', '#fbbf24'],
          ['#3b82f6', '#60a5fa'],
        ]
        let detectedName: string | null = null
        let detectedConf = 0

        if (result.landmarks?.length > 0) {
          result.landmarks.forEach((lms, i) => {
            if (settingsRef.current.showSkeleton) {
              const [bone, joint] = HAND_COLORS[i % HAND_COLORS.length]
              drawHand(ctx, lms as Landmark[], canvas.width, canvas.height, bone, joint)
            }
            const gr = recognizeHandGesture(lms as Landmark[])
            if (gr && gr.confidence >= settingsRef.current.confidenceThreshold && gr.confidence > detectedConf) {
              detectedName = gr.sign
              detectedConf = gr.confidence
            }
          })
        }

        setCurrentGesture(detectedName)

        // FIX P1: separate sign buffer (non-empty only) from empty drain counter
        if (detectedName) {
          emptyCount.current = 0                              // reset empty drain
          gestureReleased.current = false                     // FIX P3: not yet released
          signBuffer.current.push(detectedName)
          if (signBuffer.current.length > 10) signBuffer.current.shift()

          const matchCount = signBuffer.current.filter(g => g === detectedName).length
          const stable = matchCount >= 7                      // 7/10 threshold

          if (matchCount >= 2 && matchCount < 7) {
            setStabilizingProgress({ gesture: detectedName, count: matchCount })
          } else {
            setStabilizingProgress(null)
          }

          const nowTime      = Date.now()
          const isNewGesture = detectedName !== lastGestureOut.current
          // FIX P3: repeat gesture only allowed after it was fully released (10+ empty frames)
          const canEmit = isNewGesture || (gestureReleased.current && nowTime - lastGestureTs.current > 1500)

          if (stable && canEmit) {
            lastGestureTs.current  = nowTime
            lastGestureOut.current = detectedName
            gestureReleased.current = false
            setStabilizingProgress(null)
            setGestureContext(detectedName) // FIX P5: update context for One/Yes disambiguation
            emitCaption(detectedName, 'gesture', detectedConf)
          }
        } else {
          // FIX P1+P3: track empty frames to know when gesture is "released"
          emptyCount.current++
          if (emptyCount.current >= 10) {
            gestureReleased.current = true   // can re-fire same gesture after release
            signBuffer.current = []          // clear sign buffer on sustained empty
          }
          setStabilizingProgress(null)
          if (emptyCount.current > 3) setCurrentTranslation(null)
        }
      } catch (e) {
        console.error('Inference error', e)
        setModelState('failed')
      }
    }
    rafRef.current = requestAnimationFrame(inferenceLoop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitCaption]) // FIX P2: only emitCaption (stable) in deps — no state reads

  // FIX P10: derive source lang from BCP-47 code for full consistency with stt.start()
  const toggleMic = useCallback(async () => {
    if (!stt.supported) { toast.error('Speech recognition not supported. Please use Chrome.'); return }
    if (micOn) { stt.stop(); setMicOn(false); setPartialSpeech(''); return }
    setMicOn(true)
    const bcp47Code = settings.outputLanguage  // e.g. 'hi-IN'
    // Extract ISO 639-1 code for translation API (e.g. 'hi' from 'hi-IN')
    const srcApiCode = bcp47Code.split('-')[0]
    stt.onError = (err: any) => {
      console.error('STT error:', err)
      setMicOn(false); setPartialSpeech('')
      toast.error(`Microphone error: ${err.error || 'could not access mic'}`)
    }
    const cb: STTCallback = async (transcript, isFinal) => {
      if (!isFinal) { setPartialSpeech(transcript); return }
      setPartialSpeech('')
      const english = srcApiCode !== 'en'
        ? await toEnglish(transcript, srcApiCode)
        : transcript
      await emitCaption(english, 'speech', 0.93, srcApiCode)
    }
    stt.start(bcp47Code, cb)
  }, [micOn, settings.outputLanguage, emitCaption])

  const startSession = useCallback(async () => {
    setCameraError(null)
    // FIX P7: use modelReadyRef instead of modelState
    if (!modelReadyRef.current || !landmarkerRef.current) {
      try { await initMediaPipe() } catch { return }
    }
    if (!landmarkerRef.current) return
    try { await startCamera() } catch { return }
    let sid = null
    try { sid = await createSession(settings.outputLanguage) } catch (err) {
      console.error('Supabase session error:', err)
    }
    setSessionId(sid)
    sessionIdRef.current = sid
    sessionStart.current = new Date()
    setElapsed(0)
    signBuffer.current     = []
    emptyCount.current     = 0
    gestureReleased.current = true
    lastGestureOut.current = null
    lastGestureTs.current  = 0
    setCurrentTranslation(null)
    setGestureContext(null)
    if (timerRef.current) clearInterval(timerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    rafRef.current   = requestAnimationFrame(inferenceLoop)
  }, [initMediaPipe, startCamera, settings.outputLanguage, inferenceLoop])

  const stopSession = useCallback(async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    stt.stop(); setMicOn(false); setPartialSpeech(''); tts.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null; setActiveStream(null)
    if (videoRef.current) videoRef.current.srcObject = null
    setCurrentGesture(null); setCurrentTranslation(null); setFps(0); setStabilizingProgress(null)
    if (sessionId && sessionStart.current) {
      const dur = Math.round((Date.now() - sessionStart.current.getTime()) / 1000)
      try { await endSession(sessionId, dur) } catch {}
    }
    setSessionId(null); sessionStart.current = null
  }, [sessionId])

  const handleToggle = useCallback(async () => {
    if (isRunning) { await stopSession(); setIsRunning(false) }
    else { setIsRunning(true); await startSession().catch(() => setIsRunning(false)) }
  }, [isRunning, startSession, stopSession])

  const swapCamera = useCallback(async (deviceId: string) => {
    setSelectedDevId(deviceId)
    settings.update({ cameraDeviceId: deviceId })
    if (isRunning) await startCamera()
  }, [isRunning, startCamera, settings])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const scoreColor = (v: number) =>
    v >= 0.85 ? 'text-green-600 bg-green-50 border-green-200'
    : v >= 0.7 ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
    : 'text-red-600 bg-red-50 border-red-200'

  // FIX P11: use GESTURE_LIBRARY_SLIM in the library panel (no diagram data needed)
  const libraryByCategory = useMemo(() => {
    const map: Record<string, GestureEntrySlim[]> = {}
    for (const g of GESTURE_LIBRARY_SLIM) {
      if (!map[g.category]) map[g.category] = []
      map[g.category].push(g)
    }
    return map
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden" style={{ touchAction: 'pan-y' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-base md:text-lg font-bold text-secondary leading-tight">Live Translation</h1>
            <p className="text-xs text-slate-400 hidden sm:block">ISL / Speech → {langMeta.label} ({langMeta.script})</p>
          </div>
          {isRunning && (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 font-medium text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
              Live
            </Badge>
          )}
          {modelState === 'loading' && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-xs">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading AI
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {devices.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <MonitorSpeaker className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedDevId}
                onChange={e => swapCamera(e.target.value)}
                className="text-xs bg-transparent text-slate-700 outline-none cursor-pointer max-w-[130px]"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Badge variant="outline" className="gap-1 font-medium text-xs">
            <Languages className="h-3 w-3 text-primary" />
            {langMeta.label}
          </Badge>
          <Link to="/app/settings">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8 px-2.5">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden overflow-y-auto md:overflow-hidden">

        {/* ── LEFT: Camera + controls ── */}
        <div className="flex flex-col gap-3 p-3 md:p-4 md:w-[50%] md:shrink-0 md:overflow-y-auto">

          {/* Camera */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800">
            <video
              ref={videoRef} autoPlay playsInline muted
              className={cn('absolute inset-0 w-full h-full object-cover', !isRunning && 'opacity-0')}
            />
            <canvas
              ref={canvasRef}
              className={cn('absolute inset-0 w-full h-full object-cover z-10 pointer-events-none', !isRunning && 'opacity-0')}
            />

            {!isRunning && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="p-4 rounded-full bg-slate-800 border border-slate-700">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <p className="text-slate-400 font-medium">Camera Ready</p>
                <p className="text-slate-600 text-xs text-center px-8">
                  Supports {GESTURE_LIBRARY_SLIM.length}+ ISL gestures + voice input.
                </p>
              </div>
            )}

            {modelState === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 z-20 gap-3">
                <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-sm font-medium">Loading AI Hand Model…</p>
                <p className="text-slate-400 text-xs">Downloading from Google CDN</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 z-20 gap-2 p-6 text-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <p className="text-red-200 font-semibold text-sm">{cameraError}</p>
                <Button size="sm" variant="outline" className="text-red-300 border-red-700 mt-2"
                  onClick={() => { setCameraError(null); startSession().catch(() => setIsRunning(false)) }}>
                  Retry
                </Button>
              </div>
            )}

            {/* ── Live Gesture + Translation Overlay ── */}
            {isRunning && currentGesture && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 min-w-[160px] max-w-[90%]">
                {/* Gesture name chip */}
                <div className="flex items-center gap-2 bg-black/75 backdrop-blur-sm border border-orange-500/60 rounded-xl px-4 py-2 shadow-lg shadow-orange-500/20">
                  <Hand className="h-4 w-4 text-orange-400 shrink-0 animate-bounce" />
                  <div className="flex flex-col items-center">
                    <span className="text-white font-bold text-sm leading-tight">{currentGesture}</span>
                    {/* Stabilizing bar */}
                    {stabilizingProgress && stabilizingProgress.gesture === currentGesture && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <div
                            key={k}
                            className={cn(
                              'w-3 h-1.5 rounded-full transition-all',
                              k < stabilizingProgress.count ? 'bg-orange-400' : 'bg-white/20'
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Translated text — shown when stable */}
                {currentTranslation && currentTranslation !== currentGesture && (
                  <div className="bg-primary/90 backdrop-blur-sm border border-orange-400/50 rounded-xl px-4 py-1.5 shadow-lg shadow-orange-500/30">
                    <p className="text-white font-extrabold text-base tracking-wide text-center leading-tight">
                      {currentTranslation}
                    </p>
                    <p className="text-orange-200 text-[10px] text-center mt-0.5">{langMeta.label}</p>
                  </div>
                )}
                {currentTranslation === currentGesture && (
                  <div className="bg-orange-600/90 backdrop-blur-sm border border-orange-400/50 rounded-xl px-4 py-1.5">
                    <p className="text-white font-bold text-sm text-center">{currentTranslation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Mic overlay */}
            {micOn && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-red-600/90 rounded-full px-3 py-1">
                <Mic className="h-3 w-3 text-white animate-pulse" />
                <span className="text-white text-xs font-medium">Mic Active</span>
              </div>
            )}

            {/* FPS badge */}
            {isRunning && (
              <div className="absolute top-3 right-3 z-20 bg-black/60 rounded-full px-2.5 py-0.5 text-xs text-white font-mono">
                {fps} fps
              </div>
            )}
          </div>

          {/* Partial speech preview */}
          {partialSpeech && (
            <div className="rounded-xl border border-dashed border-primary/40 bg-orange-50 p-3 flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary shrink-0" />
              <p className="text-primary text-sm italic truncate">{partialSpeech}…</p>
            </div>
          )}

          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Zap,       label: 'FPS',      value: fps },
              { icon: Hand,      label: 'Gesture',  value: currentGesture ?? '—' },
              { icon: Clock,     label: 'Time',     value: fmt(elapsed) },
              { icon: BarChart3, label: 'Accuracy', value: `${avgAccuracy}%` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-2.5 flex flex-col items-center gap-0.5 shadow-sm">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-base font-bold text-secondary truncate w-full text-center">{value}</span>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>

          {/* Control buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleToggle}
              disabled={modelState === 'loading'}
              size="lg"
              className={cn(
                'flex-1 rounded-xl font-bold gap-2 transition-all',
                isRunning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-primary hover:bg-orange-600 text-white hover:scale-[1.02]'
              )}
            >
              {modelState === 'loading'
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</>
                : isRunning
                ? <><Square className="h-4 w-4 fill-current" /> Stop</>
                : <><Camera className="h-4 w-4" /> Start Translating</>}
            </Button>

            <Button
              variant={micOn ? 'default' : 'outline'}
              size="lg"
              className={cn('rounded-xl gap-1.5 font-semibold',
                micOn && 'bg-red-600 hover:bg-red-700 text-white border-none animate-pulse'
              )}
              onClick={toggleMic}
              disabled={!isRunning}
              title="Toggle voice input"
            >
              {micOn ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {micOn ? 'Stop Mic' : 'Mic'}
            </Button>

            <Button
              variant="outline" size="lg" className="rounded-xl"
              onClick={() => settings.update({ ttsEnabled: !settings.ttsEnabled })}
              title={settings.ttsEnabled ? 'Mute' : 'Unmute'}
            >
              {settings.ttsEnabled
                ? <Volume2 className="h-4 w-4 text-secondary" />
                : <VolumeX className="h-4 w-4 text-slate-400" />}
            </Button>
          </div>

          {/* Pipeline info */}
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
            <ArrowRightLeft className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Input:</strong> ISL gesture / voice
              &nbsp;→&nbsp;<strong>English</strong>
              &nbsp;→&nbsp;<strong>{langMeta.label}</strong> output
            </span>
          </div>

          {/* Session Video Recorder */}
          <VideoRecorder stream={activeStream} />
        </div>

        {/* ── RIGHT: Tabs ── */}
        <div className="flex flex-col flex-1 border-t md:border-t-0 md:border-l border-slate-200 bg-white min-w-0 min-h-[340px] md:min-h-0">

          {/* Tab bar */}
          <div className="flex border-b border-slate-200 shrink-0">
            {([
              { id: 'captions',  label: 'Caption Feed',    icon: Languages },
              { id: 'library',   label: `Gesture Library (${GESTURE_LIBRARY_SLIM.length})`, icon: BookOpen },
              { id: 'accuracy',  label: 'Accuracy',        icon: BarChart3 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-secondary'
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
            {captions.length > 0 && tab === 'captions' && (
              <button
                className="ml-auto mr-3 text-xs text-slate-400 hover:text-red-500 transition-colors"
                onClick={() => setCaptions([])}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── Tab: Caption Feed ── */}
          {tab === 'captions' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {captions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16 text-slate-400">
                  <Hand className="h-12 w-12 mb-4 text-slate-200" />
                  <p className="font-semibold">No captions yet</p>
                  <p className="text-xs mt-1">Show a hand gesture or speak into the microphone.</p>
                </div>
              )}

              {captions.map(c => (
                <div key={c.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className={cn('text-xs gap-1 shrink-0',
                      c.inputMode === 'speech' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-200 text-orange-700 bg-orange-50'
                    )}>
                      {c.inputMode === 'speech' ? <Mic className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                      {c.inputMode}
                    </Badge>
                    <span className="text-xs text-slate-400 shrink-0">{c.timestamp.toLocaleTimeString()}</span>
                  </div>

                  {/* Translated text — large and prominent */}
                  <p className="text-secondary font-extrabold text-xl leading-snug">{c.translatedText}</p>

                  {/* English source */}
                  {c.translatedText !== c.sourceText && (
                    <p className="text-slate-400 text-sm mt-1 italic">"{c.sourceText}" (English)</p>
                  )}

                  {/* Scores */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className={cn('text-xs', scoreColor(c.overallScore))}>
                      Overall {Math.round(c.overallScore * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                      Gesture {Math.round(c.gestureAccuracy * 100)}%
                    </Badge>
                    <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                      Translation {Math.round(c.translationConf * 100)}%
                    </Badge>
                  </div>
                </div>
              ))}
              <div ref={captionsEnd} />
            </div>
          )}

          {/* ── Tab: Gesture Library ── */}
          {tab === 'library' && (
            <div ref={libraryRef} className="flex-1 overflow-y-auto p-3 space-y-4">
              {loadingTranslations && (
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg p-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  Translating gesture names to {langMeta.label}…
                </div>
              )}

              {Object.entries(libraryByCategory).map(([category, gestures]) => (
                <div key={category}>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">{category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {gestures.map(g => {
                      const isActive = currentGesture === g.name
                      const translated = gestureTranslations[g.name]
                      const cardId = `gesture-card-${g.name.replace(/[^a-z0-9]/gi, '-')}`
                      return (
                        <div
                          id={cardId}
                          key={g.name}
                          className={cn(
                            'rounded-xl border p-3 transition-all duration-200',
                            isActive
                              ? 'border-orange-400 bg-orange-50 shadow-md shadow-orange-200 scale-[1.02]'
                              : 'border-slate-100 bg-white hover:border-slate-300'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-2xl">{g.emoji}</span>
                            {isActive && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {/* English sign name */}
                          <p className="text-xs font-bold text-secondary leading-tight">{g.name}</p>
                          {/* Translated name — the exact translation in chosen language */}
                          {translated && translated !== g.name && (
                            <p className={cn(
                              'text-sm font-extrabold mt-0.5 leading-tight',
                              isActive ? 'text-orange-700' : 'text-primary'
                            )}>
                              {translated}
                            </p>
                          )}
                          {(!translated || translated === g.name) && (
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{g.name}</p>
                          )}
                          {/* Gesture hint */}
                          <p className="text-[10px] text-slate-400 mt-1 leading-snug">{g.description}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Accuracy report ── */}
          {tab === 'accuracy' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Captions',     value: totalCaptions, icon: Activity, color: 'text-primary' },
                  { label: 'Avg. Overall Score', value: `${avgAccuracy}%`, icon: BarChart3, color: 'text-green-600' },
                  { label: 'Session Duration',   value: fmt(elapsed), icon: Clock, color: 'text-blue-600' },
                  { label: 'Translation Errors', value: translErrors, icon: Wifi, color: 'text-red-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <Icon className={cn('h-6 w-6 mb-3', color)} />
                    <p className="text-3xl font-extrabold text-secondary">{value}</p>
                    <p className="text-sm text-slate-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {captions.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="font-semibold text-secondary mb-4 text-sm">Per-Caption Breakdown</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...captions].reverse().map(c => (
                      <div key={c.id} className="flex items-center gap-3 text-xs">
                        <span className="w-16 text-slate-400 shrink-0">{c.timestamp.toLocaleTimeString()}</span>
                        <Badge variant="outline" className={cn('shrink-0', c.inputMode === 'speech'
                          ? 'border-blue-200 text-blue-600' : 'border-orange-200 text-orange-600'
                        )}>
                          {c.inputMode === 'speech' ? '🎤' : '🖐️'}
                        </Badge>
                        <span className="flex-1 truncate text-secondary font-medium">{c.translatedText}</span>
                        <span className={cn('font-bold shrink-0', c.overallScore >= 0.85
                          ? 'text-green-600' : c.overallScore >= 0.7 ? 'text-yellow-600' : 'text-red-500'
                        )}>
                          {Math.round(c.overallScore * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {captions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-center">
                  <BarChart3 className="h-12 w-12 mb-4 text-slate-200" />
                  <p className="font-semibold">No data yet</p>
                  <p className="text-xs mt-1">Start a session to see accuracy metrics.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
