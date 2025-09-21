import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import AppSidebar from '@/components/AppSidebar';
import CommandPalette from '@/components/CommandPalette';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useChatNotifications } from '@/hooks/use-chat-notifications';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, user, loading } = useAuth();
  const location = useLocation();
  useChatNotifications(user?.id);

  const pageTitle =
    {
      '/dashboard': 'Dashboard',
      '/workspace': 'Workspace',
      '/profile': 'Profile',
      '/organizations': 'Organizations',
      '/settings': 'Settings',
      '/chat': 'Messages',
      '/admin': 'Admin',
    }[location.pathname] ?? 'Untitled';

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/auth" replace />;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2" />
            <div className="text-sm font-medium text-muted-foreground">
              {pageTitle}
            </div>
            <div className="ml-auto hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <span>Search</span>
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 pt-4">{children}</main>
        <CommandPalette />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AuthProtectedRoute;
