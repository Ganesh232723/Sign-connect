import { Link } from 'react-router-dom'
import { ArrowRight, Touchpad, Mic, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Landing() {
  return (
    <div className="flex flex-col flex-1 items-center bg-white">
      {/* Hero Section */}
      <div className="w-full max-w-6xl px-5 sm:px-6 lg:px-12 pt-10 sm:pt-16 pb-16 sm:pb-24 text-left">
        <p className="text-primary font-semibold tracking-widest text-xs sm:text-sm mb-3 sm:mb-4 uppercase">
          Real-Time ISL Processing
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-secondary leading-tight max-w-4xl mb-4 sm:mb-6">
          SignConnect:<br />Bridging the Gap
        </h1>
        <p className="text-base sm:text-xl text-slate-600 max-w-2xl mb-8 sm:mb-10 leading-relaxed">
          Empowering the deaf and hard of hearing community with real-time Indian Sign Language
          translation and seamless communication.
        </p>
        <Link to="/app">
          {/* Large touch target — minimum 44px height per Apple HIG */}
          <Button className="bg-primary hover:bg-orange-600 text-white rounded-full px-7 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-semibold shadow-md shadow-orange-200 transition-all hover:scale-105 min-h-[48px]">
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* Core Capabilities Section */}
      <div className="w-full bg-slate-50 py-12 sm:py-20 px-5 sm:px-6 lg:px-12 flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-secondary mb-10 sm:mb-16 text-center">
          Our Core Capabilities
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 max-w-6xl w-full text-center">

          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Touchpad className="h-8 w-8 text-secondary" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-secondary">Real-time Translation</h3>
            <p className="text-slate-600 leading-relaxed px-2 sm:px-4 text-sm sm:text-base">
              Instantly translate sign language into text, providing a seamless bridge between
              hearing and deaf communities.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Mic className="h-8 w-8 text-secondary" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-secondary">Natural Voice Output</h3>
            <p className="text-slate-600 leading-relaxed px-2 sm:px-4 text-sm sm:text-base">
              Advanced TTS technology ensures high-accuracy speech generation, even in complex
              environments with minimal latency.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Webhook className="h-8 w-8 text-secondary" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-secondary">AI Skeleton Tracking</h3>
            <p className="text-slate-600 leading-relaxed px-2 sm:px-4 text-sm sm:text-base">
              State-of-the-art computer vision accurately tracks hand and facial gestures using
              just your standard webcam or phone camera.
            </p>
          </div>

        </div>
      </div>

      {/* Mobile CTA banner */}
      <div className="w-full bg-primary py-8 px-5 flex flex-col items-center text-center sm:hidden">
        <p className="text-white font-bold text-lg mb-1">Works on your phone!</p>
        <p className="text-orange-100 text-sm mb-4">Use your front camera to translate ISL gestures anywhere.</p>
        <Link to="/app">
          <Button className="bg-white text-primary hover:bg-orange-50 rounded-full px-7 py-5 font-semibold shadow-md min-h-[48px]">
            Open on This Device <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
