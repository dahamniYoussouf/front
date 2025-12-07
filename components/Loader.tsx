'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loader({ message = 'Chargement...', fullScreen = true }: LoaderProps) {
  const [moduleName, setModuleName] = useState('');

  useEffect(() => {
    // Extraire le nom du module depuis l'URL
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const parts = path.split('/').filter(p => p);
      
      // Déterminer le nom du module basé sur la route
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        const moduleNames: Record<string, string> = {
          'dashboard': 'Tableau de bord',
          'clients': 'Clients',
          'livreurs': 'Livreurs',
          'restaurants': 'Restaurants',
          'commandes': 'Commandes',
          'notifications': 'Notifications',
          'configurations': 'Configurations',
          'admins': 'Administrateurs',
          'announcements': 'Annonces',
          'favories': 'Favoris',
          'profil': 'Profil'
        };
        setModuleName(moduleNames[lastPart] || lastPart.charAt(0).toUpperCase() + lastPart.slice(1));
      } else {
        setModuleName('Application');
      }
    }
  }, []);

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Logo avec animation */}
      <div className="relative">
        <div className="animate-pulse-scale">
          <Image
            src="/logo_green.png"
            alt="Tawsil Logo"
            width={120}
            height={60}
            className="object-contain"
            priority
          />
        </div>
      </div>
      
      {/* Message de chargement */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
          {message}
        </p>
        {moduleName && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Chargement du module <span className="font-semibold">{moduleName}</span>
          </p>
        )}
      </div>

      {/* Barre de progression animée */}
      <div className="w-64 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-green-600 dark:bg-green-500 rounded-full animate-progress"></div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      {content}
    </div>
  );
}







