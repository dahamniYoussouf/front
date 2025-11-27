'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Store, 
  Truck, 
  Ban,
  Eye,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface NotificationData {
  id: string;
  type: 'pending_order_timeout' | 'restaurant_unresponsive' | 'driver_unresponsive' | 'driver_excessive_cancellations';
  message: string;
  order?: any;
  restaurant?: any;
  driver?: any;
  created_at: string;
}

interface NotificationPopupProps {
  onViewDetails?: (notificationId: string) => void;
}

export default function NotificationPopup({ onViewDetails }: NotificationPopupProps) {
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [show, setShow] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [socketAvailable, setSocketAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load Socket.IO from CDN
    let socketInstance: any = null;

    const initSocket = () => {
      try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
          console.log('⚠️ No token found, skipping socket connection');
          return;
        }

        // Client-side only
        if (typeof window === 'undefined') return;

        const loadSocketIO = () => {
          return new Promise<any>((resolve, reject) => {
            // Check if Socket.IO is already loaded
            if ((window as any).io) {
              resolve((window as any).io);
              return;
            }

            // Load Socket.IO from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = () => {
              const io = (window as any).io;
              if (io) {
                resolve(io);
              } else {
                reject(new Error('io function not found after loading Socket.IO'));
              }
            };
            script.onerror = () => {
              reject(new Error('Failed to load Socket.IO from CDN'));
            };
            document.head.appendChild(script);
          });
        };

        loadSocketIO()
          .then((io: any) => {
            setSocketAvailable(true);
            
            socketInstance = io(API_URL, {
              auth: { token },
              transports: ['websocket', 'polling'],
              reconnection: true,
              reconnectionDelay: 1000,
              reconnectionAttempts: 5
            });

            socketInstance.on('connect', () => {
              console.log('✅ Socket connected for notifications');
              socketInstance.emit('join', 'admin');
              socketInstance.emit('join', 'admins');
            });

            socketInstance.on('connect_error', (error: any) => {
              console.error('❌ Socket connection error:', error);
            });

            socketInstance.on('disconnect', () => {
              console.log('⚠️ Socket disconnected');
            });

            // Listen for new notifications
            socketInstance.on('new_notification', (data: NotificationData) => {
              console.log('🔔 New notification received:', data);
              setNotification(data);
              setShow(true);
              
              // Play notification sound if available
              try {
                playNotificationSound();
              } catch (e) {
                console.log('Could not play sound:', e);
              }
              
              // Show browser notification
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('Nouvelle Notification Admin 🚨', {
                    body: data.message,
                    icon: '/logo_green.png',
                    requireInteraction: true
                  });
                } catch (e) {
                  console.log('Could not show browser notification:', e);
                }
              }
            });

            socketInstance.on('driver_alert', (data: NotificationData) => {
              console.log('🚨 Driver alert received:', data);
              setNotification(data);
              setShow(true);
              try {
                playNotificationSound();
              } catch (e) {
                console.log('Could not play sound:', e);
              }
            });

            setSocket(socketInstance);
          })
          .catch((error: any) => {
            console.warn('⚠️ Socket.IO not available, notifications will not work in real-time');
            console.warn('Error:', error?.message || error);
            setSocketAvailable(false);
          });
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      initSocket();

      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(err => {
          console.log('Notification permission error:', err);
        });
      }
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
    };
  }, []);

  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    
    try {
      // Create a simple notification sound
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const handleClose = () => {
    setShow(false);
    setTimeout(() => setNotification(null), 300);
  };

  const handleMarkAsRead = async () => {
    if (!notification) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`${API_URL}/admin/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        handleClose();
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = () => {
    if (notification && onViewDetails) {
      onViewDetails(notification.id);
    } else {
      router.push('/admin/notifications');
    }
    handleClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_order_timeout':
        return <Clock className="w-5 h-5" />;
      case 'restaurant_unresponsive':
        return <Store className="w-5 h-5" />;
      case 'driver_unresponsive':
        return <Truck className="w-5 h-5" />;
      case 'driver_excessive_cancellations':
        return <Ban className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'pending_order_timeout':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'restaurant_unresponsive':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'driver_unresponsive':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'driver_excessive_cancellations':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'pending_order_timeout':
        return 'Commande en attente';
      case 'restaurant_unresponsive':
        return 'Restaurant ne répond pas';
      case 'driver_unresponsive':
        return 'Livreur ne répond pas';
      case 'driver_excessive_cancellations':
        return 'Livreur - Annulations excessives';
      default:
        return 'Notification';
    }
  };

  // Don't render if socket.io-client is not available and no notification to show
  // But still render if we have a notification to show (even if socket is not available)
  if (!socketAvailable && !notification && !show) {
    return null;
  }
  
  if (!show || !notification) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Popup */}
      <div className="fixed bottom-4 right-4 w-full max-w-md bg-white rounded-lg shadow-2xl z-50 border border-gray-200 animate-slide-up">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${getNotificationColor(notification.type)}`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {getNotificationTitle(notification.type)}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(notification.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          <div className="mb-4">
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {notification.message}
            </p>
          </div>

          {/* Order details if available */}
          {notification.order && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {notification.order.order_number && (
                  <div>
                    <p className="text-gray-500">Commande</p>
                    <p className="font-semibold text-gray-900">
                      {notification.order.order_number}
                    </p>
                  </div>
                )}
                {notification.order.total_amount && (
                  <div>
                    <p className="text-gray-500">Montant</p>
                    <p className="font-semibold text-gray-900">
                      {notification.order.total_amount} DA
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleViewDetails}
              className="flex-1 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Voir détails
            </button>
            <button
              onClick={handleMarkAsRead}
              disabled={actionLoading}
              className="px-3 py-2 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {actionLoading ? '...' : 'Marquer lu'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

