'use client'
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, Users, Truck, ClipboardList, Settings, LogOut } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">{'<>'}</span>
            </div>
            <span className="text-xl font-bold text-gray-900">tawsil</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
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
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.title}</span>
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
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Breadcrumb ou titre de page peuvent aller ici */}
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Settings className="w-5 h-5" />
            </button>
            
            {/* User Avatar */}
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">AD</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;