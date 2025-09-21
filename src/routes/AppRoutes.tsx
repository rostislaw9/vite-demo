import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import AuthPage from '@/pages/Auth';
import NotFoundPage from '@/pages/NotFound';
import Profile from '@/pages/Profile';
import AuthProtectedRoute from '@/routes/AuthProtectedRoute';
import AuthRedirectRoute from './AuthRedirectRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/profile" replace />} />

      <Route
        path="/auth"
        element={
          <AuthRedirectRoute>
            <AuthPage />
          </AuthRedirectRoute>
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

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;
