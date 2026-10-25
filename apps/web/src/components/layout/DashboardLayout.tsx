import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Video, Settings, History, GraduationCap, HelpCircle,
  ShieldCheck, PlaySquare, Hand, LogOut, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/stores/auth'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/services/supabase'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { name: 'Live Translation',        path: '/app',           icon: Video },
    { name: 'ISL Gestures & Trainer',  path: '/app/gestures',  icon: Hand },
    { name: 'Video Demos & Reviews',   path: '/app/videos',    icon: PlaySquare },
    { name: 'ISL Courses',             path: '/app/courses',   icon: GraduationCap },
    { name: 'Session History',         path: '/app/history',   icon: History },
    { name: 'Help & Support',          path: '/app/support',   icon: HelpCircle },
    { name: 'Admin Panel',             path: '/app/admin',     icon: ShieldCheck },
    { name: 'Settings',                path: '/app/settings',  icon: Settings },
  ]

  // Bottom nav shows only the 5 most-used items on mobile
  const bottomNavItems = [
    { name: 'Live',     path: '/app',          icon: Video },
    { name: 'Gestures', path: '/app/gestures', icon: Hand },
    { name: 'Courses',  path: '/app/courses',  icon: GraduationCap },
    { name: 'History',  path: '/app/history',  icon: History },
    { name: 'More',     path: null,            icon: Menu,   action: () => setMobileMenuOpen(true) },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    logout()
    toast.success('Signed out successfully')
    navigate('/auth')
  }

  const providerBadges: Record<string, { label: string; bg: string }> = {
    google:   { label: 'Google',     bg: 'bg-red-50 text-red-700 border-red-200' },
    facebook: { label: 'Facebook',   bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    twitter:  { label: 'X (Twitter)', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    email:    { label: 'Email',      bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    guest:    { label: 'Guest',      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }

  const currentBadge = user?.provider ? providerBadges[user.provider] : null

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 overflow-hidden relative">

      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shrink-0">
        <div className="p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Dashboard Menu
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    isActive
                      ? "bg-primary/10 text-primary shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Profile Card & Sign Out */}
        <div className="mt-auto p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          {user && (
            <div className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <img
                src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=SignConnect'}
                alt={user.name}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 object-cover shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-secondary truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
              {currentBadge && (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", currentBadge.bg)}>
                  {currentBadge.label}
                </Badge>
              )}
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      {/* pb-16 on mobile to clear the fixed bottom nav; md:pb-0 removes it on desktop */}
      <main className="flex-1 overflow-auto bg-slate-50 relative pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex md:hidden safe-area-inset-bottom">
        {bottomNavItems.map((item) => {
          const isActive = item.path !== null && location.pathname === item.path
          const Icon = item.icon
          const content = (
            <>
              <Icon className={cn("h-5 w-5 mb-0.5", isActive ? "text-primary" : "text-slate-400")} />
              <span className={cn("text-[10px] font-semibold", isActive ? "text-primary" : "text-slate-500")}>
                {item.name}
              </span>
            </>
          )

          if (item.action) {
            return (
              <button
                key={item.name}
                onClick={item.action}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0 active:bg-slate-50 transition-colors"
              >
                {content}
              </button>
            )
          }

          return (
            <Link
              key={item.path}
              to={item.path!}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 gap-0 transition-colors",
                isActive ? "active:bg-orange-50" : "active:bg-slate-50"
              )}
            >
              {content}
            </Link>
          )
        })}
      </nav>

      {/* ── Mobile Full-Screen Menu Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl pb-safe max-h-[85vh] flex flex-col overflow-hidden">
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
              <p className="text-sm font-bold text-secondary">Navigation</p>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              {/* User card */}
              {user && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4">
                  <img
                    src={user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=SignConnect'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-secondary truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  {currentBadge && (
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", currentBadge.bg)}>
                      {currentBadge.label}
                    </Badge>
                  )}
                </div>
              )}

              {/* All nav items */}
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-slate-600 hover:bg-slate-100 hover:text-secondary"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-slate-400")} />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>

              {/* Sign out */}
              <button
                onClick={() => { setMobileMenuOpen(false); handleSignOut() }}
                className="flex items-center gap-3 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors w-full px-4 py-3 rounded-2xl hover:bg-red-50 mt-3"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
