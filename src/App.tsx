// ==============================================================================
// SecureTalk Main Application Component & Router Configuration
// ==============================================================================

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DatabaseNoticeBanner } from './components/DatabaseNoticeBanner';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ChatsPage } from './pages/ChatsPage';
import { RequestsPage } from './pages/RequestsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsLayout } from './pages/SettingsLayout';
import { PrivacySettingsPage } from './pages/PrivacySettingsPage';
import { SecuritySettingsPage } from './pages/SecuritySettingsPage';
import { DevicesPage } from './pages/DevicesPage';
import { SecurityPage } from './pages/SecurityPage';
import { SecurityReportPage } from './pages/SecurityReportPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

const AuthRecoveryListener: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const isRecovery =
      hash.includes('type=recovery') ||
      (hash.includes('access_token') && !location.pathname.startsWith('/chat')) ||
      search.includes('type=recovery');

    if (isRecovery && location.pathname !== '/reset-password') {
      navigate(`/reset-password${search}${hash}`, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthRecoveryListener />
      <DatabaseNoticeBanner />
      <AuthProvider>
        <ChatProvider>
          <Routes>
            {/* Public Marketing & Legal Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/security/report" element={<SecurityReportPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Profile Discovery */}
            <Route path="/profile/:username" element={<ProfilePage />} />

            {/* Protected Messaging Routes */}
            <Route
              path="/chats"
              element={
                <ProtectedRoute>
                  <ChatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <ChatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute>
                  <RequestsPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Settings Routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/settings/privacy" replace />} />
              <Route path="privacy" element={<PrivacySettingsPage />} />
              <Route path="security" element={<SecuritySettingsPage />} />
              <Route path="devices" element={<DevicesPage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
