import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import logo from '@/assets/react.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const { user, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleConfirmLogout = async () => {
    await toast
      .promise(logout(), {
        loading: 'Logging out…',
        success: 'Logged out',
        error: 'Logout failed',
      })
      .unwrap()
      .then(() => {
        setLogoutOpen(false);
        navigate('/auth');
      })
      .catch(() => {
        // keep modal open so user can retry or cancel
      });
  };

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-3">
      <div className="flex gap-6">
        <div className="flex items-center gap-1">
          <img src={logo} alt="Logo" className="w-8 h-8" />
          <p className="text-2xl font-sans font-medium">DEMO</p>
        </div>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/profile" className="px-3 py-2">
                  Profile
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            {firebaseUser?.photoURL ? (
              <AvatarImage
                src={firebaseUser.photoURL}
                alt={user?.displayName ?? ''}
              />
            ) : (
              <AvatarFallback>
                {user?.displayName?.[0] ?? user?.email?.[0] ?? '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">
            {user?.displayName ?? user?.email}
          </span>
        </div>

        <ResponsiveModal open={logoutOpen} onOpenChange={setLogoutOpen}>
          <ResponsiveModalTrigger asChild>
            <Button variant="outline" size="sm">
              Logout
            </Button>
          </ResponsiveModalTrigger>
          <ResponsiveModalContent>
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>Confirm Logout</ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Are you sure you want to log out?
                <br />
                You’ll need to sign in again.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <ResponsiveModalFooter>
              <ResponsiveModalClose asChild>
                <Button variant="outline">Cancel</Button>
              </ResponsiveModalClose>
              <Button onClick={handleConfirmLogout} variant="destructive">
                Logout
              </Button>
            </ResponsiveModalFooter>
          </ResponsiveModalContent>
        </ResponsiveModal>
      </div>
    </header>
  );
};

export default Header;
