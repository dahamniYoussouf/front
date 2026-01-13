'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Edit,
  Save,
  X,
  AlertCircle,
  Users,
  MapPin,
  CheckCircle,
  Clock,
  DollarSign,
  Bell,
  Truck,
  Package,
  RefreshCw,
  Info
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==== TYPES ====

interface ConfigItem {
  key: string;
  value: any;
  description: string;
  updated_at?: string;
  updated_by?: string;
}

interface ConfigCategory {
  name: string;
  title: string;
  icon: any;
  color: string;
  configs: ConfigItem[];
}

interface ConfigMetadata {
  key: string;
  title: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  icon: any;
  color: string;
  category: string;
}

type ModalType = '' | 'edit';

// Metadata pour toutes les configurations
const configMetadata: Record<string, ConfigMetadata> = {
  'max_orders_per_driver': {
    key: 'max_orders_per_driver',
    title: 'Commandes Max par Livreur',
    description: 'Nombre maximum de commandes qu\'un livreur peut gérer simultanément',
    unit: 'commandes',
    min: 1,
    max: 10,
    icon: Users,
    color: 'blue',
    category: 'delivery'
  },
  'max_distance_between_restaurants': {
    key: 'max_distance_between_restaurants',
    title: 'Distance Max entre Restaurants',
    description: 'Distance maximale en mètres entre restaurants pour les livraisons multiples',
    unit: 'mètres',
    min: 100,
    max: 5000,
    icon: MapPin,
    color: 'green',
    category: 'delivery'
  },
  'client_restaurant_search_radius': {
    key: 'client_restaurant_search_radius',
    title: 'Rayon de Recherche Restaurants (Clients)',
    description: 'Rayon de recherche par défaut (en mètres) pour trouver les restaurants à proximité (côté client)',
    unit: 'mètres',
    min: 100,
    max: 50000,
    icon: MapPin,
    color: 'green',
    category: 'delivery'
  },
  'default_preparation_time': {
    key: 'default_preparation_time',
    title: 'Temps de Préparation par Défaut',
    description: 'Temps de préparation par défaut (en minutes) utilisé si le restaurant ne le fournit pas',
    unit: 'minutes',
    min: 5,
    max: 120,
    icon: Clock,
    color: 'yellow',
    category: 'orders'
  },
  'pending_order_timeout': {
    key: 'pending_order_timeout',
    title: 'Délai Notification Commande',
    description: 'Délai (en minutes) avant notification admin pour une commande sans réponse',
    unit: 'minutes',
    min: 1,
    max: 60,
    icon: Bell,
    color: 'orange',
    category: 'notifications'
  },
  'default_delivery_fee': {
    key: 'default_delivery_fee',
    title: 'Frais de Livraison par Défaut',
    description: 'Frais de livraison par défaut (en DA) appliqués si non fournis lors de la création',
    unit: 'DA',
    min: 0,
    max: 10000,
    icon: DollarSign,
    color: 'green',
    category: 'fees'
  },
  'max_driver_cancellations': {
    key: 'max_driver_cancellations',
    title: 'Annulations Max Livreur',
    description: "Nombre maximum d'annulations avant alerte admin pour un livreur",
    unit: 'annulations',
    min: 1,
    max: 20,
    icon: Truck,
    color: 'red',
    category: 'drivers'
  },
};

const categoryInfo: Record<string, { title: string; icon: any; color: string }> = {
  delivery: {
    title: 'Livraison',
    icon: Package,
    color: 'blue'
  },
  orders: {
    title: 'Commandes',
    icon: Clock,
    color: 'yellow'
  },
  fees: {
    title: 'Tarifs & Commissions',
    icon: DollarSign,
    color: 'green'
  },
  notifications: {
    title: 'Notifications',
    icon: Bell,
    color: 'orange'
  },
  drivers: {
    title: 'Livreurs',
    icon: Truck,
    color: 'red'
  },
  platform: {
    title: 'Plateforme',
    icon: Settings,
    color: 'purple'
  }
};

export default function ConfigManagement() {
  const [configs, setConfigs] = useState<Record<string, ConfigItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [selectedMetadata, setSelectedMetadata] = useState<ConfigMetadata | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [editValue, setEditValue] = useState<number>(0);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Fetch all configurations
  useEffect(() => {
    fetchAllConfigs();
  }, []);

  const fetchAllConfigs = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/config/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des configurations');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfigs(data.data);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch configs:', err);
      setError(err?.message || 'Impossible de charger les configurations');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (config: ConfigItem) => {
    const metadata = configMetadata[config.key];
    if (!metadata) {
      setError('Configuration non trouvée');
      return;
    }

    setSelectedConfig(config);
    setSelectedMetadata(metadata);
    setEditValue(Number(config.value));
    setModalType('edit');
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedConfig(null);
    setSelectedMetadata(null);
    setModalType('');
    setEditValue(0);
    setSaveLoading(false);
    setError('');
  };

  const handleSave = async () => {
    if (!selectedConfig || !selectedMetadata) {
      setError('Aucune configuration sélectionnée');
      return;
    }

    // Validation
    if (editValue < selectedMetadata.min || editValue > selectedMetadata.max) {
      setError(`La valeur doit être entre ${selectedMetadata.min} et ${selectedMetadata.max}`);
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/admin/config/${selectedConfig.key}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: editValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(`${selectedMetadata.title} mis à jour avec succès!`);
        await fetchAllConfigs();
        handleCloseModal();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err?.message || 'Impossible de sauvegarder');
    } finally {
      setSaveLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; hover: string; progress: string }> = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100',
        progress: 'bg-blue-500'
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100',
        progress: 'bg-green-500'
      },
      yellow: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        border: 'border-yellow-200',
        hover: 'hover:bg-yellow-100',
        progress: 'bg-yellow-500'
      },
      orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-200',
        hover: 'hover:bg-orange-100',
        progress: 'bg-orange-500'
      },
      red: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        border: 'border-red-200',
        hover: 'hover:bg-red-100',
        progress: 'bg-red-500'
      },
      purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-200',
        hover: 'hover:bg-purple-100',
        progress: 'bg-purple-500'
      }
    };
    return colors[color] || colors.blue;
  };

  // Organiser les configurations par catégories
  const organizedConfigs: ConfigCategory[] = Object.entries(configs).map(([categoryKey, configsList]) => {
    const category = categoryInfo[categoryKey] || categoryInfo.platform;
    const Icon = category.icon;
    const colors = getColorClasses(category.color);

    return {
      name: categoryKey,
      title: category.title,
      icon: Icon,
      color: category.color,
      configs: configsList
        .map(config => {
          const metadata = configMetadata[config.key];
          return metadata ? { ...config, metadata } : null;
        })
        .filter((c): c is ConfigItem & { metadata: ConfigMetadata } => c !== null) as any
    };
  }).filter(cat => cat.configs.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Configuration du Système
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Gérez tous les paramètres de la plateforme
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={fetchAllConfigs}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Succès</p>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !showModal && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : organizedConfigs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune configuration trouvée
            </h3>
            <p className="text-sm text-gray-500">
              Les configurations seront créées automatiquement lors de l'initialisation
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {organizedConfigs.map((category) => {
              const CategoryIcon = category.icon;
              const colors = getColorClasses(category.color);

              return (
                <div key={category.name} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Category Header */}
                  <div className={`${colors.bg} ${colors.border} border-b px-6 py-4`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${colors.bg} rounded-lg border ${colors.border}`}>
                        <CategoryIcon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {category.title}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {category.configs.length} configuration{category.configs.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Configs Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {category.configs.map((config: ConfigItem & { metadata?: ConfigMetadata }) => {
                        const metadata = config.metadata || configMetadata[config.key];
                        if (!metadata) return null;
                        const ConfigIcon = metadata.icon;
                        const configColors = getColorClasses(metadata.color);

                        return (
                          <div
                            key={config.key}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className={`p-2 ${configColors.bg} rounded-lg border ${configColors.border} flex-shrink-0`}>
                                  <ConfigIcon className={`w-5 h-5 ${configColors.text}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-gray-900 break-words">
                                    {metadata.title}
                                  </h3>
                                  <p className="text-xs text-gray-600 mt-1 break-words">
                                    {metadata.description}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleEdit(config)}
                                className={`flex-shrink-0 p-2 ${configColors.bg} ${configColors.hover} rounded-lg border ${configColors.border} transition-colors`}
                                title="Modifier"
                              >
                                <Edit className={`w-4 h-4 ${configColors.text}`} />
                              </button>
                            </div>

                            {/* Value Display */}
                            <div className="mb-3">
                              <div className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold ${configColors.text}`}>
                                  {config.value}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {metadata.unit}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Info className="w-3 h-3" />
                                <span>Min: {metadata.min} • Max: {metadata.max}</span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-300 ${configColors.progress}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, ((Number(config.value) - metadata.min) / (metadata.max - metadata.min)) * 100))}%`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && selectedConfig && selectedMetadata && modalType === 'edit' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Modifier la Configuration
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Config Info */}
                <div className={`${getColorClasses(selectedMetadata.color).bg} ${getColorClasses(selectedMetadata.color).border} border rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      {(() => {
                        const Icon = selectedMetadata.icon;
                        return <Icon className={`w-5 h-5 ${getColorClasses(selectedMetadata.color).text}`} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedMetadata.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedMetadata.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Value Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouvelle Valeur
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(Number(e.target.value))}
                      min={selectedMetadata.min}
                      max={selectedMetadata.max}
                      step={selectedMetadata.unit === '%' ? 0.1 : 1}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      {selectedMetadata.unit}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Valeur actuelle: <strong>{selectedConfig.value}</strong> {selectedMetadata.unit}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Plage autorisée: {selectedMetadata.min} - {selectedMetadata.max} {selectedMetadata.unit}
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">Aperçu</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${getColorClasses(selectedMetadata.color).text}`}>
                      {editValue}
                    </span>
                    <span className="text-base text-gray-600">
                      {selectedMetadata.unit}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getColorClasses(selectedMetadata.color).progress}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, ((editValue - selectedMetadata.min) / (selectedMetadata.max - selectedMetadata.min)) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Error in modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={saveLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
