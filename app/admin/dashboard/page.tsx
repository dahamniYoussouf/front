'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingBag, 
  Store, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Banknote ,
  AlertCircle,
  RefreshCw,
  LogOut
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Stats {
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    inProgress: number;
    growth: number;
  };
  revenue: {
    total: number;
    average: number;
    growth: number;
  };
  restaurants: {
    total: number;
    active: number;
    premium: number;
    approved: number;
  };
  drivers: {
    total: number;
    available: number;
    busy: number;
    offline: number;
  };
  clients: {
    total: number;
    active: number;
    verified: number;
  };
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Dashboard mounted');
    console.log('👤 User:', user);
    fetchDashboardStats();
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try both token keys for compatibility
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No token found');
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 2000);
        return;
      }

      console.log('🔑 Token found:', token.substring(0, 20) + '...');

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('🌐 Base URL:', baseURL);

      // Fetch all statistics in parallel
      console.log('📊 Fetching statistics...');
      const [ordersRes, restaurantsRes, driversRes, clientsRes] = await Promise.all([
        fetch(`${baseURL}/api/v1/orders?limit=100000`, { headers }),
        fetch(`${baseURL}/api/v1/restaurants/filter`, { 
          method: 'POST',
          headers,
          body: JSON.stringify({ pageSize: 10000 })
        }),
        fetch(`${baseURL}/api/v1/drivers/getall`, { headers }),
        fetch(`${baseURL}/api/v1/clients/getall`, { headers })
      ]);

      console.log('📡 Response statuses:', {
        orders: ordersRes.status,
        restaurants: restaurantsRes.status,
        drivers: driversRes.status,
        clients: clientsRes.status
      });

      // Check for authentication errors
      if (ordersRes.status === 401 || restaurantsRes.status === 401 || 
          driversRes.status === 401 || clientsRes.status === 401) {
        console.error('❌ 401 Unauthorized');
        setError('Session expirée. Redirection...');
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 2000);
        return;
      }

      // Check if responses are JSON
      const contentType = ordersRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Response is not JSON:', contentType);
        const text = await ordersRes.text();
        console.error('Response preview:', text.substring(0, 200));
        throw new Error('Le serveur a renvoyé une réponse invalide. Vérifiez que l\'API est accessible.');
      }

      if (!ordersRes.ok) {
        const errorData = await ordersRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Orders: ${errorData.message || ordersRes.statusText}`);
      }
      if (!restaurantsRes.ok) {
        const errorData = await restaurantsRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Restaurants: ${errorData.message || restaurantsRes.statusText}`);
      }
      if (!driversRes.ok) {
        const errorData = await driversRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Drivers: ${errorData.message || driversRes.statusText}`);
      }
      if (!clientsRes.ok) {
        const errorData = await clientsRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Clients: ${errorData.message || clientsRes.statusText}`);
      }

      console.log('✅ All responses OK, parsing JSON...');

      const ordersData = await ordersRes.json();
      const restaurantsData = await restaurantsRes.json();
      const driversData = await driversRes.json();
      const clientsData = await clientsRes.json();

      console.log('📦 Data received:', {
        orders: ordersData.data?.length || 0,
        restaurants: restaurantsData.data?.length || 0,
        drivers: driversData.data?.length || 0,
        clients: clientsData.data?.length || 0
      });

      // Process orders statistics
      const orders = ordersData.data || [];
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
      const completedOrders = orders.filter((o: any) => o.status === 'delivered').length;
      const cancelledOrders = orders.filter((o: any) => o.status === 'declined').length;
      const inProgressOrders = orders.filter((o: any) => 
        ['accepted', 'preparing', 'assigned', 'delivering', 'arrived'].includes(o.status)
      ).length;

      // Calculate revenue
      const totalRevenue = orders
        .filter((o: any) => o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0);

      const avgOrderValue = completedOrders > 0 
        ? totalRevenue / completedOrders 
        : 0;

      // Process restaurants statistics
      const restaurants = restaurantsData.data || [];
      const totalRestaurants = restaurants.length;
      const activeRestaurants = restaurants.filter((r: any) => r.is_active).length;
      const premiumRestaurants = restaurants.filter((r: any) => r.is_premium).length;
      const approvedRestaurants = restaurants.filter((r: any) => r.status === 'approved').length;

      // Process drivers statistics
      const drivers = driversData.data || [];
      const totalDrivers = drivers.length;
      const availableDrivers = drivers.filter((d: any) => d.status === 'available').length;
      const busyDrivers = drivers.filter((d: any) => d.status === 'busy').length;
      const offlineDrivers = drivers.filter((d: any) => d.status === 'offline').length;

      // Process clients statistics
      const clients = clientsData.data || [];
      const totalClients = clients.length;
      const activeClients = clients.filter((c: any) => c.is_active).length;
      const verifiedClients = clients.filter((c: any) => c.is_verified).length;

      // Calculate growth (mock - you'd compare with previous period)
      const orderGrowth = 12.5;
      const revenueGrowth = 18.3;

      const statsData = {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          inProgress: inProgressOrders,
          growth: orderGrowth
        },
        revenue: {
          total: totalRevenue,
          average: avgOrderValue,
          growth: revenueGrowth
        },
        restaurants: {
          total: totalRestaurants,
          active: activeRestaurants,
          premium: premiumRestaurants,
          approved: approvedRestaurants
        },
        drivers: {
          total: totalDrivers,
          available: availableDrivers,
          busy: busyDrivers,
          offline: offlineDrivers
        },
        clients: {
          total: totalClients,
          active: activeClients,
          verified: verifiedClients
        }
      };

      console.log('✅ Statistics calculated successfully');
      setStats(statsData);

    } catch (err: any) {
      console.error('❌ Error fetching dashboard stats:', err);
      setError(err.message || 'Impossible de charger les statistiques');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('🔓 Logging out...');
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
          {user?.email && (
            <p className="mt-2 text-sm text-gray-400">Connecté: {user.email}</p>
          )}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Tableau de bord administrateur
              </h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Erreur de chargement
              </h2>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={fetchDashboardStats}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réessayer
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left text-xs text-gray-600">
                  <p className="font-semibold mb-2">🔍 Debug Information:</p>
                  <p>• User: {user?.email || 'Not logged in'}</p>
                  <p>• Role: {user?.role || 'Unknown'}</p>
                  <p>• Token (access_token): {localStorage.getItem('access_token') ? '✓ Present' : '✗ Missing'}</p>
                  <p>• Token (token): {localStorage.getItem('token') ? '✓ Present' : '✗ Missing'}</p>
                  <p>• API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</p>
                  <p>• Error: {error}</p>
                  <button
                    onClick={() => {
                      console.log('Full localStorage:', localStorage);
                      console.log('User:', user);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Log full debug info to console
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tableau de bord administrateur
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDashboardStats}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">{user?.email}</span>
             
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Orders */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Commandes</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.orders.total.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">
                      +{stats.orders.growth}%
                    </span>
                    <span className="text-gray-500 ml-2">ce mois</span>
                  </div>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Revenu Total</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.revenue.total.toLocaleString('fr-DZ', { 
                      style: 'currency', 
                      currency: 'DZD',
                      minimumFractionDigits: 0
                    })}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">
                      +{stats.revenue.growth}%
                    </span>
                    <span className="text-gray-500 ml-2">ce mois</span>
                  </div>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
<Banknote className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* Active Restaurants */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Restaurants Actifs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.restaurants.active}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    sur {stats.restaurants.total} total
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Store className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Online Drivers */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Livreurs Disponibles</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stats.drivers.available}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {stats.drivers.busy} en livraison
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Truck className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Order Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Order Status */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                État des Commandes
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-gray-900">En attente</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-600">
                    {stats.orders.pending}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">En cours</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.orders.inProgress}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Livrées</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    {stats.orders.completed}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-900">Annulées</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    {stats.orders.cancelled}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Statistiques Détaillées
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border-b">
                  <span className="text-gray-600">Panier moyen</span>
                  <span className="font-semibold text-gray-900">
                    {stats.revenue.average.toLocaleString('fr-DZ', { 
                      style: 'currency', 
                      currency: 'DZD',
                      minimumFractionDigits: 0
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 border-b">
                  <span className="text-gray-600">Total clients</span>
                  <span className="font-semibold text-gray-900">
                    {stats.clients.total}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 border-b">
                  <span className="text-gray-600">Clients vérifiés</span>
                  <span className="font-semibold text-gray-900">
                    {stats.clients.verified}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3 border-b">
                  <span className="text-gray-600">Restaurants premium</span>
                  <span className="font-semibold text-gray-900">
                    {stats.restaurants.premium}
                  </span>
                </div>

                <div className="flex justify-between items-center p-3">
                  <span className="text-gray-600">Total livreurs</span>
                  <span className="font-semibold text-gray-900">
                    {stats.drivers.total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              État des Livreurs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">
                  {stats.drivers.available}
                </p>
                <p className="text-sm text-gray-600 mt-1">Disponibles</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">
                  {stats.drivers.busy}
                </p>
                <p className="text-sm text-gray-600 mt-1">En livraison</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-600">
                  {stats.drivers.offline}
                </p>
                <p className="text-sm text-gray-600 mt-1">Hors ligne</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}