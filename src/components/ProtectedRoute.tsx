// ==============================================================================
// SecureTalk Protected Route
// Redirects unauthenticated users to /login and handles session loading states
// ==============================================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0d14] text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        <span className="text-xs font-mono">Initializing secure keystore...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
