'use client';

import { useState, useEffect, useRef } from 'react';
import { Truck, UtensilsCrossed, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Restaurant {
  id: string;
  name: string;
  address?: string;
  image_url?: string;
  rating?: number;
  is_premium: boolean;
  lat: number;
  lng: number;
}

interface Driver {
  id: string;
  driver_code: string;
  name: string;
  phone?: string;
  status: string;
  vehicle_type?: string;
  rating?: number;
  total_deliveries: number;
  lat: number;
  lng: number;
}

// Dynamically import Map component to avoid SSR issues
const MapComponent = dynamic(() => import('./MapComponent'), { 
  ssr: false,
  loading: () => <Loader message="Chargement de la carte..." />
});

export default function MapView() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showDrivers, setShowDrivers] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.747385, 6.27404]); // Sidi Abdellah par défaut
  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchMapData();
    setupSocketConnection();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Non authentifié');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch restaurants and drivers in parallel
      const [restaurantsRes, driversRes] = await Promise.all([
        fetch(`${API_URL}/admin/map/restaurants`, { headers }),
        fetch(`${API_URL}/admin/map/drivers`, { headers })
      ]);

      if (!restaurantsRes.ok || !driversRes.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const restaurantsData = await restaurantsRes.json();
      const driversData = await driversRes.json();

      console.log('Restaurants data:', restaurantsData);
      console.log('Drivers data:', driversData);

      if (restaurantsData.success) {
        const restaurantsList = restaurantsData.data || [];
        setRestaurants(restaurantsList);
        console.log('Restaurants loaded:', restaurantsList.length);
        // Centrer la carte sur le premier restaurant ou le centre par défaut
        if (restaurantsList.length > 0 && restaurantsList[0].lat && restaurantsList[0].lng) {
          setMapCenter([restaurantsList[0].lat, restaurantsList[0].lng]);
        }
      } else {
        console.warn('Restaurants data not successful:', restaurantsData);
      }

      if (driversData.success) {
        const driversList = driversData.data || [];
        setDrivers(driversList);
        console.log('Drivers loaded:', driversList.length);
      } else {
        console.warn('Drivers data not successful:', driversData);
      }

    } catch (err: any) {
      console.error('Error fetching map data:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketConnection = () => {
    // Load Socket.IO from CDN
    if (typeof window === 'undefined') return;

    // Check if Socket.IO is already loaded
    if ((window as any).io) {
      initializeSocket((window as any).io);
      return;
    }

    // Load Socket.IO from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = () => {
      const io = (window as any).io;
      if (io) {
        initializeSocket(io);
      } else {
        console.warn('Socket.IO loaded but io function not found');
      }
    };
    script.onerror = () => {
      console.warn('Failed to load Socket.IO from CDN');
    };
    document.head.appendChild(script);
  };

  const initializeSocket = (io: any) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : undefined
    });

    socketRef.current = socket;

    // Listen for driver location updates
    socket.on('driver:location_update', (data: { driver_id: string; lat: number; lng: number }) => {
      setDrivers(prev => prev.map(driver => 
        driver.id === data.driver_id 
          ? { ...driver, lat: data.lat, lng: data.lng }
          : driver
      ));
    });

    // Listen for all drivers updates
    socket.on('drivers', (event: string, data: any) => {
      if (event === 'location_update' && data.driver_id) {
        setDrivers(prev => prev.map(driver => 
          driver.id === data.driver_id 
            ? { ...driver, lat: data.lat, lng: data.lng }
            : driver
        ));
      }
    });

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO for real-time driver updates');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from Socket.IO');
    });

    socket.on('connect_error', (err: any) => {
      console.warn('Socket.IO connection error:', err);
    });
  };

  if (loading) {
    return <Loader message="Chargement de la carte..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Carte Interactive
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Visualisez les restaurants et livreurs en temps réel
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Restaurants */}
              <button
                onClick={() => setShowRestaurants(!showRestaurants)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showRestaurants
                    ? 'bg-green-600 dark:bg-green-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span className="hidden sm:inline">Restaurants</span>
                <span className="sm:hidden">Resto</span>
                {showRestaurants && (
                  <span className="ml-1 text-xs">({restaurants.length})</span>
                )}
              </button>

              {/* Toggle Drivers */}
              <button
                onClick={() => setShowDrivers(!showDrivers)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showDrivers
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">Livreurs</span>
                <span className="sm:hidden">Liv</span>
                {showDrivers && (
                  <span className="ml-1 text-xs">({drivers.length})</span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchMapData}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Actualiser</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full" style={{ height: 'calc(100vh - 200px)' }}>
        <MapComponent
          restaurants={showRestaurants ? restaurants : []}
          drivers={showDrivers ? drivers : []}
          center={mapCenter}
        />
      </div>
    </div>
  );
}
