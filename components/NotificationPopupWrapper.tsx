'use client';

import { useEffect, useState } from 'react';
import NotificationPopup from './NotificationPopup';
import { useRouter } from 'next/navigation';

interface NotificationPopupWrapperProps {
  onViewDetails?: (notificationId: string) => void;
}

/**
 * Wrapper component that safely loads NotificationPopup
 * Only renders if socket.io-client is available
 */
export default function NotificationPopupWrapper({ onViewDetails }: NotificationPopupWrapperProps) {
  const [socketAvailable, setSocketAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSocket = () => {
      if (typeof window === 'undefined') {
        setChecking(false);
        return;
      }

      // Check if Socket.IO is already loaded
      if ((window as any).io) {
        setSocketAvailable(true);
        setChecking(false);
        return;
      }

      // Try to load Socket.IO from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => {
        if ((window as any).io) {
          setSocketAvailable(true);
        } else {
          console.warn('⚠️ Socket.IO loaded but io function not found');
          setSocketAvailable(false);
        }
        setChecking(false);
      };
      script.onerror = () => {
        console.warn('⚠️ Failed to load Socket.IO from CDN, notifications disabled');
        setSocketAvailable(false);
        setChecking(false);
      };
      document.head.appendChild(script);
    };

    checkSocket();
  }, []);

  // Don't render anything while checking or if socket is not available
  if (checking || !socketAvailable) {
    return null;
  }

  return <NotificationPopup onViewDetails={onViewDetails} />;
}


