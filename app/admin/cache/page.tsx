'use client';

import { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import Loader from '@/components/Loader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  total: number;
  hitRate: string;
  type: string;
  keys?: number;
}

export default function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invalidatePattern, setInvalidatePattern] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchCacheStats();
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchCacheStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchCacheStats = async () => {
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Non authentifié');
        return;
      }

      const response = await fetch(`${API_URL}/admin/cache/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching cache stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/admin/cache/clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du vidage du cache');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('Cache vidé avec succès');
        setShowClearConfirm(false);
        // Refresh stats after clearing
        setTimeout(fetchCacheStats, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du vidage du cache');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvalidatePattern = async () => {
    if (!invalidatePattern.trim()) {
      setError('Veuillez entrer un pattern');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/admin/cache/invalidate/${encodeURIComponent(invalidatePattern)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'invalidation');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(`Cache invalidé : ${data.keys_deleted} clé(s) supprimée(s)`);
        setInvalidatePattern('');
        // Refresh stats after invalidation
        setTimeout(fetchCacheStats, 500);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'invalidation');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Loader message="Chargement des statistiques du cache..." />;
  }

  const hitRate = stats ? parseFloat(stats.hitRate.replace('%', '')) : 0;
  const isGoodPerformance = hitRate >= 70;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2">
            Gestion du Cache
          </h1>
          <p className="text-gray-600 dark:text-slate-400">
            Surveillez et gérez les performances du système de cache
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Hit Rate */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Taux de Réussite
                </h3>
                {isGoodPerformance ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <p className={`text-3xl font-bold ${isGoodPerformance ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {stats.hitRate}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {stats.hits} hits / {stats.total} requêtes
              </p>
            </div>

            {/* Total Requests */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Requêtes Totales
                </h3>
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                {stats.total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                {stats.hits} hits + {stats.misses} misses
              </p>
            </div>

            {/* Cache Sets */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Entrées Mises en Cache
                </h3>
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                {stats.sets.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                Données mises en cache
              </p>
            </div>

            {/* Cache Type */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  Type de Cache
                </h3>
                <Database className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                {stats.type}
              </p>
              {stats.keys !== undefined && (
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  {stats.keys} clé(s) active(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clear Cache */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Vider le Cache
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Supprime toutes les données mises en cache. Cette action est irréversible.
            </p>
            
            {showClearConfirm ? (
              <div className="space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Êtes-vous sûr de vouloir vider tout le cache ? Cette action supprimera toutes les données mises en cache.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClearCache}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Vidage en cours...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Confirmer
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleClearCache}
                disabled={actionLoading}
                className="w-full px-4 py-2 bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Vider Tout le Cache
              </button>
            )}
          </div>

          {/* Invalidate Pattern */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Invalider par Pattern
            </h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              Invalide toutes les clés de cache correspondant à un pattern. Utilisez * comme wildcard.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Pattern
                </label>
                <input
                  type="text"
                  value={invalidatePattern}
                  onChange={(e) => setInvalidatePattern(e.target.value)}
                  placeholder="Ex: restaurant:* ou admin:statistics"
                  className="w-full px-4 py-2 border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Exemples : <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">restaurant:*</code>, <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">admin:top:*</code>
                </p>
              </div>
              <button
                onClick={handleInvalidatePattern}
                disabled={actionLoading || !invalidatePattern.trim()}
                className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Invalidation...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Invalider
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Cache Info */}
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Informations sur le Cache
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Type de cache :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">{stats?.type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Clés actives :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">
                {stats?.keys !== undefined ? stats.keys : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Hits :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">
                {stats?.hits.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Misses :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">
                {stats?.misses.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Suppressions :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">
                {stats?.deletes.toLocaleString() || '0'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-slate-400 mb-1">Dernière mise à jour :</p>
              <p className="font-medium text-gray-900 dark:text-slate-100">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchCacheStats}
            disabled={actionLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser les Statistiques
          </button>
        </div>
      </div>
    </div>
  );
}







