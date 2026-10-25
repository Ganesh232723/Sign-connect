/**
 * Translation Service — Dual-engine (MyMemory + Lingva fallback)
 *
 * Pipeline:
 *   Any Indian Language → English (normalisation)
 *   English → Any Target Language
 *
 * No API key required.
 */

const MYMEMORY = 'https://api.mymemory.translated.net/get'
const LINGVA   = 'https://lingva.ml/api/v1'

// ─── Core translate helper ─────────────────────────────────────────────────
async function callMyMemory(text: string, src: string, tgt: string): Promise<string | null> {
  try {
    const url = `${MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}&de=signconnect@app.local`
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const json = await res.json()
    const out: string = json?.responseData?.translatedText
    if (!out || out.toUpperCase() === text.toUpperCase()) return null
    return out
  } catch {
    return null
  }
}

async function callLingva(text: string, src: string, tgt: string): Promise<string | null> {
  try {
    const url = `${LINGVA}/${src}/${tgt}/${encodeURIComponent(text)}`
    const res  = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const json = await res.json()
    return (json?.translation as string) ?? null
  } catch {
    return null
  }
}

/**
 * Translate text from any language to any other language.
 * Automatically handles Indian language → English → target pipeline.
 *
 * @param text       Source text
 * @param targetCode 2-letter ISO code  e.g. "hi", "ta", "en"
 * @param sourceCode 2-letter ISO code  e.g. "en" (default) or "hi"
 */
export async function translateText(
  text: string,
  targetCode: string,
  sourceCode = 'en'
): Promise<{ translated: string; confidence: number }> {
  const src = sourceCode.split('-')[0].toLowerCase()
  const tgt = targetCode.split('-')[0].toLowerCase()

  if (!text.trim()) return { translated: text, confidence: 1 }
  if (src === tgt)  return { translated: text, confidence: 1 }

  // Try MyMemory first, then Lingva as fallback
  const translated =
    (await callMyMemory(text, src, tgt)) ??
    (await callLingva(text, src, tgt))   ??
    text   // graceful passthrough

  const confidence = translated !== text ? 0.92 : 0.5
  return { translated, confidence }
}

/**
 * Normalise spoken Indian-language text to English.
 * Used when the user speaks in Hindi/Tamil/etc. and we need English first.
 */
export async function toEnglish(
  text: string,
  sourceCode: string
): Promise<string> {
  if (sourceCode === 'en' || sourceCode.startsWith('en-')) return text
  const { translated } = await translateText(text, 'en', sourceCode)
  return translated
}
