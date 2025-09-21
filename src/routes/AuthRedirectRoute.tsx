import React from 'react';
import { Navigate } from 'react-router-dom';

import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const AuthRedirectRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (firebaseUser && user) return <Navigate to="/" replace />;

  if (firebaseUser && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthRedirectRoute;
