/**
 * ══════════════════════════════════════════════════════════════════
 *  Universal Hand Gesture Recognition Engine — v4.0
 *  "Detect what humans naturally do, translate it instantly"
 * ══════════════════════════════════════════════════════════════════
 *
 *  Detects UNIVERSAL everyday gestures (no ISL training needed).
 *  Everyone already knows these — thumbs up, wave, point, OK, etc.
 *
 *  Detection priority:
 *    1. User's saved custom gestures  (landmark similarity)
 *    2. Universal hand-shape rules    (geometry + distance)
 *
 *  Each recognized sign is an English phrase that is then
 *  translated to any of 22+ Indian languages automatically.
 * ══════════════════════════════════════════════════════════════════
 */

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface Landmark {
  x: number; y: number; z: number; visibility?: number
}

export interface CustomGesture {
  id: string
  name: string
  category: string
  landmarks: Landmark[]
  createdAt: string
}

/** Full gesture entry — used by GestureManager for diagram + steps */
export interface GestureEntry {
  name: string
  emoji: string
  category: string
  description: string
  steps: string[]
  fingerState: {
    thumb: boolean | 'side'
    index: boolean | 'bent'
    middle: boolean | 'bent'
    ring: boolean | 'bent'
    pinky: boolean | 'bent'
  }
  autoDetected: boolean
}

/** Slim entry — only what LiveTranslation needs (no steps/fingerState) */
export interface GestureEntrySlim {
  name: string
  emoji: string
  category: string
  description: string
  autoDetected: boolean
}

// ─── The Universal Gesture Library ─────────────────────────────────────────────
// Only gestures that are NATURALLY UNDERSTOOD by everyone
// and can be RELIABLY detected from hand shape alone.
export const GESTURE_LIBRARY: GestureEntry[] = [

  // ── GREETINGS ─────────────────────────────────────────────────────────────
  {
    name: 'Hello',
    emoji: '👋',
    category: 'Greetings',
    description: 'Open hand, all fingers spread wide — wave it!',
    steps: ['Hold your hand up', 'Spread all 5 fingers wide open', 'Wave side to side'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Namaste',
    emoji: '🙏',
    category: 'Greetings',
    description: 'All 5 fingers open, palm facing forward — steady hold',
    steps: ['Hold hand up at shoulder height', 'Open all 5 fingers', 'Keep palm flat facing the person'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Thank You',
    emoji: '🙏',
    category: 'Greetings',
    description: 'Flat open hand at chin, move it forward away from face',
    steps: ['Touch flat hand to chin', 'Move hand straight forward', 'Open palm stays flat'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false, // motion-based — save as custom
  },
  {
    name: 'I Love You',
    emoji: '🤟',
    category: 'Greetings',
    description: 'Thumb + index + pinky extended at the same time',
    steps: ['Curl middle and ring fingers down', 'Keep thumb, index, and pinky up', 'Hold toward the person'],
    fingerState: { thumb: 'side', index: true, middle: false, ring: false, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Peace',
    emoji: '✌️',
    category: 'Greetings',
    description: 'Index + middle fingers in a V-shape, spread apart',
    steps: ['Curl ring and pinky down', 'Keep index and middle up', 'Spread them apart into a V'],
    fingerState: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Goodbye',
    emoji: '🫡',
    category: 'Greetings',
    description: 'Open hand waving — same as Hello but with intent to leave',
    steps: ['Open all fingers wide', 'Raise hand to eye level', 'Wave side to side'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false, // same shape as Hello — save as custom
  },

  // ── YES / NO / BASIC ──────────────────────────────────────────────────────
  {
    name: 'Yes',
    emoji: '☝️',
    category: 'Basic',
    description: 'Only index finger pointing straight up',
    steps: ['Curl all fingers into fist', 'Extend only the index finger upward', 'Keep it pointing straight up'],
    fingerState: { thumb: false, index: true, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'No',
    emoji: '🚫',
    category: 'Basic',
    description: 'Closed fist, thumb sticking out sideways across palm',
    steps: ['Make a fist with all 4 fingers', 'Extend thumb out sideways', 'Keep all 4 fingers curled in'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Good',
    emoji: '👍',
    category: 'Basic',
    description: 'Thumbs up — thumb pointing up, all fingers curled',
    steps: ['Curl all 4 fingers tightly into palm', 'Point thumb straight up', 'Hold firmly'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Bad',
    emoji: '👎',
    category: 'Basic',
    description: 'Thumbs down — thumb pointing downward',
    steps: ['Curl all 4 fingers into fist', 'Point thumb downward toward floor', 'Hold steady'],
    fingerState: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Okay',
    emoji: '👌',
    category: 'Basic',
    description: 'Thumb and index tip touching to form a circle, other fingers relaxed',
    steps: ['Touch thumb tip to index fingertip', 'Form a circle/O shape', 'Other 3 fingers can be loose or up'],
    fingerState: { thumb: 'side', index: 'bent', middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Stop',
    emoji: '✋',
    category: 'Basic',
    description: 'All 4 fingers up, thumb tucked — firm outward palm',
    steps: ['Hold all 4 fingers straight up', 'Tuck thumb slightly inward', 'Face palm outward toward the person'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Come',
    emoji: '🫴',
    category: 'Basic',
    description: 'Index + pinky up, middle + ring curled — no thumb',
    steps: ['Curl middle and ring fingers down', 'Keep index and pinky pointing up', 'Curl thumb in too'],
    fingerState: { thumb: false, index: true, middle: false, ring: false, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Go Away',
    emoji: '🫸',
    category: 'Basic',
    description: 'All 4 fingers grouped together, thumb extended out sideways',
    steps: ['Press all 4 fingers tightly together pointing up', 'Push thumb out sideways', 'Push hand forward'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Quiet',
    emoji: '🤫',
    category: 'Basic',
    description: 'Only pinky finger extended up, others closed',
    steps: ['Make a fist', 'Extend only the pinky (little finger) upward', 'Others stay curled'],
    fingerState: { thumb: false, index: false, middle: false, ring: false, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Promise',
    emoji: '🤞',
    category: 'Basic',
    description: 'Index and middle fingers crossed tightly',
    steps: ['Extend index and middle fingers', 'Cross index over middle (or under)', 'Keep other fingers down'],
    fingerState: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Sorry',
    emoji: '🙇',
    category: 'Basic',
    description: 'Closed fist, no thumb, palm inward facing yourself',
    steps: ['Curl all 4 fingers into a fist', 'Keep thumb tucked alongside (not up, not down)', 'Hold fist at chest level, palm facing you'],
    fingerState: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'What?',
    emoji: '🤌',
    category: 'Basic',
    description: 'All fingertips bunched together pointing upward',
    steps: ['Bring all 4 fingertips together with thumb', 'Point the bunched tips upward', 'Shake slightly up and down'],
    fingerState: { thumb: 'side', index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
    autoDetected: true,
  },
  {
    name: 'Finished',
    emoji: '🏁',
    category: 'Basic',
    description: 'All 4 fingers flat forward, very close together, pointing ahead',
    steps: ['Extend all 4 fingers straight', 'Keep them pressed close together flat', 'Point them forward — not up'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },

  // ── NEEDS ─────────────────────────────────────────────────────────────────
  {
    name: 'Water',
    emoji: '💧',
    category: 'Needs',
    description: 'Thumb + index + middle extended forming a W shape',
    steps: ['Keep ring and pinky curled down', 'Extend thumb, index, and middle together', 'Tap toward lips twice'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Food',
    emoji: '🍛',
    category: 'Needs',
    description: 'All fingertips bunched together, tips pointing DOWN toward mouth',
    steps: ['Bunch all fingertips together tightly', 'Point the tips downward/toward mouth', 'Tap toward mouth 2–3 times'],
    fingerState: { thumb: 'side', index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
    autoDetected: true,
  },
  {
    name: 'Help Me',
    emoji: '🆘',
    category: 'Needs',
    description: 'All 4 fingers spread up, thumb tucked — wave urgently',
    steps: ['Extend all 4 fingers upward firmly', 'Keep thumb folded in', 'Wave hand urgently side to side'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Pain',
    emoji: '💥',
    category: 'Needs',
    description: 'All fingers clawed / curved inward like grabbing something',
    steps: ['Spread all fingers out', 'Bend each finger at the middle joint (not fully curled)', 'Point clawed hand at area of pain'],
    fingerState: { thumb: 'side', index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
    autoDetected: true,
  },
  {
    name: 'Tired',
    emoji: '😮‍💨',
    category: 'Needs',
    description: 'All 4 fingers pointing DOWNWARD below the wrist',
    steps: ['Extend all fingers', 'Rotate wrist so fingers point toward the floor', 'All tips below wrist level'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Money',
    emoji: '💰',
    category: 'Needs',
    description: 'Thumb rubbing back and forth against index fingertip',
    steps: ['Curl ring and pinky down', 'Touch thumb tip to index tip', 'Rub thumb forward and back (rubbing motion)'],
    fingerState: { thumb: 'side', index: 'bent', middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Mobile Phone',
    emoji: '📱',
    category: 'Needs',
    description: 'Thumb + pinky extended (Y-shape), held to ear',
    steps: ['Curl index, middle, ring fingers inward', 'Extend thumb and pinky only', 'Hold to side of head like a phone'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Sleep',
    emoji: '😴',
    category: 'Needs',
    description: 'Closed fist facing down — hand drooping downward',
    steps: ['Curl all fingers into a fist', 'Let the fist hang downward (wrist bent down)', 'MCP knuckles higher than fingertips'],
    fingerState: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },

  // ── NUMBERS ───────────────────────────────────────────────────────────────
  {
    name: 'Zero',
    emoji: '0️⃣',
    category: 'Numbers',
    description: 'Thumb + index forming a tight O-circle, others curled',
    steps: ['Curl all 4 fingers inward', 'Touch thumb tip to index tip forming a circle', 'Very tight, small circle'],
    fingerState: { thumb: 'side', index: 'bent', middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'One',
    emoji: '1️⃣',
    category: 'Numbers',
    description: 'Only index finger up',
    steps: ['Curl thumb and other fingers in', 'Raise only index finger straight up'],
    fingerState: { thumb: false, index: true, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Two',
    emoji: '2️⃣',
    category: 'Numbers',
    description: 'Index + middle up, held close together',
    steps: ['Keep index and middle close (not spread apart)', 'Curl other fingers in', 'Both tips at same height'],
    fingerState: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Three',
    emoji: '3️⃣',
    category: 'Numbers',
    description: 'Index + middle + ring extended',
    steps: ['Curl pinky and thumb in', 'Raise index, middle, and ring fingers together'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Four',
    emoji: '4️⃣',
    category: 'Numbers',
    description: 'All 4 fingers up, thumb folded in',
    steps: ['Fold thumb tightly across palm', 'Extend all 4 fingers straight up'],
    fingerState: { thumb: false, index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Five',
    emoji: '5️⃣',
    category: 'Numbers',
    description: 'All 5 fingers wide open and spread apart',
    steps: ['Open all 5 fingers fully', 'Spread them as wide as possible', 'Palm facing forward'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Six',
    emoji: '6️⃣',
    category: 'Numbers',
    description: 'Thumb + pinky extended, middle three fingers folded',
    steps: ['Curl index, middle, ring fingers down', 'Extend thumb out sideways', 'Extend pinky up'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: true },
    autoDetected: true,
  },
  {
    name: 'Seven',
    emoji: '7️⃣',
    category: 'Numbers',
    description: 'Thumb + ring finger extended, others folded',
    steps: ['Curl index, middle, pinky fingers', 'Extend thumb sideways', 'Extend ring finger upward'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: true, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Eight',
    emoji: '8️⃣',
    category: 'Numbers',
    description: 'Thumb + middle finger extended, others folded',
    steps: ['Curl index, ring, pinky fingers', 'Extend thumb sideways', 'Extend middle finger upward'],
    fingerState: { thumb: 'side', index: false, middle: true, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Nine',
    emoji: '9️⃣',
    category: 'Numbers',
    description: 'Thumb + index almost touching (slightly open O), others free',
    steps: ['Curl middle, ring, pinky slightly', 'Bring thumb and index close but not touching', 'Small gap between them'],
    fingerState: { thumb: 'side', index: 'bent', middle: false, ring: false, pinky: false },
    autoDetected: true,
  },
  {
    name: 'Ten',
    emoji: '🔟',
    category: 'Numbers',
    description: 'Thumb up with hand shaking (closed fist, thumb up)',
    steps: ['Close all fingers into a fist', 'Raise thumb straight up', 'Shake hand side to side gently'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: false },
    autoDetected: true,
  },

  // ── COMPLEX / CUSTOM-SAVE SIGNS ───────────────────────────────────────────
  {
    name: 'Mother',
    emoji: '👩',
    category: 'Family',
    description: 'Open A-hand (thumb up, fingers curled) — thumb touches chin',
    steps: ['Curl fingers, thumb pointing up', 'Tap thumb to your chin twice', 'Body context: near lower face'],
    fingerState: { thumb: 'side', index: false, middle: false, ring: false, pinky: false },
    autoDetected: false,
  },
  {
    name: 'Father',
    emoji: '👨',
    category: 'Family',
    description: 'Open-B hand — thumb touches forehead',
    steps: ['Spread all 5 fingers open', 'Touch thumb to your forehead', 'Hand at forehead level'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false,
  },
  {
    name: 'Doctor',
    emoji: '🩺',
    category: 'Family',
    description: 'D-shape hand tapping inside of opposite wrist',
    steps: ['Form D with index up, others curled', 'Tap index finger to inner wrist twice', 'Like checking pulse'],
    fingerState: { thumb: false, index: true, middle: false, ring: false, pinky: false },
    autoDetected: false,
  },
  {
    name: 'Home',
    emoji: '🏠',
    category: 'Travel',
    description: 'Flat-O hand moves from cheek to side (touching face)',
    steps: ['Bunch all fingertips together', 'Touch to cheek', 'Move hand outward to side'],
    fingerState: { thumb: 'side', index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
    autoDetected: false,
  },
  {
    name: 'School',
    emoji: '🏫',
    category: 'Travel',
    description: 'Clap flat hands twice quickly',
    steps: ['Hold both hands flat open', 'Clap them together twice firmly', 'Like a teacher clapping for attention'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false,
  },
  {
    name: 'Hospital',
    emoji: '🏥',
    category: 'Travel',
    description: 'H-shape hand draws cross on upper arm',
    steps: ['Extend index + middle together', 'Draw a + cross on your upper arm', 'Like drawing the Red Cross symbol'],
    fingerState: { thumb: false, index: true, middle: true, ring: false, pinky: false },
    autoDetected: false,
  },
  {
    name: 'Happy',
    emoji: '😊',
    category: 'Emotions',
    description: 'Flat hands brush upward on chest twice (joy rising)',
    steps: ['Place open palms on chest', 'Brush upward toward shoulders twice', 'Quick, light brushing motion'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false,
  },
  {
    name: 'Sad',
    emoji: '😢',
    category: 'Emotions',
    description: 'Both hands pull slowly downward past face',
    steps: ['Hold both open hands at eye level', 'Slowly lower hands past your face', 'Like wiping tears downward'],
    fingerState: { thumb: 'side', index: true, middle: true, ring: true, pinky: true },
    autoDetected: false,
  },
  {
    name: 'Angry',
    emoji: '😠',
    category: 'Emotions',
    description: 'Curved/clawed fingers at face, pulled sharply outward',
    steps: ['Claw both hands in front of face', 'Pull hands sharply away from face', 'Tense, quick motion'],
    fingerState: { thumb: 'side', index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' },
    autoDetected: false,
  },
]

// ─── Slim library slice for LiveTranslation (no heavy diagram data) ────────────
export const GESTURE_LIBRARY_SLIM: GestureEntrySlim[] = GESTURE_LIBRARY.map(
  ({ name, emoji, category, description, autoDetected }) =>
    ({ name, emoji, category, description, autoDetected })
)

// ─── Context ref for One/Yes disambiguation ──────────────────────────────────
// When the last confirmed caption was a number, prefer 'One' over 'Yes'
let _lastContextSign: string | null = null
export function setGestureContext(sign: string | null) { _lastContextSign = sign }

// ─── Local Storage for Custom Gestures ─────────────────────────────────────────
const STORAGE_KEY = 'signconnect_custom_gestures'
let cachedCustomGestures: CustomGesture[] | null = null
let lastCacheTime = 0

export function getCustomGestures(): CustomGesture[] {
  if (typeof window === 'undefined') return []
  const now = Date.now()
  if (cachedCustomGestures && now - lastCacheTime < 2000) return cachedCustomGestures
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cachedCustomGestures = raw ? JSON.parse(raw) : []
    lastCacheTime = now
    return cachedCustomGestures!
  } catch { return [] }
}

export function saveCustomGesture(name: string, category: string, landmarks: Landmark[]): CustomGesture {
  const existing = getCustomGestures()
  const ng: CustomGesture = {
    id: `g-${Date.now()}`, name: name.trim(), category,
    landmarks: landmarks.slice(0, 21),
    createdAt: new Date().toLocaleDateString()
  }
  const updated = [...existing, ng]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  cachedCustomGestures = updated; lastCacheTime = Date.now()
  return ng
}

export function deleteCustomGesture(id: string) {
  const updated = getCustomGestures().filter(g => g.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  cachedCustomGestures = updated; lastCacheTime = Date.now()
}

// ─── Geometry Helpers ───────────────────────────────────────────────────────────
function dist(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)
}

/** Finger extended: tip is clearly above PIP AND MCP→TIP > MCP→PIP×0.8 */
function ext(lms: Landmark[], tip: number, pip: number, mcp: number): boolean {
  return lms[tip].y < lms[pip].y &&
    dist(lms[mcp], lms[tip]) > dist(lms[mcp], lms[pip]) * 0.8
}

/** Finger clearly curled (tip below PIP with margin) */
function curl(lms: Landmark[], tip: number, pip: number): boolean {
  return lms[tip].y > lms[pip].y + 0.02
}

/** Thumb extended to the side */
function thumbSide(lms: Landmark[]): boolean {
  return Math.abs(lms[4].x - lms[3].x) > 0.05
}

/** Thumb pointing downward below wrist */
function thumbDown(lms: Landmark[]): boolean {
  return lms[4].y > lms[0].y + 0.05
}

/** Fingertip is below the wrist */
function tipBelow(lms: Landmark[], tip: number): boolean {
  return lms[tip].y > lms[0].y
}

/** All 4 fingers curled tightly */
function allCurled(lms: Landmark[]): boolean {
  return curl(lms,8,6) && curl(lms,12,10) && curl(lms,16,14) && curl(lms,20,18)
}


/** Fingertips bunched tightly into a pinch point */
function bunched(lms: Landmark[]): boolean {
  const cx = (lms[8].x + lms[12].x + lms[16].x + lms[20].x) / 4
  const cy = (lms[8].y + lms[12].y + lms[16].y + lms[20].y) / 4
  const c: Landmark = { x: cx, y: cy, z: 0 }
  return dist(lms[8],c)<0.07 && dist(lms[12],c)<0.07 && dist(lms[16],c)<0.07 && dist(lms[20],c)<0.07
}

/** Distance between thumb tip and index tip */
function tiD(lms: Landmark[]): number { return dist(lms[4], lms[8]) }

/** Spread between adjacent fingertips */
function spread(lms: Landmark[]): number {
  return (dist(lms[8],lms[12]) + dist(lms[12],lms[16]) + dist(lms[16],lms[20])) / 3
}

/** Fingers clawed — tips between MCP and PIP in Y */
function clawed(lms: Landmark[]): boolean {
  return [8,12,16,20].every(tip => {
    const pip = tip-1, mcp = tip-2
    return lms[tip].y > lms[mcp].y && lms[tip].y < lms[pip].y
  })
}

/** Index + middle crossed */
function crossed(lms: Landmark[]): boolean {
  return Math.abs(lms[8].x - lms[12].x) < 0.025 &&
    ext(lms,8,6,5) && ext(lms,12,10,9)
}

/** Index + middle together (close, parallel) */
function imClose(lms: Landmark[]): boolean {
  return dist(lms[8], lms[12]) < 0.05
}


// ─── Scale-Invariant Custom Gesture Similarity ──────────────────────────────────
function similarity(lms1: Landmark[], lms2: Landmark[]): number {
  if (!lms1 || !lms2 || lms1.length < 21 || lms2.length < 21) return 0
  const s1 = dist(lms1[0], lms1[9]) || 1
  const s2 = dist(lms2[0], lms2[9]) || 1
  const n1 = lms1.map(lm => ({ x:(lm.x-lms1[0].x)/s1, y:(lm.y-lms1[0].y)/s1, z:0 }))
  const n2 = lms2.map(lm => ({ x:(lm.x-lms2[0].x)/s2, y:(lm.y-lms2[0].y)/s2, z:0 }))
  let total = 0
  for (let i = 0; i < 21; i++) total += dist(n1[i], n2[i])
  return Math.max(0, 1 - (total / 21) * 1.5)
}

// ─── Main Recognition ───────────────────────────────────────────────────────────
export function recognizeHandGesture(lms: Landmark[]): { sign: string; confidence: number } | null {
  if (!lms || lms.length < 21) return null

  // ── 1. Custom saved gestures (highest priority) ───────────────────────────
  const customs = getCustomGestures()
  let bestCustom: CustomGesture | null = null, bestScore = 0
  for (const cg of customs) {
    const s = similarity(lms, cg.landmarks)
    if (s > 0.80 && s > bestScore) { bestScore = s; bestCustom = cg }
  }
  if (bestCustom) return { sign: bestCustom.name, confidence: +bestScore.toFixed(2) }

  // ── 2. Universal hand-shape rules ────────────────────────────────────────
  const I   = ext(lms, 8,  6,  5)
  const M   = ext(lms, 12, 10, 9)
  const R   = ext(lms, 16, 14, 13)
  const Pk  = ext(lms, 20, 18, 17)
  const Th  = thumbSide(lms)
  const Ic  = curl(lms, 8, 6)
  const Mc  = curl(lms, 12, 10)
  const Rc  = curl(lms, 16, 14)
  const Pkc = curl(lms, 20, 18)
  const thD = thumbDown(lms)
  const tid = tiD(lms)
  const sp  = spread(lms)

  // ── NUMBERS (most specific shapes first) ──────────────────────────────────

  // Zero: tiny tight O between thumb + index, others curled
  if (tid < 0.04 && Ic && Mc && Rc && Pkc && !thD)
    return { sign: 'Zero', confidence: 0.95 }

  // Nine: near-pinch O (slightly larger gap), others curled
  if (tid >= 0.04 && tid < 0.07 && Ic && Mc && Rc && Pkc && !thD)
    return { sign: 'Nine', confidence: 0.92 }

  // Eight: thumb + middle up, others curled
  if (Th && !I && M && !R && !Pk && Ic && Rc && Pkc)
    return { sign: 'Eight', confidence: 0.91 }

  // Seven: thumb + ring up, others curled
  if (Th && !I && !M && R && !Pk && Ic && Mc && Pkc)
    return { sign: 'Seven', confidence: 0.91 }

  // Six: thumb + pinky up, middle three curled
  if (Th && !I && !M && !R && Pk && Ic && Mc && Rc)
    return { sign: 'Six', confidence: 0.92 }

  // Five: all 5 wide open
  if (Th && I && M && R && Pk && sp > 0.07)
    return { sign: 'Five', confidence: 0.95 }

  // Four: all 4 fingers up, thumb folded
  if (!Th && I && M && R && Pk && sp < 0.08)
    return { sign: 'Four', confidence: 0.93 }

  // Three: index + middle + ring
  if (!Th && I && M && R && !Pk && Pkc)
    return { sign: 'Three', confidence: 0.92 }

  // Two: index + middle together (close)
  if (!Th && I && M && !R && !Pk && imClose(lms))
    return { sign: 'Two', confidence: 0.91 }

  // One: only index
  if (!Th && I && !M && !R && !Pk)
    return { sign: 'One', confidence: 0.93 }

  // Ten: thumb up, all 4 curled — BUT knuckles must be spread wider than Good
  // Good (tight fist): knuckle spread < 0.04; Ten (relaxed fist): knuckle spread >= 0.04
  if (Th && !I && !M && !R && !Pk && !thD) {
    const knuckleSp = dist(lms[5], lms[17])   // index MCP → pinky MCP
    if (knuckleSp >= 0.035) return { sign: 'Ten',  confidence: 0.91 }
    return { sign: 'Good', confidence: 0.95 }
  }

  // ── GREETINGS ─────────────────────────────────────────────────────────────

  // I Love You: thumb + index + pinky (middle & ring curled)
  if (Th && I && !M && !R && Pk && Mc && Rc)
    return { sign: 'I Love You', confidence: 0.93 }

  // Peace: index + middle in V (spread apart)
  if (!Th && I && M && !R && !Pk && dist(lms[8],lms[12]) > 0.06)
    return { sign: 'Peace', confidence: 0.92 }

  // Namaste / Hello: all 5 open — distinguish by spread
  if (Th && I && M && R && Pk && sp > 0.04 && sp <= 0.07)
    return { sign: 'Namaste', confidence: 0.90 }

  if (Th && I && M && R && Pk && sp > 0.07)
    return { sign: 'Hello', confidence: 0.88 }

  // ── BASIC ─────────────────────────────────────────────────────────────────

  // Good (thumbs up): thumb sideways, all 4 curled, NOT down
  // (already handled in Ten/Good split above — dead path, kept as safety net)
  if (Th && !I && !M && !R && !Pk && !thD)
    return { sign: 'Good', confidence: 0.95 }

  // Bad (thumbs down): all 4 curled, thumb DOWN
  if (allCurled(lms) && thD)
    return { sign: 'Bad', confidence: 0.93 }

  // Okay: thumb + index touching (tiny dist), others free
  if (tid < 0.05 && !Mc && !Rc && !Pkc)
    return { sign: 'Okay', confidence: 0.94 }

  // Money: thumb near index, middle/ring/pinky curled, thumb extended
  if (Th && tid < 0.06 && Mc && Rc && Pkc && !thD)
    return { sign: 'Money', confidence: 0.88 }

  // Yes vs One: same shape — use context to disambiguate
  // If last emitted sign was a number → user is counting → emit 'One'
  // Otherwise emit 'Yes' (more common in conversation)
  if (!Th && I && !M && !R && !Pk) {
    const isCountingContext = _lastContextSign !== null &&
      ['Zero','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'].includes(_lastContextSign)
    return isCountingContext
      ? { sign: 'One', confidence: 0.91 }
      : { sign: 'Yes', confidence: 0.93 }
  }

  // No: fist + thumb out sideways (not down)
  if (allCurled(lms) && Th && !thD)
    return { sign: 'No', confidence: 0.91 }

  // Mobile Phone (Y-shape): thumb + pinky, middle three curled
  if (Th && !I && !M && !R && Pk && Ic && Mc && Rc)
    return { sign: 'Mobile Phone', confidence: 0.91 }

  // Come: index + pinky up, middle + ring down, no thumb
  if (!Th && I && !M && !R && Pk && Mc && Rc)
    return { sign: 'Come', confidence: 0.91 }

  // Quiet: only pinky
  if (!Th && !I && !M && !R && Pk)
    return { sign: 'Quiet', confidence: 0.91 }

  // Stop: 4 fingers up, thumb folded, moderate spread
  if (!Th && I && M && R && Pk && sp >= 0.04)
    return { sign: 'Stop', confidence: 0.90 }

  // Promise: crossed index + middle
  if (crossed(lms))
    return { sign: 'Promise', confidence: 0.89 }

  // What: bunched upward (tips pointing up)
  if (bunched(lms) && !tipBelow(lms, 8))
    return { sign: 'What?', confidence: 0.88 }

  // Food: bunched downward (tips toward mouth direction)
  if (bunched(lms) && tipBelow(lms, 8))
    return { sign: 'Food', confidence: 0.88 }

  // Water: thumb + index + middle (W), ring + pinky curled
  if (Th && I && M && !R && !Pk && Rc && Pkc)
    return { sign: 'Water', confidence: 0.90 }

  // Go Away: 4 fingers grouped tight + thumb out, spread < 0.05
  if (Th && I && M && R && !Pk && sp < 0.05)
    return { sign: 'Go Away', confidence: 0.87 }

  // Pain: clawed / grasping shape, no thumb
  if (clawed(lms) && !Th)
    return { sign: 'Pain', confidence: 0.87 }

  // Sorry: fist, NO thumb, NOT down
  if (allCurled(lms) && !Th && !thD)
    return { sign: 'Sorry', confidence: 0.88 }

  // Sleep: fist pointing down (MCP higher than fingertips)
  if (allCurled(lms) && lms[9].y > lms[0].y)
    return { sign: 'Sleep', confidence: 0.86 }

  // Tired: all fingers pointing DOWN below wrist
  if (I && M && R && Pk && [8,12,16,20].every(t => tipBelow(lms, t)))
    return { sign: 'Tired', confidence: 0.89 }

  // Help Me: 4 fingers up spread moderately (urgent)
  if (!Th && I && M && R && Pk && sp >= 0.05)
    return { sign: 'Help Me', confidence: 0.87 }

  // Finished: 4 fingers flat forward (very tight together)
  if (!Th && I && M && R && Pk && sp < 0.03)
    return { sign: 'Finished', confidence: 0.86 }

  return null
}

// ─── Pose Gesture Recognition (arm-level) ──────────────────────────────────────
const P = { LS:11, RS:12, LE:13, RE:14, LW:15, RW:16 }

function armAngle(pose: Landmark[], s:number, e:number, w:number): number {
  if (!pose[s]||!pose[e]||!pose[w]) return 180
  const ab={x:pose[e].x-pose[s].x,y:pose[e].y-pose[s].y}
  const cb={x:pose[e].x-pose[w].x,y:pose[e].y-pose[w].y}
  const dot=ab.x*cb.x+ab.y*cb.y
  const mag=Math.sqrt(ab.x**2+ab.y**2)*Math.sqrt(cb.x**2+cb.y**2)
  return mag===0?0:Math.acos(Math.min(1,Math.max(-1,dot/mag)))*(180/Math.PI)
}

function wristAbove(pose:Landmark[],w:number,s:number):boolean {
  return pose[w]&&pose[s]&&pose[w].y<pose[s].y
}

export function recognizePoseGesture(pose: Landmark[]): { sign: string; confidence: number } | null {
  if (!pose || pose.length < 25) return null
  const lA = armAngle(pose,P.LS,P.LE,P.LW)
  const rA = armAngle(pose,P.RS,P.RE,P.RW)
  const lUp = wristAbove(pose,P.LW,P.LS)
  const rUp = wristAbove(pose,P.RW,P.RS)
  if (lUp&&rUp&&lA>150&&rA>150) return { sign:'Help Me',  confidence:0.90 }
  if (lUp&&!rUp&&lA>140)        return { sign:'Left',     confidence:0.85 }
  if (rUp&&!lUp&&rA>140)        return { sign:'Right',    confidence:0.85 }
  if (lA<70&&rA<70)              return { sign:'No',       confidence:0.82 }
  if (rUp&&rA>80&&rA<130)       return { sign:'Hello',    confidence:0.87 }
  return null
}

/** @deprecated */
export function recognizeGesture(lms: Landmark[]): string | null {
  return recognizeHandGesture(lms)?.sign ?? null
}
