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
  TrendingUp
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

interface DeliveryConfig {
  max_orders_per_driver: number;
  max_distance_between_restaurants: number;
}

interface ConfigItem {
  id: string;
  title: string;
  description: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  icon: any;
  color: string;
}

type ModalType = '' | 'edit';

export default function ConfigManagement() {
  const [config, setConfig] = useState<DeliveryConfig>({
    max_orders_per_driver: 5,
    max_distance_between_restaurants: 500
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<ConfigItem | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [editValue, setEditValue] = useState<number>(0);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Configuration items
  const configItems: ConfigItem[] = [
    {
      id: 'max_orders',
      title: 'Commandes Max par Livreur',
      description: 'Nombre maximum de commandes qu\'un livreur peut gérer simultanément',
      value: config.max_orders_per_driver,
      unit: 'commandes',
      min: 1,
      max: 10,
      icon: Users,
      color: 'blue'
    },
    {
      id: 'max_distance',
      title: 'Distance Max entre Restaurants',
      description: 'Distance maximale en mètres entre restaurants pour les livraisons multiples',
      value: config.max_distance_between_restaurants,
      unit: 'mètres',
      min: 100,
      max: 5000,
      icon: MapPin,
      color: 'green'
    }
  ];

  // Fetch configuration
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/config/delivery`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la configuration');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch config:', err);
      setError(err?.message || 'Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (item: ConfigItem) => {
    setSelectedConfig(item);
    setEditValue(item.value);
    setModalType('edit');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedConfig(null);
    setModalType('');
    setEditValue(0);
    setSaveLoading(false);
    setError('');
  };

  const handleSave = async () => {
    if (!selectedConfig) {
      setError('Aucune configuration sélectionnée');
      return;
    }

    // Validation
    if (editValue < selectedConfig.min || editValue > selectedConfig.max) {
      setError(`La valeur doit être entre ${selectedConfig.min} et ${selectedConfig.max}`);
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const endpoint = selectedConfig.id === 'max_orders' 
        ? `${API_URL}/admin/config/delivery/max-orders`
        : `${API_URL}/admin/config/delivery/max-distance`;

      const bodyKey = selectedConfig.id === 'max_orders'
        ? 'max_orders'
        : 'max_distance';

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [bodyKey]: editValue
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(`${selectedConfig.title} mis à jour avec succès!`);
        await fetchConfig();
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
    const colors: Record<string, { bg: string; text: string; border: string; hover: string }> = {
      blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        hover: 'hover:bg-blue-100'
      },
      green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-200',
        hover: 'hover:bg-green-100'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Configuration du Système
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Gérez les paramètres de livraison
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
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
          {error && (
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {configItems.map((item) => {
              const colors = getColorClasses(item.color);
              const Icon = item.icon;
              
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className={`${colors.bg} ${colors.border} border-b px-4 sm:px-6 py-4`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 ${colors.bg} rounded-lg border ${colors.border}`}>
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(item)}
                        className={`flex-shrink-0 p-2 ${colors.bg} ${colors.hover} rounded-lg border ${colors.border} transition-colors`}
                        title="Modifier"
                      >
                        <Edit className={`w-4 h-4 ${colors.text}`} />
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-2">Valeur actuelle</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl sm:text-4xl font-bold ${colors.text}`}>
                            {item.value}
                          </span>
                          <span className="text-base sm:text-lg text-gray-600">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <TrendingUp className="w-4 h-4" />
                        <span>Min: {item.min} • Max: {item.max}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                      <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>{item.min}</span>
                        <span>{item.max}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${colors.text.replace('text', 'bg')}`}
                          style={{
                            width: `${((item.value - item.min) / (item.max - item.min)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && selectedConfig && modalType === 'edit' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
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
            <div className="px-4 sm:px-6 py-6">
              <div className="space-y-6">
                {/* Config Info */}
                <div className={`${getColorClasses(selectedConfig.color).bg} ${getColorClasses(selectedConfig.color).border} border rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 bg-white rounded-lg`}>
                      {(() => {
                        const Icon = selectedConfig.icon;
                        return <Icon className={`w-5 h-5 ${getColorClasses(selectedConfig.color).text}`} />;
                      })()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {selectedConfig.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {selectedConfig.description}
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
                      min={selectedConfig.min}
                      max={selectedConfig.max}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      {selectedConfig.unit}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    Valeur actuelle: <strong>{selectedConfig.value}</strong> {selectedConfig.unit}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Plage autorisée: {selectedConfig.min} - {selectedConfig.max}
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">Aperçu</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl sm:text-3xl font-bold ${getColorClasses(selectedConfig.color).text}`}>
                      {editValue}
                    </span>
                    <span className="text-base text-gray-600">
                      {selectedConfig.unit}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getColorClasses(selectedConfig.color).text.replace('text', 'bg')}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, ((editValue - selectedConfig.min) / (selectedConfig.max - selectedConfig.min)) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Error in modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={saveLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm sm:text-base"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
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