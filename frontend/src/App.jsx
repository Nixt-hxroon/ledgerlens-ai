import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { DocumentUpload } from './pages/DocumentUpload';
import { DocumentDetails } from './pages/DocumentDetails';
import { ValidationCenter } from './pages/ValidationCenter';
import { CrossDocumentAnalysis } from './pages/CrossDocumentAnalysis';
import { AIInsights } from './pages/AIInsights';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F3] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F0F3] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="documents" element={<Documents />} />
              <Route path="documents/:id" element={<DocumentDetails />} />
              <Route path="upload" element={<DocumentUpload />} />
              <Route path="validation" element={<ValidationCenter />} />
              <Route path="comparison" element={<CrossDocumentAnalysis />} />
              <Route path="insights" element={<AIInsights />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;

