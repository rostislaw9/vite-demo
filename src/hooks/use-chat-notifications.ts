import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

import { type DirectMessage } from '@/utils/api';

export function useChatNotifications(userId: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
      auth: { userId },
      transports: ['websocket'],
    });

    socket.on('dm:message', (msg: DirectMessage) => {
      if (msg.senderId === userId) return;
      if (pathnameRef.current === '/chat') return;

      const senderName =
        msg.sender?.displayName ?? msg.sender?.email ?? 'Someone';

      toast.info(`New message from ${senderName}`, {
        action: {
          label: 'Open',
          onClick: () => navigateRef.current(`/chat?peer=${msg.senderId}`),
        },
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);
}
