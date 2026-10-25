/**
 * Unified TTS Service — respects user rate/pitch settings
 * and selects the best available voice for each language.
 */
export class TTSService {
  private synth: SpeechSynthesis
  private isEnabled = true
  private rate      = 1.0
  private pitch     = 1.0

  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null as unknown as SpeechSynthesis
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.getVoices()
      speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices())
    }
  }

  public configure(opts: { enabled?: boolean; rate?: number; pitch?: number }) {
    if (opts.enabled !== undefined) this.isEnabled = opts.enabled
    if (opts.rate    !== undefined) this.rate      = opts.rate
    if (opts.pitch   !== undefined) this.pitch     = opts.pitch
  }

  /** @deprecated use configure() */
  public setEnabled(v: boolean) { this.isEnabled = v }

  public speak(text: string, lang = 'en-US') {
    if (!this.isEnabled || !this.synth || !text.trim()) return
    this.synth.cancel()

    const utterance  = new SpeechSynthesisUtterance(text)
    utterance.lang   = lang
    utterance.rate   = this.rate
    utterance.pitch  = this.pitch

    const voices     = this.synth.getVoices()
    const langBase   = lang.split('-')[0]
    const voice =
      voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(langBase)) ||
      voices[0]
    if (voice) utterance.voice = voice

    this.synth.speak(utterance)
  }

  public stop() { this.synth?.cancel() }
}

export const tts = new TTSService()

// ─── Speech Recognition (STT) ────────────────────────────────────────────────
export type STTCallback = (transcript: string, isFinal: boolean) => void

interface IWindow extends Window {
  webkitSpeechRecognition?: any
  SpeechRecognition?: any
}

export class STTService {
  private recognition: any = null
  private onResult: STTCallback | null = null
  public onError: ((err: any) => void) | null = null
  private isListening = false
  private _shouldRestart = false

  constructor() {
    if (typeof window === 'undefined') return
    const win = window as unknown as IWindow
    const SpeechRec = win.webkitSpeechRecognition || win.SpeechRecognition

    if (!SpeechRec) return

    this.recognition = new SpeechRec()
    this.recognition.continuous = true
    this.recognition.interimResults = true

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (this.onResult) {
          this.onResult(r[0].transcript, r.isFinal)
        }
      }
    }
    this.recognition.onerror = (e: any) => {
      console.error('STT error:', e.error)
      if (this.onError) this.onError(e)
    }
    this.recognition.onend = () => {
      this.isListening = false
      if (this.recognition && this._shouldRestart) {
        try { this.recognition.start() } catch { /* ignore */ }
      }
    }
  }

  public start(lang: string, cb: STTCallback) {
    if (!this.recognition) return
    this.onResult = cb
    this._shouldRestart = true
    this.recognition.lang = lang
    try { this.recognition.start(); this.isListening = true } catch { /* already started */ }
  }

  public stop() {
    this._shouldRestart = false
    this.recognition?.stop()
    this.isListening = false
  }

  public get active() { return this.isListening }
  public get supported() { return this.recognition !== null }
}

export const stt = new STTService()
