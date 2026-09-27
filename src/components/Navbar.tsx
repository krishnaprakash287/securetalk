// ==============================================================================
// SecureTalk Navbar Component
// Responsive navigation, search trigger, request count badge, and session controls
// ==============================================================================

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  UserPlus,
  Shield,
  Settings,
  Search,
  LogOut,
  Menu,
  X,
  Lock,
} from 'lucide-react';
import { Logo } from './Logo';
import { UserAvatar } from './UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

interface NavbarProps {
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const { user, profile, logout } = useAuth();
  const { pendingRequestsCount } = useChat();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/chats' && (location.pathname.startsWith('/chat/') || location.pathname === '/chats')) {
      return true;
    }
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentUsername =
    profile?.username || (user?.user_metadata?.username as string) || user?.email?.split('@')[0] || 'user';
  const currentDisplayName =
    profile?.display_name || (user?.user_metadata?.display_name as string) || currentUsername;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Brand Logo */}
        <Logo />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
          {user ? (
            <>
              {/* Search User Button */}
              {onOpenSearch && (
                <button
                  onClick={onOpenSearch}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white bg-[#0e1422]/60 hover:bg-[#141b2e] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-150 text-xs font-normal mr-2 shadow-inner"
                  title="Search user by @username (Press / or click)"
                >
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">Search @handle...</span>
                  <kbd className="text-[10px] font-mono bg-black/40 border border-white/[0.1] px-1.5 py-0.5 rounded text-slate-400">
                    /
                  </kbd>
                </button>
              )}

              <Link
                to="/chats"
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive('/chats')
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversations</span>
              </Link>

              <Link
                to="/requests"
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive('/requests')
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 rounded-full shadow-sm shadow-emerald-500/40 animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>

              <Link
                to="/security"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive('/security')
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security</span>
              </Link>

              <Link
                to="/settings"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  location.pathname.startsWith('/settings')
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>

              {/* User Profile Pill & Quick Actions */}
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/[0.08]">
                <Link
                  to={`/profile/${currentUsername}`}
                  className="flex items-center gap-2.5 px-2.5 py-1 rounded-lg bg-[#0e1422]/60 hover:bg-[#151c2e] border border-white/[0.07] hover:border-emerald-500/40 transition-all duration-150 group"
                  title={`View profile for @${currentUsername}`}
                >
                  <UserAvatar name={currentDisplayName} avatarUrl={profile?.avatar_url} size="xs" online={true} />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors leading-tight truncate max-w-[110px]">
                      {currentDisplayName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-medium leading-tight">
                      @{currentUsername}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40"
                  title="Sign out of active session"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/security"
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              >
                Security Specs
              </Link>
              <Link
                to="/privacy"
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              >
                Privacy Model
              </Link>
              <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/[0.08]">
                <Link
                  to="/login"
                  className="btn-secondary text-xs py-1.5 px-3.5"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-1.5 px-3.5"
                >
                  Create Account
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <Link
              to={`/profile/${currentUsername}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0e1422] border border-white/[0.08] text-[11px] font-mono text-emerald-400"
              title="View my profile"
            >
              <UserAvatar name={currentDisplayName} avatarUrl={profile?.avatar_url} size="xs" online={true} />
              <span className="truncate max-w-[80px]">@{currentUsername}</span>
            </Link>
          )}

          {onOpenSearch && user && (
            <button
              onClick={onOpenSearch}
              className="p-2 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg"
              aria-label="Search users"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#090d16] px-4 py-4 space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          {user ? (
            <>
              {/* Profile Card in Drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <Link
                  to={`/profile/${currentUsername}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 group"
                >
                  <UserAvatar name={currentDisplayName} avatarUrl={profile?.avatar_url} size="md" online={true} />
                  <div>
                    <div className="font-semibold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">
                      {currentDisplayName}
                    </div>
                    <div className="font-mono text-xs text-emerald-400 font-medium">@{currentUsername}</div>
                  </div>
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="grid grid-cols-1 gap-1 pt-1">
                <Link
                  to="/chats"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/chats')
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Conversations</span>
                </Link>

                <Link
                  to="/requests"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/requests')
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Chat Requests</span>
                  </div>
                  {pendingRequestsCount > 0 && (
                    <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500 text-slate-950 rounded-full">
                      {pendingRequestsCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/security"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/security')
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Security Specs</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/settings')
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>Settings & Keystore</span>
                </Link>
              </div>

              {/* Cryptographic Keystore badge */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>E2EE Active</span>
                </span>
                <span>ECDH P-256</span>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Link
                to="/security"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05]"
              >
                Security Architecture
              </Link>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05]"
              >
                Privacy Policy
              </Link>
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary text-xs py-2 text-center"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-xs py-2 text-center"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
