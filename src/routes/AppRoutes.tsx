import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AdminPage from '@/pages/Admin';
import AuthPage from '@/pages/Auth';
import ChatPage from '@/pages/Chat';
import DashboardPage from '@/pages/Dashboard';
import NotFoundPage from '@/pages/NotFound';
import OrganizationsPage from '@/pages/Organizations';
import Profile from '@/pages/Profile';
import SettingsPage from '@/pages/Settings';
import WorkspacePage from '@/pages/Workspace';
import AuthProtectedRoute from '@/routes/AuthProtectedRoute';
import AuthRedirectRoute from './AuthRedirectRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/auth"
        element={
          <AuthRedirectRoute>
            <AuthPage />
          </AuthRedirectRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <AuthProtectedRoute>
            <DashboardPage />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <AuthProtectedRoute>
            <ChatPage />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/workspace"
        element={
          <AuthProtectedRoute>
            <WorkspacePage />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/organizations"
        element={
          <AuthProtectedRoute>
            <OrganizationsPage />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <AuthProtectedRoute>
            <Profile />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <AuthProtectedRoute>
            <SettingsPage />
          </AuthProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <AuthProtectedRoute>
            <AdminPage />
          </AuthProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
