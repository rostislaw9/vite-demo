import React from 'react';
import { Navigate } from 'react-router-dom';

import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';

const AuthRedirectRoute: React.FC<{ children: React.ReactNode }> = ({
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

  if (firebaseUser) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default AuthRedirectRoute;
