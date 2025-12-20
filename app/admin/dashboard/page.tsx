'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ShoppingBag,
  Store,
  TrendingUp,
  Banknote,
  AlertCircle,
  RefreshCw,
  LogOut,
  Bell,
  Truck,
  Clock3,
  UserCheck
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
  notifications: {
    total: number;
    unread: number;
    unresolved: number;
    resolved: number;
  };
  pipeline?: {
    period_days: number;
    sample_size: number;
    total_avg_minutes: number;
    steps: Array<{
      key: string;
      label: string;
      avg_minutes: number;
      samples: number;
    }>;
  };
  online?: {
    clients: number;
    restaurants: number;
    drivers: number;
    admins: number;
  } | null;
}

const formatDa = (amount: number) => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Math.round(safe).toLocaleString('fr-DZ');
};

const formatMinutes = (minutes: number) => {
  const safe = Number.isFinite(minutes) ? minutes : 0;
  const totalMinutes = Math.max(0, Math.round(safe));

  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}j ${remainingHours}h`;
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 1200);
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const statsRes = await fetch(`${baseURL}/admin/statistics`, { headers });

      if (statsRes.status === 401) {
        setError('Session expirée. Redirection...');
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 1200);
        return;
      }

      const contentType = statsRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await statsRes.text();
        throw new Error(`Réponse invalide: ${text.substring(0, 120)}`);
      }

      if (!statsRes.ok) {
        const errorData = await statsRes.json().catch(() => ({ message: 'Erreur inconnue' }));
        throw new Error(errorData.message || statsRes.statusText);
      }

      const statsData = await statsRes.json();
      if (statsData.success && statsData.data) {
        setStats(statsData.data as Stats);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [logout, router]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats, user]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
          {user?.email && (
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Connecté: {user.email}</p>
          )}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Tableau de bord administrateur
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchDashboardStats}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Decor */}
          <div className="mb-8 bg-gradient-to-r from-green-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border border-green-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm dark:shadow-slate-900/40">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="p-6 md:p-8 space-y-3">
                <p className="text-sm uppercase tracking-wide text-green-700 dark:text-green-300 font-semibold">Vue d&apos;ensemble</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Supervisez vos commandes et vos équipes en temps réel
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Suivez les indicateurs clés, anticipez les pics d&apos;activité et gardez un oeil sur la performance de la plateforme.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-green-200 dark:border-slate-700 text-green-700 dark:text-green-300">
                    {stats.orders.total.toLocaleString()} commandes
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 text-blue-700 dark:text-blue-300">
                    {(stats.online?.drivers ?? stats.drivers.available).toLocaleString()} livreurs en ligne
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-purple-700 dark:text-purple-300">
                    {stats.restaurants.active} restaurants actifs
                  </span>
                  {typeof stats.online?.clients === 'number' && (
                    <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-teal-200 dark:border-slate-700 text-teal-700 dark:text-teal-300">
                      {stats.online.clients.toLocaleString()} clients connectés
                    </span>
                  )}
                </div>
              </div>
              <div className="relative hidden md:block h-56 md:h-full min-h-[240px] rounded-b-2xl lg:rounded-r-2xl overflow-hidden">
                <Image
                  src="/login.png"
                  alt="Dashboard illustration"
                  fill
                  priority
                  className="object-cover object-center md:object-right opacity-95 transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-white/40 via-transparent to-transparent dark:from-slate-900/60" />
              </div>
            </div>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Notifications</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                    {stats.notifications?.unread || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {stats.notifications?.unresolved || 0} non résolues
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full relative">
                  <Bell className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  {stats.notifications?.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {stats.notifications.unread > 99 ? '99+' : stats.notifications.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total commandes</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                    {stats.orders.total.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+{stats.orders.growth}%</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">ce mois</span>
                  </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                  <ShoppingBag className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Revenu total</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight whitespace-nowrap">
                      {formatDa(stats.revenue.total)}
                    </p>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">DA</span>
                  </div>
                  <div className="flex items-center mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                    <span className="text-green-600 font-medium">+{stats.revenue.growth}%</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">ce mois</span>
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                  <Banknote className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Livreurs disponibles</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                    {stats.drivers.available}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {stats.drivers.busy} en livraison
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                  <Truck className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ecosystème</h3>
                <div className="px-3 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                  En direct
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Store className="w-4 h-4 text-purple-500" />
                    Restaurants actifs
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.restaurants.active}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">sur {stats.restaurants.total}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <UserCheck className="w-4 h-4 text-teal-500" />
                    Clients vérifiés
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.clients.verified}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">sur {stats.clients.total}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Truck className="w-4 h-4 text-orange-500" />
                    Livreurs actifs
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.drivers.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stats.drivers.available} en ligne</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Flux des commandes</h3>
                <Clock3 className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="space-y-3">
                {[
                  { label: 'En attente', value: stats.orders.pending, color: 'bg-yellow-500' },
                  { label: 'En cours', value: stats.orders.inProgress, color: 'bg-blue-500' },
                  { label: 'Livrées', value: stats.orders.completed, color: 'bg-green-500' },
                  { label: 'Annulées', value: stats.orders.cancelled, color: 'bg-red-500' },
                ].map((item) => {
                  const total = Math.max(stats.orders.total, 1);
                  const width = Math.min(100, Math.round((item.value / total) * 100));
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>{item.label}</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden mt-1">
                        <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Valeur & Qualité</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Panier moyen</div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        {formatDa(stats.revenue.average)}
                      </p>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        DA
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Restaurants premium</div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{stats.restaurants.premium}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stats.restaurants.approved} approuvés</p>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Notifications ouvertes</div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{stats.notifications.unresolved}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">dont {stats.notifications.unread} non lues</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {stats.pipeline && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/50 hover:shadow-md dark:hover:shadow-gray-900/70 transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Temps moyen par étape
                </h3>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.pipeline.sample_size} commandes livrées • {stats.pipeline.period_days} derniers jours
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.pipeline.steps.map((step) => (
                  <div
                    key={step.key}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4"
                  >
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {step.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatMinutes(step.avg_minutes)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {step.samples} échantillons
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Temps total moyen: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMinutes(stats.pipeline.total_avg_minutes)}</span>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
