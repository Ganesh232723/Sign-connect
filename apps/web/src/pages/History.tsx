import { useEffect, useState } from 'react'
import { fetchHistory } from '@/services/supabase'
import { Clock, Languages, AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TranscriptRow {
  id: string
  text: string
  confidence: number
  spoken_at: string
  language: string
  translation_sessions?: { language_output: string }
}

export default function HistoryPage() {
  const [rows, setRows] = useState<TranscriptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory().then(data => {
      setRows(data as TranscriptRow[])
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">Session History</h1>
        <p className="text-slate-500 mt-1">All past translation captions stored in Supabase.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading history...
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
          <AlertCircle className="h-12 w-12 mb-4 text-slate-200" />
          <p className="font-medium">No history yet</p>
          <p className="text-sm mt-1">Run a Live Translation session — your captions will appear here.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-primary/30 transition-colors">
              <p className="text-secondary font-medium leading-relaxed">{row.text}</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(row.spoken_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Languages className="h-3.5 w-3.5" />
                  {row.language}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs ml-auto',
                    row.confidence > 0.85
                      ? 'border-green-200 text-green-700 bg-green-50'
                      : row.confidence > 0.7
                      ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                      : 'border-red-200 text-red-700 bg-red-50'
                  )}
                >
                  {Math.round(row.confidence * 100)}% confidence
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
