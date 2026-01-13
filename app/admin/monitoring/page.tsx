'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Server,
  Database as DatabaseIcon,
  Cpu,
  BarChart3,
  Users,
  Package,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type TabKey = 'overview' | 'endpoints' | 'system';
type EndpointStatus = 'healthy' | 'warning' | 'error' | string;

interface ApiHealth {
  status: EndpointStatus;
  uptime: string;
  lastCheck: string;
  responseTime: number;
}

interface EndpointMetric {
  name: string;
  status: EndpointStatus;
  avgTime: number;
  lastTime: number;
  successRate: number;
  calls24h: number;
  errors24h: number;
}

interface DatabaseMetrics {
  connections: number;
  maxConnections: number;
  activeQueries: number;
  avgQueryTime: number;
}

interface CacheMetrics {
  hitRate: number;
  size: string;
  keys: number;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  database: DatabaseMetrics;
  cache: CacheMetrics;
}

interface RealtimeStats {
  activeOrders: number;
  onlineDrivers: number;
  activeRestaurants: number;
  requestsPerMinute: number;
}

interface MonitoringAlert {
  type: 'info' | 'warning' | 'error' | string;
  title: string;
  message: string;
  timeAgo: string;
}

interface MonitoringResponse {
  apiHealth: ApiHealth;
  endpoints: EndpointMetric[];
  systemMetrics: SystemMetrics;
  realtimeStats: RealtimeStats;
  alerts?: MonitoringAlert[];
  apiCatalog?: ApiEntry[];
}

interface ApiEntry {
  path: string;
  method: string;
  summary?: string;
}

const MonitoringDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonitoringResponse | null>(null);

  const getStatusColor = (status: EndpointStatus) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: EndpointStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getResponseTimeColor = (time: number, avgTime: number) => {
    if (time < avgTime * 0.8) return 'text-green-600';
    if (time < avgTime * 1.2) return 'text-blue-600';
    if (time < avgTime * 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMethodColor = (method: string) => {
    const m = method?.toUpperCase();
    if (m === 'GET') return 'bg-green-100 text-green-700 border-green-200';
    if (m === 'POST') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (m === 'PUT' || m === 'PATCH') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (m === 'DELETE') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const fetchMonitoring = async () => {
    try {
      setIsRefreshing(true);
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');

      if (!token) {
        throw new Error('Non authentifié');
      }

      const res = await fetch(`${API_URL}/admin/monitoring`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Erreur lors du chargement du monitoring');
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error('Réponse invalide du serveur');
      }

      setData(json.data as MonitoringResponse);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Monitoring fetch error', err);
      setError(err.message || 'Impossible de charger les métriques');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 30000);
    return () => clearInterval(interval);
  }, []);

  const endpoints = data?.endpoints || [];
  const quickTotalCalls = endpoints.reduce((sum, e) => sum + (e.calls24h || 0), 0);
  const quickSuccessRate = endpoints.length
    ? endpoints.reduce((sum, e) => sum + (e.successRate || 0), 0) / endpoints.length
    : 100;
  const quickErrors = endpoints.reduce((sum, e) => sum + (e.errors24h || 0), 0);
  const quickAvgResponse = endpoints.length
    ? Math.floor(
        endpoints.reduce((sum, e) => sum + (e.avgTime || 0), 0) / endpoints.length
      )
    : 0;

  const alerts: MonitoringAlert[] =
    data?.alerts && data.alerts.length
      ? data.alerts
      : [
          {
            type: 'warning',
            title: 'Surveillance active',
            message: "Aucune alerte critique, suivi en temps réel en cours.",
            timeAgo: 'Maintenant'
          }
        ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des métriques...</p>
        </div>
      </div>
    );
  }

  const apiHealth = data?.apiHealth;
  const systemMetrics = data?.systemMetrics;
  const realtimeStats = data?.realtimeStats;
  const dbMetrics = systemMetrics?.database;
  const cacheMetrics = systemMetrics?.cache;
  const apiCatalog = data?.apiCatalog || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              Monitoring Système
            </h1>
            <p className="text-gray-500 mt-1">
              Supervision temps réel des performances et ressources
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              Dernière mise à jour:{' '}
              {lastUpdate
                ? lastUpdate.toLocaleTimeString()
                : apiHealth?.lastCheck
                  ? new Date(apiHealth.lastCheck).toLocaleTimeString()
                  : '--'}
            </div>
            <button
              onClick={fetchMonitoring}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-green-600">
              {apiHealth?.uptime || '--'}
            </span>
          </div>
          <h3 className="text-gray-600 font-medium">Uptime</h3>
          <p className="text-sm text-gray-500 mt-1">Dernières 24h</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-blue-600">
              {(apiHealth?.responseTime || 0).toLocaleString()}ms
            </span>
          </div>
          <h3 className="text-gray-600 font-medium">Latence API</h3>
          <p className="text-sm text-gray-500 mt-1">Ping base & API</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-purple-600">
              {realtimeStats?.activeOrders ?? '--'}
            </span>
          </div>
          <h3 className="text-gray-600 font-medium">Commandes actives</h3>
          <p className="text-sm text-gray-500 mt-1">En cours</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-orange-600">
              {realtimeStats?.requestsPerMinute ?? 0}
            </span>
          </div>
          <h3 className="text-gray-600 font-medium">Requêtes / min</h3>
          <p className="text-sm text-gray-500 mt-1">Rythme actuel</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'endpoints'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              API
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Ressources
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Actifs</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Livreurs en ligne :</span>
                      <span className="font-bold text-gray-900">
                        {realtimeStats?.onlineDrivers ?? '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Restaurants actifs :</span>
                      <span className="font-bold text-gray-900">
                        {realtimeStats?.activeRestaurants ?? '--'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <DatabaseIcon className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Base de données</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connexions :</span>
                      <span className="font-bold text-gray-900">
                        {dbMetrics?.connections ?? '--'}/{dbMetrics?.maxConnections ?? '--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temps moyen requête :</span>
                      <span className="font-bold text-gray-900">
                        {dbMetrics?.avgQueryTime ?? 0}ms
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Cache</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Hit Rate :</span>
                      <span className="font-bold text-gray-900">
                        {cacheMetrics?.hitRate ?? 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entrées :</span>
                      <span className="font-bold text-gray-900">
                        {cacheMetrics?.keys?.toLocaleString() ?? '--'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Stats rapides (24h)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {quickTotalCalls.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Total appels API</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {quickSuccessRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Taux de succès</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{quickErrors}</div>
                    <div className="text-sm text-gray-600 mt-1">Erreurs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {quickAvgResponse}ms
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Temps moyen</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Performance des endpoints</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Sain</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Alerte</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Erreur</span>
                  </div>
                </div>
              </div>

              {endpoints.map((endpoint, idx) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(endpoint.status)}`}
                      >
                        {getStatusIcon(endpoint.status)}
                        <span className="text-xs font-medium uppercase">{endpoint.status}</span>
                      </div>
                      <code className="text-sm font-mono font-medium text-gray-900">
                        {endpoint.name}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <div
                          className={`font-bold ${getResponseTimeColor(endpoint.lastTime, endpoint.avgTime)}`}
                        >
                          {endpoint.lastTime}ms
                        </div>
                        <div className="text-xs text-gray-500">Dernière réponse</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Temps moyen</div>
                      <div className="font-semibold text-gray-900">{endpoint.avgTime}ms</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Succès</div>
                      <div className="font-semibold text-green-600">{endpoint.successRate}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Appels (24h)</div>
                      <div className="font-semibold text-blue-600">
                        {endpoint.calls24h.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Erreurs (24h)</div>
                      <div className="font-semibold text-red-600">{endpoint.errors24h}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Taux d'erreur</div>
                      <div className="font-semibold text-gray-900">
                        {endpoint.calls24h
                          ? ((endpoint.errors24h / endpoint.calls24h) * 100).toFixed(2)
                          : 0}
                        %
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {apiCatalog.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-900">Catalogue des API</h4>
                    <span className="text-xs text-gray-500">{apiCatalog.length} endpoints</span>
                  </div>
                  <div className="max-h-80 overflow-auto divide-y divide-gray-100">
                    {apiCatalog.map((api, idx) => (
                      <div key={`${api.method}-${api.path}-${idx}`} className="py-2 flex items-start gap-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-md border ${getMethodColor(api.method)}`}
                        >
                          {api.method}
                        </span>
                        <div className="flex-1">
                          <div className="font-mono text-sm text-gray-900">{api.path}</div>
                          {api.summary && (
                            <div className="text-xs text-gray-600 mt-0.5">{api.summary}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Cpu className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">CPU</h3>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Courant</span>
                      <span className="font-bold text-gray-900">{systemMetrics?.cpu ?? 0}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${systemMetrics?.cpu ?? 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">Charge serveur</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Server className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Mémoire</h3>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Courant</span>
                      <span className="font-bold text-gray-900">{systemMetrics?.memory ?? 0}%</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${systemMetrics?.memory ?? 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-3">Utilisation mémoire</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DatabaseIcon className="w-5 h-5 text-green-600" />
                  Base de données
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {dbMetrics?.connections ?? 0}
                    </div>
                    <div className="text-sm text-gray-600">Connexions actives</div>
                    <div className="text-xs text-gray-500 mt-1">
                      sur {dbMetrics?.maxConnections ?? '--'} max
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {dbMetrics?.activeQueries ?? 0}
                    </div>
                    <div className="text-sm text-gray-600">Requêtes en cours</div>
                    <div className="text-xs text-gray-500 mt-1">Temps réel</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {dbMetrics?.avgQueryTime ?? 0}ms
                    </div>
                    <div className="text-sm text-gray-600">Temps moyen</div>
                    <div className="text-xs text-gray-500 mt-1">Requêtes</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-green-600">
                      {dbMetrics?.maxConnections
                        ? ((dbMetrics.connections / dbMetrics.maxConnections) * 100).toFixed(1)
                        : '0'}
                      %
                    </div>
                    <div className="text-sm text-gray-600">Utilisation pool</div>
                    <div className="text-xs text-gray-500 mt-1">Pool connexions</div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Cache applicatif
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {cacheMetrics?.hitRate ?? 0}%
                    </div>
                    <div className="text-sm text-gray-600">Hit rate</div>
                    <div className="text-xs text-gray-500 mt-1">Efficacité</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {cacheMetrics?.size || '--'}
                    </div>
                    <div className="text-sm text-gray-600">Taille</div>
                    <div className="text-xs text-gray-500 mt-1">Mémoire utilisée</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-900">
                      {cacheMetrics?.keys?.toLocaleString() ?? '--'}
                    </div>
                    <div className="text-sm text-gray-600">Clés en cache</div>
                    <div className="text-xs text-gray-500 mt-1">Entrées</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Alertes récentes
        </h3>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className={`flex items-start gap-3 p-3 border rounded-lg ${
                alert.type === 'error'
                  ? 'bg-red-50 border-red-200'
                  : alert.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
              }`}
            >
              {alert.type === 'error' ? (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              ) : alert.type === 'warning' ? (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium text-gray-900">{alert.title}</div>
                <div className="text-sm text-gray-600">{alert.message}</div>
                <div className="text-xs text-gray-500 mt-1">{alert.timeAgo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
