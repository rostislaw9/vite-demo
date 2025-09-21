import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default AuthProtectedRoute;
