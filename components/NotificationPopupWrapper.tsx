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
    const checkSocket = async () => {
      if (typeof window === 'undefined') {
        setChecking(false);
        return;
      }

      try {
        // Try to dynamically import socket.io-client
        await import('socket.io-client');
        setSocketAvailable(true);
      } catch (error) {
        // socket.io-client is not installed
        console.warn('⚠️ socket.io-client not available, notifications disabled');
        setSocketAvailable(false);
      } finally {
        setChecking(false);
      }
    };

    checkSocket();
  }, []);

  // Don't render anything while checking or if socket is not available
  if (checking || !socketAvailable) {
    return null;
  }

  return <NotificationPopup onViewDetails={onViewDetails} />;
}


