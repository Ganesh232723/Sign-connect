import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// All 22 Scheduled Languages of India + English
export interface Language {
  code: string      // BCP-47 tag for TTS
  apiCode: string   // 2-letter code for translation API
  label: string
  script: string
}

export const INDIAN_LANGUAGES: Language[] = [
  { code: 'en-US',  apiCode: 'en', label: 'English',    script: 'Latin'    },
  { code: 'hi-IN',  apiCode: 'hi', label: 'Hindi',      script: 'Devanagari' },
  { code: 'mr-IN',  apiCode: 'mr', label: 'Marathi',    script: 'Devanagari' },
  { code: 'gu-IN',  apiCode: 'gu', label: 'Gujarati',   script: 'Gujarati' },
  { code: 'pa-IN',  apiCode: 'pa', label: 'Punjabi',    script: 'Gurmukhi' },
  { code: 'ta-IN',  apiCode: 'ta', label: 'Tamil',      script: 'Tamil'    },
  { code: 'te-IN',  apiCode: 'te', label: 'Telugu',     script: 'Telugu'   },
  { code: 'kn-IN',  apiCode: 'kn', label: 'Kannada',    script: 'Kannada'  },
  { code: 'ml-IN',  apiCode: 'ml', label: 'Malayalam',  script: 'Malayalam'},
  { code: 'or-IN',  apiCode: 'or', label: 'Odia',       script: 'Odia'     },
  { code: 'as-IN',  apiCode: 'as', label: 'Assamese',   script: 'Bengali'  },
  { code: 'bn-IN',  apiCode: 'bn', label: 'Bengali',    script: 'Bengali'  },
  { code: 'ur-IN',  apiCode: 'ur', label: 'Urdu',       script: 'Nastaliq' },
  { code: 'ne-NP',  apiCode: 'ne', label: 'Nepali',     script: 'Devanagari' },
  { code: 'ks-IN',  apiCode: 'ks', label: 'Kashmiri',   script: 'Perso-Arabic' },
  { code: 'sd-IN',  apiCode: 'sd', label: 'Sindhi',     script: 'Devanagari' },
  { code: 'sa-IN',  apiCode: 'sa', label: 'Sanskrit',   script: 'Devanagari' },
  { code: 'kok-IN', apiCode: 'kok',label: 'Konkani',    script: 'Devanagari' },
  { code: 'doi-IN', apiCode: 'doi',label: 'Dogri',      script: 'Devanagari' },
  { code: 'mai-IN', apiCode: 'mai',label: 'Maithili',   script: 'Devanagari' },
  { code: 'mni-IN', apiCode: 'mni',label: 'Meitei',     script: 'Meitei Mayek' },
  { code: 'sat-IN', apiCode: 'sat',label: 'Santali',    script: 'Ol Chiki' },
  { code: 'bo-IN',  apiCode: 'bo', label: 'Bodo',       script: 'Devanagari' },
]

export type OutputLanguage = typeof INDIAN_LANGUAGES[number]['code']

export interface AppSettings {
  outputLanguage: OutputLanguage
  ttsEnabled: boolean
  ttsRate: number
  ttsPitch: number
  confidenceThreshold: number
  highContrast: boolean
  showSkeleton: boolean
  cameraDeviceId: string | null
  gpuEnabled: boolean
  modelMode: 'high_precision' | 'balanced' | 'fast'
}

interface SettingsStore extends AppSettings {
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
}

const DEFAULTS: AppSettings = {
  outputLanguage: 'en-US',
  ttsEnabled: true,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  confidenceThreshold: 0.6,
  highContrast: false,
  showSkeleton: true,
  cameraDeviceId: null,
  gpuEnabled: true,
  modelMode: 'high_precision',
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      update: (patch) => set((s) => ({ ...s, ...patch })),
      reset: () => set(DEFAULTS),
    }),
    { name: 'signconnect-settings' }
  )
)
