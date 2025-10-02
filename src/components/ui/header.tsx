import React from 'react'
import { Building2, User, LogIn, LogOut } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-40 bg-[#F9F7E7]/95 backdrop-blur-lg border-b border-[#053725]/10",
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Company Logo and Name */}
        <Link to="/" className="flex items-center gap-3 relative">
          <div className="p-2 rounded-full bg-gradient-to-br from-[#053725] to-[#053725]/80 shadow-[0_4px_20px_rgba(5,55,37,0.3)] neumorphic">
            <Building2 size={24} className="text-[#F9F7E7]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#053725] tracking-tight">PropertyPro</h1>
            <p className="text-xs text-[#053725]/60 font-medium">Simplifying Property Management</p>
          </div>
        </Link>

        {/* Right side buttons */}
        {user ? (
          // Logged in: Show user name + Logout only (Dashboard is in NavBar)
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#053725] hidden sm:inline">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] text-sm font-semibold rounded-full hover:shadow-[0_6px_20px_rgba(5,55,37,0.4)] transition-all duration-300 shadow-[0_4px_16px_rgba(5,55,37,0.25)] neumorphic"
            >
              <LogOut size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          // Not logged in: Show Login/Sign Up buttons
          <div className="flex items-center gap-3">
            <Link 
              to="/auth/login"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#053725] hover:text-[#053725]/80 transition-colors duration-200"
            >
              <LogIn size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Login</span>
            </Link>
            
            <Link 
              to="/auth/signup"
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] text-sm font-semibold rounded-full hover:shadow-[0_6px_20px_rgba(5,55,37,0.4)] transition-all duration-300 shadow-[0_4px_16px_rgba(5,55,37,0.25)] neumorphic"
            >
              <User size={16} strokeWidth={2} />
              <span className="hidden sm:inline">Sign Up</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
