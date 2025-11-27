'use client';

import { useEffect, useRef, useState } from 'react';
import { UtensilsCrossed, Truck, AlertCircle } from 'lucide-react';

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

interface MapComponentProps {
  restaurants: Restaurant[];
  drivers: Driver[];
  center: [number, number];
}

export default function MapComponent({ restaurants, drivers, center }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leafletLoadedRef = useRef(false);

  // Load Leaflet from CDN
  useEffect(() => {
    if (typeof window === 'undefined' || leafletLoadedRef.current) return;

    // Check if Leaflet is already loaded
    if ((window as any).L) {
      console.log('✅ Leaflet already loaded');
      leafletLoadedRef.current = true;
      setMapLoaded(true);
      return;
    }

    // Check if already loading
    const existingScript = document.querySelector('script[src*="leaflet"]');
    if (existingScript) {
      console.log('⏳ Leaflet script already loading, waiting...');
      const checkInterval = setInterval(() => {
        if ((window as any).L) {
          clearInterval(checkInterval);
          leafletLoadedRef.current = true;
          setMapLoaded(true);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!(window as any).L) {
          setError('Timeout lors du chargement de Leaflet. Vérifiez votre connexion internet.');
        }
      }, 10000);
      
      return;
    }

    console.log('📦 Loading Leaflet from CDN...');

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      console.log('✅ Leaflet loaded successfully');
      leafletLoadedRef.current = true;
      setMapLoaded(true);
    };
    script.onerror = (err) => {
      console.error('❌ Error loading Leaflet:', err);
      setError('Impossible de charger la bibliothèque de cartes depuis le CDN. Vérifiez votre connexion internet.');
    };
    
    // Timeout after 15 seconds
    const timeout = setTimeout(() => {
      if (!(window as any).L) {
        console.error('❌ Timeout loading Leaflet');
        setError('Timeout lors du chargement de Leaflet. Vérifiez votre connexion internet.');
      }
    }, 15000);
    
    script.onload = () => {
      clearTimeout(timeout);
      console.log('✅ Leaflet loaded successfully');
      leafletLoadedRef.current = true;
      setMapLoaded(true);
    };
    
    document.head.appendChild(script);
  }, []);

  // Initialize map and markers when Leaflet is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || typeof window === 'undefined') return;

    const L = (window as any).L;
    if (!L) {
      setError('Leaflet n\'est pas disponible');
      return;
    }

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      try {
        const map = L.map(mapRef.current!, {
          center,
          zoom: 13
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
      } catch (err: any) {
        console.error('Error initializing map:', err);
        setError('Erreur lors de l\'initialisation de la carte: ' + (err.message || err));
        return;
      }
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    // Add restaurant markers
    restaurants.forEach((restaurant) => {
      if (!mapInstanceRef.current || !restaurant.lat || !restaurant.lng) return;

      try {
        const marker = L.marker([restaurant.lat, restaurant.lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        }).addTo(mapInstanceRef.current);

        const popupContent = `
          <div style="min-width: 200px; padding: 8px;">
            <div style="display: flex; align-items: start; gap: 12px;">
              ${restaurant.image_url 
                ? `<img src="${restaurant.image_url}" alt="${restaurant.name}" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                   <div style="display: none; width: 64px; height: 64px; border-radius: 8px; background: #e5e7eb; align-items: center; justify-content: center;">
                     <svg style="width: 32px; height: 32px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                     </svg>
                   </div>`
                : `<div style="width: 64px; height: 64px; border-radius: 8px; background: #e5e7eb; display: flex; align-items: center; justify-content: center;">
                     <svg style="width: 32px; height: 32px; color: #9ca3af;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                     </svg>
                   </div>`
              }
              <div style="flex: 1;">
                <h3 style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">
                  ${restaurant.name}
                </h3>
                ${restaurant.rating 
                  ? `<div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                       <span style="color: #fbbf24; font-size: 12px;">★</span>
                       <span style="font-size: 12px; color: #4b5563;">${restaurant.rating.toFixed(1)}</span>
                     </div>`
                  : ''
                }
                ${restaurant.address 
                  ? `<p style="font-size: 12px; color: #6b7280; margin: 0; line-clamp: 2;">${restaurant.address}</p>`
                  : ''
                }
                ${restaurant.is_premium 
                  ? `<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #fef3c7; color: #92400e; font-size: 11px; border-radius: 4px;">Premium</span>`
                  : ''
                }
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      } catch (err) {
        console.error('Error adding restaurant marker:', err);
      }
    });

    // Add driver markers
    drivers.forEach((driver) => {
      if (!mapInstanceRef.current || !driver.lat || !driver.lng) return;

      try {
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'available': return '#10b981';
            case 'busy': return '#f59e0b';
            case 'offline': return '#6b7280';
            default: return '#3b82f6';
          }
        };

        const getStatusLabel = (status: string) => {
          switch (status) {
            case 'available': return 'Disponible';
            case 'busy': return 'En livraison';
            case 'offline': return 'Hors ligne';
            default: return status;
          }
        };

        const marker = L.marker([driver.lat, driver.lng], {
          icon: L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
            shadowUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
          })
        }).addTo(mapInstanceRef.current);

        const popupContent = `
          <div style="min-width: 200px; padding: 8px;">
            <div style="display: flex; align-items: start; gap: 12px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: #dbeafe; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg style="width: 24px; height: 24px; color: #2563eb;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
              </div>
              <div style="flex: 1;">
                <h3 style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">
                  ${driver.name}
                </h3>
                <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                  Code: ${driver.driver_code}
                </p>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="padding: 2px 8px; background: ${getStatusColor(driver.status)}; color: white; font-size: 11px; border-radius: 4px;">
                    ${getStatusLabel(driver.status)}
                  </span>
                </div>
                ${driver.rating 
                  ? `<p style="font-size: 12px; color: #6b7280; margin: 0;">Note: ${driver.rating.toFixed(1)} ⭐</p>`
                  : ''
                }
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
                  Livraisons: ${driver.total_deliveries}
                </p>
                ${driver.vehicle_type 
                  ? `<p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0 0;">${driver.vehicle_type}</p>`
                  : ''
                }
              </div>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      } catch (err) {
        console.error('Error adding driver marker:', err);
      }
    });

    // Center map
    if (mapInstanceRef.current && center && center[0] && center[1]) {
      mapInstanceRef.current.setView(center, mapInstanceRef.current.getZoom());
    }

    setError(null);
  }, [mapLoaded, restaurants, drivers, center]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        markersRef.current.forEach(marker => {
          mapInstanceRef.current.removeLayer(marker);
        });
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-[1000] border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">Légende</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Restaurants ({restaurants.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Livreurs ({drivers.length})</span>
          </div>
        </div>
      </div>
    </>
  );
}
