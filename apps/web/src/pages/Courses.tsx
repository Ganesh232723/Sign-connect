import { useState, useEffect } from 'react'
import {
  BookOpen, ChevronRight, Star, Lock, CheckCircle2,
  PlayCircle, Clock, Users, Award, Zap, Brain, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { fetchCourseProgress, saveCourseProgress } from '@/services/supabase'
import toast from 'react-hot-toast'

interface Lesson {
  id: string
  title: string
  duration: string
  gestures: string[]
  completed: boolean
  locked: boolean
}

interface Course {
  id: string
  title: string
  description: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  lessons: number
  duration: string
  students: number
  rating: number
  color: string
  icon: string
  lessons_list: Lesson[]
}

const BASE_COURSES: Course[] = [
  {
    id: 'isl-basics',
    title: 'ISL Fundamentals',
    description: 'Master the alphabet, numbers, and core everyday signs used in Indian Sign Language.',
    level: 'Beginner',
    lessons: 12,
    duration: '3 hours',
    students: 4820,
    rating: 4.9,
    color: 'from-orange-400 to-orange-600',
    icon: '🤟',
    lessons_list: [
      { id: 'l1', title: 'Greeting Gestures (Namaste, Hello)', duration: '8 min', gestures: ['Namaste','Hello'], completed: false, locked: false },
      { id: 'l2', title: 'Numbers 1–10', duration: '10 min', gestures: ['One','Two','Three','Four','Five'], completed: false, locked: false },
      { id: 'l3', title: 'Basic Commands (Yes, No, Stop, Help)', duration: '12 min', gestures: ['Yes','No','Stop','Help'], completed: false, locked: false },
      { id: 'l4', title: 'Emotions (Good, Okay, Peace)', duration: '10 min', gestures: ['Good','Okay','Peace'], completed: false, locked: false },
      { id: 'l5', title: 'Directional Signs (Left, Right)', duration: '8 min', gestures: ['Left','Right','Attention'], completed: false, locked: false },
    ]
  },
  {
    id: 'isl-daily',
    title: 'Daily Life Conversations',
    description: 'Learn essential phrases for shopping, travel, healthcare, and public interactions.',
    level: 'Intermediate',
    lessons: 16,
    duration: '5 hours',
    students: 2310,
    rating: 4.8,
    color: 'from-blue-500 to-blue-700',
    icon: '💬',
    lessons_list: [
      { id: 'dl1', title: 'Shopping & Transactions', duration: '15 min', gestures: ['Money','Buy','Thank You'], completed: false, locked: false },
      { id: 'dl2', title: 'Healthcare Communication', duration: '20 min', gestures: ['Doctor','Pain','Medicine'], completed: false, locked: false },
      { id: 'dl3', title: 'Travel & Transport', duration: '18 min', gestures: ['Train','Bus','Where'], completed: false, locked: false },
    ]
  },
  {
    id: 'isl-advanced',
    title: 'Continuous ISL Signing',
    description: 'Full sentence construction, grammar rules unique to ISL, and fluency practice.',
    level: 'Advanced',
    lessons: 20,
    duration: '8 hours',
    students: 890,
    rating: 4.7,
    color: 'from-purple-500 to-purple-700',
    icon: '🏆',
    lessons_list: [
      { id: 'al1', title: 'ISL Grammar Structure', duration: '25 min', gestures: [], completed: false, locked: false },
      { id: 'al2', title: 'Sentence Composition', duration: '30 min', gestures: [], completed: false, locked: false },
    ]
  },
]

export default function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>(BASE_COURSES)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [practiceMode, setPracticeMode] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [savingLesson, setSavingLesson] = useState(false)

  // Fetch and map progress
  useEffect(() => {
    async function loadProgress() {
      if (!user) {
        setLoadingProgress(false)
        return
      }
      
      const progressRecords = await fetchCourseProgress(user.id)
      
      const completedLessonIds = new Set(progressRecords.map((r: any) => r.lesson_id))

      // Build updated courses array with dynamic completed/locked status
      const updatedCourses = BASE_COURSES.map(course => {
        let previousCompleted = true // First lesson always unlocked
        
        const updatedLessons = course.lessons_list.map((lesson, idx) => {
          const isCompleted = completedLessonIds.has(lesson.id)
          // Lesson is locked if it's not the first lesson AND the previous lesson isn't completed
          const isLocked = idx === 0 ? false : !previousCompleted
          
          previousCompleted = isCompleted
          
          return {
            ...lesson,
            completed: isCompleted,
            locked: isLocked
          }
        })
        
        return {
          ...course,
          lessons_list: updatedLessons
        }
      })
      
      setCourses(updatedCourses)
      
      // Update selected course if one is open
      if (selectedCourse) {
        setSelectedCourse(updatedCourses.find(c => c.id === selectedCourse.id) || null)
      }
      if (activeLesson) {
        // We don't automatically update activeLesson to avoid jarring UI shifts, but we could
      }
      
      setLoadingProgress(false)
    }

    loadProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleMarkComplete = async () => {
    if (!user) {
      toast.error('You must be signed in to save progress')
      return
    }
    if (!selectedCourse || !activeLesson) return

    setSavingLesson(true)
    await saveCourseProgress(user.id, selectedCourse.id, activeLesson.id)
    
    // Optimistically update UI
    setCourses(prev => prev.map(c => {
      if (c.id !== selectedCourse.id) return c
      let prevComp = true
      const newLessons = c.lessons_list.map((l, i) => {
        const completed = l.id === activeLesson.id ? true : l.completed
        const locked = i === 0 ? false : !prevComp
        prevComp = completed
        return { ...l, completed, locked }
      })
      return { ...c, lessons_list: newLessons }
    }))
    
    // Also update selectedCourse
    setSelectedCourse(prev => {
      if (!prev) return null
      let prevComp = true
      const newLessons = prev.lessons_list.map((l, i) => {
        const completed = l.id === activeLesson.id ? true : l.completed
        const locked = i === 0 ? false : !prevComp
        prevComp = completed
        return { ...l, completed, locked }
      })
      return { ...prev, lessons_list: newLessons }
    })
    
    // Update activeLesson visually
    setActiveLesson(prev => prev ? { ...prev, completed: true } : null)
    
    setSavingLesson(false)
    toast.success('Lesson marked as complete!')
  }

  const levelColor = (l: Course['level']) =>
    l === 'Beginner'     ? 'bg-green-100 text-green-700 border-green-200'
    : l === 'Intermediate' ? 'bg-blue-100 text-blue-700 border-blue-200'
    :                        'bg-purple-100 text-purple-700 border-purple-200'

  // ── Practice mini-panel ────────────────────────────────────────────────────
  if (practiceMode && activeLesson) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <button
          className="flex items-center gap-2 text-slate-500 hover:text-secondary mb-6 text-sm font-medium transition-colors"
          onClick={() => { setPracticeMode(false) }}
        >
          ← Back to lesson
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-2xl font-bold text-secondary mb-2">Practice: {activeLesson.title}</h2>
          <p className="text-slate-500 mb-6">
            Perform each of the following gestures in front of your camera.
            The AI will validate your sign in real time.
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {activeLesson.gestures.map(g => (
              <div key={g} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <span className="font-semibold text-secondary">{g}</span>
                <Badge className="bg-primary/10 text-primary border-primary/30">Try it</Badge>
              </div>
            ))}
          </div>
          <div className="flex gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <Brain className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
            <span>
              Open the <strong>Live Translation</strong> page alongside this panel.
              The AI tracker will detect your gestures and show real-time feedback.
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Lesson detail ──────────────────────────────────────────────────────────
  if (selectedCourse && activeLesson) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <button
          className="flex items-center gap-2 text-slate-500 hover:text-secondary mb-6 text-sm font-medium"
          onClick={() => setActiveLesson(null)}
        >
          ← Back to {selectedCourse.title}
        </button>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className={cn('p-6 bg-gradient-to-r text-white', selectedCourse.color)}>
            <p className="text-white/70 text-sm mb-1">{selectedCourse.title}</p>
            <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
            <div className="flex items-center gap-3 mt-3 text-white/80 text-sm">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{activeLesson.duration}</span>
              {activeLesson.gestures.length > 0 && (
                <span>{activeLesson.gestures.length} signs to learn</span>
              )}
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-secondary text-sm">AI-Assisted Learning</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Our AI recognises your gestures in real time and gives instant feedback.
                  Click "Practice Now" to open the camera and try each sign.
                </p>
              </div>
            </div>

            {activeLesson.gestures.length > 0 && (
              <div>
                <h3 className="font-semibold text-secondary mb-3">Signs in this lesson:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {activeLesson.gestures.map(g => (
                    <div key={g} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <Hand className="h-5 w-5 text-primary" />
                      <span className="font-medium text-secondary">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                className="bg-primary hover:bg-orange-600 text-white rounded-xl gap-2"
                onClick={() => setPracticeMode(true)}
              >
                <PlayCircle className="h-4 w-4" /> Practice Now
              </Button>
              <Button 
                variant="outline" 
                className="rounded-xl"
                onClick={handleMarkComplete}
                disabled={activeLesson.completed || savingLesson}
              >
                {savingLesson ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : activeLesson.completed ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-slate-400" /> 
                )}
                {activeLesson.completed ? 'Completed' : 'Mark Complete'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Course detail ──────────────────────────────────────────────────────────
  if (selectedCourse) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <button
          className="flex items-center gap-2 text-slate-500 hover:text-secondary mb-6 text-sm font-medium"
          onClick={() => setSelectedCourse(null)}
        >
          ← Back to Courses
        </button>

        <div className={cn('p-6 rounded-2xl bg-gradient-to-r text-white mb-6', selectedCourse.color)}>
          <p className="text-4xl mb-3">{selectedCourse.icon}</p>
          <h2 className="text-3xl font-extrabold">{selectedCourse.title}</h2>
          <p className="text-white/80 mt-2 text-sm">{selectedCourse.description}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-white/80 text-sm">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{selectedCourse.duration}</span>
            <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5"/>{selectedCourse.lessons} lessons</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5"/>{selectedCourse.students.toLocaleString()} students</span>
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-white"/>{selectedCourse.rating}</span>
          </div>
        </div>

        <div className="space-y-2">
          {selectedCourse.lessons_list.map((lesson, i) => (
            <button
              key={lesson.id}
              disabled={lesson.locked}
              onClick={() => !lesson.locked && setActiveLesson(lesson)}
              className={cn(
                'w-full flex items-center gap-4 p-4 bg-white rounded-xl border transition-all text-left',
                lesson.locked
                  ? 'border-slate-200 opacity-50 cursor-not-allowed'
                  : lesson.completed
                  ? 'border-green-200 hover:border-green-300'
                  : 'border-slate-200 hover:border-primary/40 hover:shadow-sm cursor-pointer'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                lesson.completed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
              )}>
                {lesson.completed ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary text-sm truncate">{lesson.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{lesson.duration}</p>
              </div>
              {lesson.locked
                ? <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Course listing ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary">ISL Learning Courses</h1>
        <p className="text-slate-500 mt-1">AI-powered sign language courses with real-time gesture validation.</p>
      </div>

      {/* Feature banner */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-6 mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-orange-100 text-xs font-semibold uppercase tracking-wide mb-1">AI-Powered Learning</p>
          <h2 className="text-2xl font-extrabold">Practice with Live Camera Feedback</h2>
          <p className="text-orange-100 mt-1 text-sm">Our AI recognises your gestures in real time and guides your accuracy.</p>
        </div>
        <Award className="h-16 w-16 text-white/30 shrink-0" />
      </div>

      {loadingProgress ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Syncing your course progress...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(c => {
            const completedCount = c.lessons_list.filter(l => l.completed).length
            
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCourse(c)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary/30 transition-all text-left overflow-hidden flex flex-col"
              >
                <div className={cn('p-5 bg-gradient-to-br text-white', c.color)}>
                  <p className="text-3xl mb-2">{c.icon}</p>
                  <h3 className="font-extrabold text-lg leading-tight">{c.title}</h3>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-slate-600 text-sm mb-3 leading-relaxed line-clamp-2">{c.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className={cn('text-xs', levelColor(c.level))}>{c.level}</Badge>
                    {completedCount > 0 && (
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                        {completedCount} / {c.lessons} Done
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5"/>{c.lessons} lessons</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{c.duration}</span>
                    <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400"/>{c.rating}</span>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Coming soon card */}
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center min-h-[240px] opacity-70">
            <p className="text-3xl mb-3">🚀</p>
            <h3 className="font-bold text-secondary">More Courses Coming</h3>
            <p className="text-slate-500 text-sm mt-2">Regional ISL dialects, professional contexts, and children's courses are in development.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// Small helper import for lesson detail
function Hand({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
  )
}
