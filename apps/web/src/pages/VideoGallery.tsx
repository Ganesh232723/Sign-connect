import { useState, useEffect } from 'react'
import { Star, Send, ShieldCheck, ExternalLink, PlayCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '@/stores/auth'
import { fetchVideoReviews, saveVideoReview } from '@/services/supabase'

interface DemoVideo {
  id: string
  title: string
  category: 'Greetings' | 'Everyday' | 'Emergency' | 'Numbers'
  gestureText: string
  translatedHindi: string
  translatedTamil: string
  author: string
  rating: number
  reviewsCount: number
  duration: string
  youtubeId: string
  verified: boolean
}

interface Review {
  user: string
  rating: number
  comment: string
  date: string
}

// Real public ISL / sign-language YouTube video IDs
const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: 'vid-1',
    title: 'Indian Sign Language – Greetings & Namaste',
    category: 'Greetings',
    gestureText: 'Namaste / Hello / Thank You',
    translatedHindi: 'नमस्ते / धन्यवाद',
    translatedTamil: 'வணக்கம் / நன்றி',
    author: 'ISLRTC Official (Govt. of India)',
    rating: 4.9,
    reviewsCount: 128,
    duration: '3:24',
    youtubeId: 'JPV-vboWfhY',
    verified: true,
  },
  {
    id: 'vid-2',
    title: 'ISL Numbers 1–10 (Indian Sign Language)',
    category: 'Numbers',
    gestureText: 'One, Two, Three … Ten',
    translatedHindi: 'एक, दो, तीन … दस',
    translatedTamil: 'ஒன்று, இரண்டு, மூன்று',
    author: 'ISLRTC Official',
    rating: 4.8,
    reviewsCount: 94,
    duration: '2:15',
    youtubeId: 'qcdivQfA41Y',
    verified: true,
  },
  {
    id: 'vid-3',
    title: 'ISL Emergency & Help Signs',
    category: 'Emergency',
    gestureText: 'Help / Stop / Danger / Doctor',
    translatedHindi: 'सहायता / रोकें / खतरा',
    translatedTamil: 'உதவி / நிறுத்து / ஆபத்து',
    author: 'Ali Yavar Jung NIHH',
    rating: 4.7,
    reviewsCount: 76,
    duration: '4:05',
    youtubeId: '5PF6JXzYyUI',
    verified: true,
  },
  {
    id: 'vid-4',
    title: 'ISL Alphabet A–Z (Indian Sign Language)',
    category: 'Everyday',
    gestureText: 'Complete ISL Alphabet',
    translatedHindi: 'ISL वर्णमाला A से Z',
    translatedTamil: 'ISL எழுத்துக்கள்',
    author: 'ISLRTC India',
    rating: 4.9,
    reviewsCount: 210,
    duration: '5:30',
    youtubeId: 'n42ohSmbAFI',
    verified: true,
  }
]

const SEED_REVIEWS: Record<string, Review[]> = {
  'vid-1': [
    { user: 'Aarav Patel', rating: 5, comment: 'Very accurate! MediaPipe picks up the palm orientation instantly.', date: '2 days ago' },
    { user: 'Deepa V.', rating: 5, comment: 'Perfect demonstration for new users to understand greetings in ISL.', date: '4 days ago' }
  ],
  'vid-2': [
    { user: 'Sanjay M.', rating: 4, comment: 'Clear finger positioning for each number – very helpful!', date: '1 week ago' },
    { user: 'Meera Nair', rating: 5, comment: 'Super clear for teaching kids!', date: '3 days ago' }
  ],
  'vid-3': [
    { user: 'Priya K.', rating: 5, comment: 'Essential for healthcare workers. The Stop sign is particularly clear.', date: '3 days ago' }
  ],
  'vid-4': [
    { user: 'Ramesh B.', rating: 5, comment: 'Best alphabet tutorial I have seen in ISL!', date: '5 days ago' }
  ]
}

export default function VideoGalleryPage() {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [activeVideo, setActiveVideo] = useState<DemoVideo>(DEMO_VIDEOS[0])
  const [_playing, setPlaying] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [userRating, setUserRating] = useState(5)
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS['vid-1'] ?? [])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const filteredVideos = DEMO_VIDEOS.filter(v =>
    selectedCategory === 'All' || v.category === selectedCategory
  )

  // Fetch reviews for the active video
  useEffect(() => {
    async function load() {
      setLoadingReviews(true)
      const dbReviews = await fetchVideoReviews(activeVideo.id)
      // Map DB format to Review format
      const formatted: Review[] = dbReviews.map((r: any) => ({
        user: r.user_name,
        rating: r.rating,
        comment: r.comment,
        date: new Date(r.created_at).toLocaleDateString()
      }))
      // Merge DB reviews with seed reviews (DB reviews first, most recent on top)
      setReviews([...formatted, ...(SEED_REVIEWS[activeVideo.id] ?? [])])
      setLoadingReviews(false)
    }
    load()
  }, [activeVideo.id])

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const userName = user?.name || 'Anonymous User'
    
    setSubmitting(true)
    await saveVideoReview(activeVideo.id, userName, userRating, newComment)
    setSubmitting(false)

    // Optimistically add to local state
    const newReview: Review = { user: userName, rating: userRating, comment: newComment, date: 'Just now' }
    setReviews(prev => [newReview, ...prev])
    setNewComment('')
    toast.success('Your video review has been posted!')
  }

  const handleVideoSelect = (vid: DemoVideo) => {
    setActiveVideo(vid)
    setPlaying(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">Live Video Demos</Badge>
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Community Reviews</Badge>
          </div>
          <h1 className="text-3xl font-extrabold text-secondary">ISL Video Demos & Reviews</h1>
          <p className="text-slate-500 text-sm mt-1">Watch real official ISL video tutorials and leave feedback to help new users.</p>
        </div>
      </div>

      {/* Main Grid: Active Video + Reviews */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Embedded Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* YouTube Embed or Thumbnail */}
            <div className="relative aspect-video bg-slate-900">
              <iframe
                key={activeVideo.id}
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            {/* Video Info Bar */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-secondary text-base">{activeVideo.title}</h2>
                <a
                  href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-red-600 hover:underline font-semibold"
                >
                  <PlayCircle className="h-4 w-4" /> Watch on YouTube
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-medium">ISL Sign:</span>
                  <p className="font-bold text-secondary text-sm mt-0.5">{activeVideo.gestureText}</p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <span className="text-orange-700 font-medium">Hindi (हिंदी):</span>
                  <p className="font-bold text-orange-950 text-sm mt-0.5">{activeVideo.translatedHindi}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-blue-700 font-medium">Tamil (தமிழ்):</span>
                  <p className="font-bold text-blue-950 text-sm mt-0.5">{activeVideo.translatedTamil}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1 font-semibold text-secondary">
                  <ShieldCheck className="h-4 w-4 text-green-600" /> Official ISLRTC Verified
                </span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-secondary text-sm">{activeVideo.rating}</span>
                  <span>({activeVideo.reviewsCount + reviews.filter(r => r.date === 'Just now').length} reviews)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Community Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-secondary text-base">User Reviews</h3>
            <Badge variant="outline" className="text-xs">{reviews.length} Reviews</Badge>
          </div>

          {/* Review Feed */}
          <div className="space-y-3 overflow-y-auto max-h-64 flex-1 pr-1">
            {loadingReviews ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading reviews…
              </div>
            ) : reviews.map((rev, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-secondary">{rev.user}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-600">{rev.comment}</p>
                <span className="text-[10px] text-slate-400">{rev.date}</span>
              </div>
            ))}
          </div>

          {/* Post Review Form */}
          <form onSubmit={handleAddReview} className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs font-bold text-secondary">Leave Your Review</p>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 mr-1">Rating:</span>
              {[1, 2, 3, 4, 5].map(s => (
                <button type="button" key={s} onClick={() => setUserRating(s)} className="p-0.5">
                  <Star className={cn("h-4 w-4 transition-colors", userRating >= s ? "fill-yellow-400 text-yellow-400" : "text-slate-300")} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Was the translation accurate?"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                className="text-xs h-9 rounded-xl"
              />
              <Button type="submit" size="sm" className="bg-primary hover:bg-orange-600 text-white rounded-xl h-9" disabled={submitting}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Video Grid Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-secondary">All ISL Video Tutorials</h2>
          <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            {['All', 'Greetings', 'Numbers', 'Emergency', 'Everyday'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all',
                  selectedCategory === cat ? 'bg-primary text-white' : 'text-slate-600 hover:text-secondary'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredVideos.map(vid => (
            <div
              key={vid.id}
              onClick={() => handleVideoSelect(vid)}
              className={cn(
                "bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden",
                activeVideo?.id === vid.id ? "border-primary ring-2 ring-primary/20" : "border-slate-200 hover:border-primary/40"
              )}
            >
              {/* YouTube Thumbnail */}
              <div className="relative aspect-video bg-slate-900 group overflow-hidden">
                <img
                  src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                  alt={vid.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-3 bg-red-600 text-white rounded-full shadow-lg">
                    <svg className="h-5 w-5 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <Badge className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px]">{vid.duration}</Badge>
                {activeVideo?.id === vid.id && (
                  <div className="absolute top-1.5 left-1.5">
                    <Badge className="bg-primary text-white text-[10px]">▶ Playing</Badge>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-1.5">
                <Badge variant="outline" className="text-[10px]">{vid.category}</Badge>
                <h3 className="font-bold text-secondary text-xs leading-snug line-clamp-2">{vid.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> {vid.rating}
                  </span>
                  <span>{vid.reviewsCount} reviews</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
