import { useState } from 'react'
import {
  HelpCircle, Mail, MessageSquare, Send, CheckCircle2,
  LifeBuoy, ChevronDown, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
  category: 'General' | 'Technical' | 'Translation'
}

const FAQS: FAQItem[] = [
  {
    category: 'General',
    question: 'How does SignConnect recognize Indian Sign Language (ISL)?',
    answer: 'SignConnect uses computer vision (MediaPipe) to extract 21 hand landmarks and 33 pose landmarks in real time directly from your webcam. Our AI gesture recognition engine matches joint angles and spatial movements to ISL signs with high accuracy.'
  },
  {
    category: 'Translation',
    question: 'Which Indian languages are supported for translation and voice output?',
    answer: 'SignConnect supports all 22 Scheduled Languages of India (Hindi, Marathi, Tamil, Telugu, Kannada, Gujarati, Bengali, Punjabi, Malayalam, Odia, Assamese, etc.) plus English. Captions are translated and spoken aloud using native TTS voices.'
  },
  {
    category: 'Technical',
    question: 'Why is my webcam not working or camera permissions denied?',
    answer: 'Ensure your browser has granted camera access permission. Click the lock/camera icon near the URL bar in Chrome/Edge/Firefox, set Camera to "Allow", and refresh the page. You can also pick a specific camera device in Settings.'
  },
  {
    category: 'Technical',
    question: 'Can I use an external camera or mobile camera?',
    answer: 'Yes! SignConnect supports multi-device selection. You can switch between laptop webcams, USB cameras, or secondary video inputs in the Live Translation top bar or in Settings.'
  },
  {
    category: 'Translation',
    question: 'How accurate is the real-time translation?',
    answer: 'SignConnect calculates a live confidence score (ranging 0-100%) for both gesture detection and language translation. You can monitor your session accuracy in real time under the Accuracy Report tab.'
  }
]

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [subject, setSubject] = useState('')
  const [email, setEmail] = useState('')
  const [queryType, setQueryType] = useState('Technical Issue')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ticketSubmitted, setTicketSubmitted] = useState(false)
  const [ticketId, setTicketId] = useState('')

  const handleSubmitQuery = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !email.trim()) {
      toast.error('Please fill in your email and message.')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      const generatedId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`
      setTicketId(generatedId)
      setTicketSubmitted(true)
      setSubmitting(false)
      toast.success(`Support Ticket ${generatedId} created! Our technical team will reply to ${email}.`)
    }, 1200)
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">24/7 Technical Support</Badge>
        </div>
        <h1 className="text-3xl font-extrabold text-secondary">Help & Support Centre</h1>
        <p className="text-slate-500 mt-1">Get immediate answers, submit technical queries, or contact our support team.</p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-primary shrink-0">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-secondary text-sm">Direct Email Support</h3>
            <p className="text-xs text-slate-500 mt-1">techsupport@signconnect.ai</p>
            <span className="text-xs text-green-600 font-medium inline-block mt-2">Avg. response &lt; 2 hrs</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-secondary text-sm">On-the-Spot Queries</h3>
            <p className="text-xs text-slate-500 mt-1">Instant query ticket resolution system</p>
            <span className="text-xs text-blue-600 font-medium inline-block mt-2">Live queue active</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 shrink-0">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-secondary text-sm">Helpline & Accessibility</h3>
            <p className="text-xs text-slate-500 mt-1">+91 (800) 555-SIGN</p>
            <span className="text-xs text-purple-600 font-medium inline-block mt-2">Toll-free ISL support</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left 3 cols: On-the-spot Query & Support Ticket Form */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-secondary">Submit a Support Query</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">Facing camera, gesture detection, or language translation issues? Fill in the details below for instant ticket creation.</p>

            {ticketSubmitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-900">Query Ticket Created!</h3>
                <p className="text-xs text-green-700 mt-1">Ticket Reference ID: <span className="font-mono font-bold text-green-900">{ticketId}</span></p>
                <p className="text-xs text-slate-600 mt-3">Our technical engineering team has received your query and sent a confirmation email to <strong>{email}</strong>.</p>
                <Button
                  className="mt-6 bg-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold"
                  onClick={() => { setTicketSubmitted(false); setMessage(''); setSubject('') }}
                >
                  Submit Another Query
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitQuery} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Your Email Address</Label>
                  <Input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Issue Category</Label>
                  <select
                    value={queryType}
                    onChange={e => setQueryType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 outline-none focus:border-primary"
                  >
                    <option value="Technical Issue">Camera / Hardware Issue</option>
                    <option value="Translation Accuracy">Sign Translation / Accuracy Query</option>
                    <option value="Language Request">Indian Regional Language Request</option>
                    <option value="Account / Login">Account & OAuth Login Query</option>
                    <option value="Course / Feedback">Course Content & General Feedback</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Subject</Label>
                  <Input
                    type="text"
                    required
                    placeholder="Brief description of the query"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Detailed Message / Description</Label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your issue or query in detail..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-normal text-slate-700 outline-none focus:border-primary resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary hover:bg-orange-600 text-white rounded-xl font-bold text-sm h-11 gap-2 shadow-sm"
                >
                  <Send className="h-4 w-4" /> {submitting ? 'Submitting Query...' : 'Submit Support Query'}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Right 2 cols: Frequently Asked Questions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-secondary">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 text-left font-semibold text-xs text-secondary hover:bg-slate-100 transition-colors"
                    >
                      <span className="pr-2">{faq.question}</span>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 shrink-0 transition-transform", isOpen && "transform rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="p-3.5 bg-white text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
