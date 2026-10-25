import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare, LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/stores/auth'
import { supabase } from '@/services/supabase'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    logout()
    toast.success('Signed out')
    navigate('/auth')
    setMobileOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 lg:px-12">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors shrink-0">
          <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          <span className="text-xl md:text-2xl font-bold tracking-tight">SignConnect</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex flex-1 items-center justify-end space-x-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/app/settings"
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
              >
                <img
                  src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=SignConnect'}
                  alt={user.name}
                  className="w-7 h-7 rounded-full bg-slate-100 object-cover"
                />
                <span className="text-sm font-semibold text-secondary">{user.name}</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-slate-500 hover:text-red-600 rounded-full h-9 w-9 bg-slate-50 border border-slate-200"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="ghost" className="text-slate-600 hover:text-secondary hover:bg-slate-100 font-medium text-base">
                Login
              </Button>
            </Link>
          )}

          <Link to="/app">
            <Button className="bg-primary hover:bg-orange-600 text-white rounded-full px-5 py-2 shadow-sm font-semibold transition-transform hover:scale-105">
              Start Translating
            </Button>
          </Link>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {isAuthenticated && user && (
            <Link to="/app/settings">
              <img
                src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=SignConnect'}
                alt={user.name}
                className="w-8 h-8 rounded-full bg-slate-100 object-cover border border-slate-200"
              />
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5 text-secondary" /> : <Menu className="h-5 w-5 text-secondary" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-t border-slate-100 px-4 py-3 flex flex-col gap-2 shadow-lg">
          <Link to="/app" onClick={() => setMobileOpen(false)}>
            <Button className="w-full bg-primary hover:bg-orange-600 text-white rounded-full font-semibold">
              Start Translating
            </Button>
          </Link>
          {isAuthenticated && user ? (
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 text-sm font-semibold text-red-500 py-2 rounded-xl hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full rounded-full font-medium">
                Login
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
