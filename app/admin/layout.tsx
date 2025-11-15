'use client'
import { useRouter, usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Users, Truck, ClipboardList, Settings, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      title: 'Gestion Livreurs',
      icon: Truck,
      href: '/admin/livreurs',
      path: '/admin/livreurs'
    },
    {
      title: 'Gestion Commandes',
      icon: ClipboardList,
      href: '/admin/commandes',
      path: '/admin/commandes'
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    router.push('/login');
  };

  const getBreadcrumb = (pathname: string) => {
    const routes: Record<string, string> = {
      '/admin/dashboard': 'Tableau de Bord',
      '/admin/restaurants': 'Gestion des Restaurants',
      '/admin/clients': 'Gestion des Clients',
      '/admin/livreurs': 'Gestion des Livreurs',
      '/admin/commandes': 'Gestion des Commandes'
    };
    return routes[pathname] || '';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between border-b border-gray-200 px-4">
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
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
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
                    ? 'bg-green-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.title}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer - Logout */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Bouton menu hamburger sur mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            <button 
              onClick={() => router.back()}
              className="hidden md:block text-gray-400 hover:text-gray-600"
            >
              ←
            </button>
            <span className="text-gray-700 font-medium text-sm md:text-base truncate">
              {getBreadcrumb(pathname)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
            
            {/* User Avatar */}
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-xs md:text-sm font-semibold text-gray-700">AD</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}