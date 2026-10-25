import { useState, useRef } from 'react'
import { Video, Square, Download, Star, Send, CheckCircle2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface VideoRecorderProps {
  stream: MediaStream | null
}

export default function VideoRecorder({ stream }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const startRecording = () => {
    if (!stream) {
      toast.error('Camera stream not active. Please start camera first.')
      return
    }

    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
      mediaRecorderRef.current = recorder
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        toast.success('Session recorded! Review your clip below.')
      }

      recorder.start()
      setIsRecording(true)
      setVideoUrl(null)
      setSubmitted(false)
      toast('Recording started...', { icon: '🎥' })
    } catch (err) {
      console.error('Recording error:', err)
      toast.error('Failed to start recording on this browser.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleDownload = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `signconnect-session-${Date.now()}.webm`
    a.click()
    toast.success('Video downloaded!')
  }

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    toast.success('Feedback & video review submitted! Our team will review it to improve accuracy.')
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-secondary text-sm">Session Video Recorder & Review</h3>
        </div>
        {isRecording && (
          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1.5 animate-pulse text-xs">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Recording
          </Badge>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Record your signing session to review accuracy, download video clips, or submit feedback to help train our ISL model.
      </p>

      {/* Record controls */}
      {!videoUrl ? (
        <div>
          {!isRecording ? (
            <Button
              onClick={startRecording}
              variant="outline"
              className="w-full rounded-xl border-dashed border-slate-300 text-slate-700 hover:border-primary hover:bg-orange-50 gap-2 h-11 text-xs font-semibold"
            >
              <Video className="h-4 w-4 text-primary" /> Start Recording Session
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2 h-11 text-xs font-bold shadow-sm"
            >
              <Square className="h-4 w-4 fill-white" /> Stop Recording
            </Button>
          )}
        </div>
      ) : (
        /* Video Player & Feedback Form */
        <div className="space-y-4 pt-2">
          <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-200 relative">
            <video src={videoUrl} controls className="w-full h-full object-contain" />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl gap-1.5 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Download Video
            </Button>

            <Button
              onClick={() => setVideoUrl(null)}
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs text-slate-500"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Record New
            </Button>
          </div>

          {/* User Review / Satisfaction Form */}
          {!submitted ? (
            <form onSubmit={handleSubmitFeedback} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-secondary">Rate Translation Satisfaction for this Video</p>

              {/* Star Rating */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={cn(
                        "h-5 w-5 transition-colors",
                        (hoverRating || rating) >= star
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300"
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-slate-600 ml-2">{rating} / 5 Stars</span>
              </div>

              <Input
                type="text"
                placeholder="Not satisfied? Tell us which sign was misrecognized..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="text-xs rounded-lg bg-white"
              />

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-orange-600 text-white rounded-lg text-xs font-bold gap-1.5 h-9"
              >
                <Send className="h-3.5 w-3.5" /> Submit Video Review
              </Button>
            </form>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-800 font-semibold">Thank you for your video feedback!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
