'use client'
import { useRouter, usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Users, Truck, ClipboardList, LogOut, Menu, X, ShieldCheck, Megaphone, Bell, Heart, User, Moon, Sun, Map, Database, UserCheck, Activity, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import NotificationPopupWrapper from '@/components/NotificationPopupWrapper';
import { useTheme } from '@/contexts/ThemeContext';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Vérifier l'authentification
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Fermer le sidebar lors du changement de route sur mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const menuItems = [
    {
      title: 'Tableau de Bord',
      icon: Home,
      href: '/admin/dashboard',
      path: '/admin/dashboard'
    },
    {
      title: 'Monitoring',
      icon: Activity,
      href: '/admin/monitoring',
      path: '/admin/monitoring'
    },
    {
      title: 'Gestion Restaurants',
      icon: UtensilsCrossed,
      href: '/admin/restaurants',
      path: '/admin/restaurants'
    },
    {
      title: 'Gestion Clients',
      icon: Users,
      href: '/admin/clients',
      path: '/admin/clients'
    },
    {
      title: 'Favoris Clients',
      icon: Heart,
      href: '/admin/favories',
      path: '/admin/favories'
    },
    {
      title: 'Gestion Livreurs',
      icon: Truck,
      href: '/admin/livreurs',
      path: '/admin/livreurs'
    },
    {
      title: 'Gestion Caissiers',
      icon: UserCheck,
      href: '/admin/cashiers',
      path: '/admin/cashiers'
    },
    {
      title: 'Gestion Admins',
      icon: ShieldCheck,
      href: '/admin/admins',
      path: '/admin/admins'
    },
    {
      title: 'Gestion Commandes',
      icon: ClipboardList,
      href: '/admin/commandes',
      path: '/admin/commandes'
    },
    {
      title: 'Gestion Annonces',
      icon: Megaphone,
      href: '/admin/announcements',
      path: '/admin/announcements'
    },
    {
      title: 'Gestion Notifications',
      icon: Bell,
      href: '/admin/notifications',
      path: '/admin/notifications'
    },
    {
      title: 'Gestion Configurations',
      icon: Settings,
      href: '/admin/configurations',
      path: '/admin/configurations'
    },
    {
      title: 'Carte Interactive',
      icon: Map,
      href: '/admin/map',
      path: '/admin/map'
    },
    {
      title: 'Gestion du Cache',
      icon: Database,
      href: '/admin/cache',
      path: '/admin/cache'
    },
    {
      title: 'Mon Profil',
      icon: User,
      href: '/admin/profil',
      path: '/admin/profil'
    }
  ];


  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const getBreadcrumb = (pathname: string) => {
    const routes: Record<string, string> = {
      '/admin/dashboard': 'Tableau de Bord',
      '/admin/monitoring': 'Monitoring',
      '/admin/restaurants': 'Gestion des Restaurants',
      '/admin/clients': 'Gestion des Clients',
      '/admin/favories': 'Favoris des Clients',
      '/admin/livreurs': 'Gestion des Livreurs',
      '/admin/admins': 'Gestion des Administrateurs',
      '/admin/commandes': 'Gestion des Commandes',
      '/admin/announcements': 'Gestion des Annonces',
      '/admin/notifications': 'Gestion des Notifications',
      '/admin/configurations': 'Gestion des Configurations',
      '/admin/cache': 'Gestion du Cache',
      '/admin/profil': 'Mon Profil'
    };
    return routes[pathname] || '';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/75 dark:bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-4 bg-white dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <Image
              src="/logo_green.png"
              alt="logo"
              width={100}
              height={50}
            />
          </div>
          {/* Bouton fermer sur mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-600 dark:bg-green-600 text-white shadow-sm'
                    : 'text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer - Logout */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-4 md:px-6 shadow-sm dark:shadow-slate-900/50">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Bouton menu hamburger sur mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <button 
              onClick={() => router.back()}
              className="hidden md:block text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              ←
            </button>
            <span className="text-gray-900 dark:text-slate-100 font-semibold text-sm md:text-base truncate">
              {getBreadcrumb(pathname)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-gray-300 dark:border-slate-600">
              <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-slate-200">AD</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900">
          {children}
        </main>
      </div>

      {/* Notification Popup - Only render if socket.io-client is available */}
      <NotificationPopupWrapper 
        onViewDetails={(notificationId) => {
          router.push(`/admin/notifications`);
        }}
      />
    </div>
  );
}
