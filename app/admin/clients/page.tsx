'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

type ClientStatus = 'active' | 'suspended' | 'pending' | 'banned' | string;

interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address?: string | null;
  loyalty_points?: number | null;
  is_verified: boolean;
  is_active: boolean;
  status?: ClientStatus;
  created_at: string;
  profile_image_url?: string | null;
}

type ModalType = '' | 'view' | 'edit' | 'delete';

export default function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'suspended' | 'verified' | 'unverified'
  >('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>(''); // 'view', 'edit', 'delete'
  const [editFormData, setEditFormData] = useState<Partial<Client>>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Récupérer les clients depuis le backend
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/client/getall`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des clients');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setClients(data.data as Client[]);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch clients:', err);
      setError(err?.message || 'Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les clients
  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      client.first_name?.toLowerCase().includes(search) ||
      client.last_name?.toLowerCase().includes(search) ||
      client.email?.toLowerCase().includes(search) ||
      client.phone_number?.includes(searchTerm);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && client.status === 'active') ||
      (filterStatus === 'suspended' && client.status === 'suspended') ||
      (filterStatus === 'verified' && client.is_verified) ||
      (filterStatus === 'unverified' && !client.is_verified);

    return matchesSearch && matchesFilter;
  });

  // Gérer les actions
  const handleAction = (client: Client, type: ModalType) => {
    setSelectedClient(client);

    if (type === 'edit') {
      setEditFormData({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone_number: client.phone_number,
        address: client.address ?? '',
        loyalty_points: client.loyalty_points ?? 0,
        is_verified: client.is_verified,
        is_active: client.is_active,
        status: client.status
      });
    }

    setModalType(type);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
    setModalType('');
    setEditFormData({});
    setSaveLoading(false);
  };

  const handleSave = async () => {
    if (!selectedClient) {
      setError('Aucun client sélectionné');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const updateData = {
        first_name: editFormData.first_name ?? selectedClient.first_name,
        last_name: editFormData.last_name ?? selectedClient.last_name,
        email: editFormData.email ?? selectedClient.email,
        phone_number: editFormData.phone_number ?? selectedClient.phone_number,
        address: editFormData.address ?? selectedClient.address ?? '',
        loyalty_points: editFormData.loyalty_points ?? selectedClient.loyalty_points ?? 0,
        is_verified: editFormData.is_verified ?? selectedClient.is_verified,
        is_active: editFormData.is_active ?? selectedClient.is_active,
        status: editFormData.status ?? selectedClient.status
      };

      const response = await fetch(`${API_URL}/client/update/${selectedClient.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const data = await response.json();

      if (data.success) {
        await fetchClients();
        handleCloseModal();
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

  const handleDelete = async () => {
    if (!selectedClient) {
      setError('Aucun client sélectionné');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/client/delete/${selectedClient.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      const data = await response.json();

      if (data.success) {
        await fetchClients();
        handleCloseModal();
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setError(err?.message || 'Impossible de supprimer');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = (field: keyof Client, value: any) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Clients</h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredClients.length} client
                {filteredClients.length > 1 ? 's' : ''} trouvé
                {filteredClients.length > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={fetchClients}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as typeof filterStatus)
              }
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="verified">Vérifiés</option>
              <option value="unverified">Non vérifiés</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Points Fidélité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commandes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inscription
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={
                              client.profile_image_url ||
                              `https://ui-avatars.com/api/?name=${client.first_name}+${client.last_name}&background=16a34a&color=fff`
                            }
                            alt={`${client.first_name} ${client.last_name}`}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {client.is_verified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Vérifié
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {client.email || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {client.phone_number || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {client.loyalty_points || 0} pts
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">-</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(client.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(client, 'view')}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(client, 'edit')}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(client, 'delete')}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucun client trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'view' && 'Détails du Client'}
                {modalType === 'edit' && 'Modifier le Client'}
                {modalType === 'delete' && 'Confirmer la Suppression'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {modalType === 'delete' ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Êtes-vous sûr de vouloir supprimer ce client ?
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible. Toutes les données du client
                    seront supprimées.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleCloseModal}
                      disabled={saveLoading}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saveLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saveLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Suppression...
                        </>
                      ) : (
                        'Supprimer'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Photo de profil */}
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        selectedClient.profile_image_url ||
                        `https://ui-avatars.com/api/?name=${selectedClient.first_name}+${selectedClient.last_name}&background=16a34a&color=fff`
                      }
                      alt={`${selectedClient.first_name} ${selectedClient.last_name}`}
                      className="w-20 h-20 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedClient.is_verified ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Compte vérifié
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <UserX className="w-3 h-3 mr-1" />
                            Non vérifié
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        value={
                          modalType === 'edit'
                            ? editFormData.first_name ?? ''
                            : selectedClient.first_name
                        }
                        onChange={(e) =>
                          handleInputChange('first_name', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        value={
                          modalType === 'edit'
                            ? editFormData.last_name ?? ''
                            : selectedClient.last_name
                        }
                        onChange={(e) =>
                          handleInputChange('last_name', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={
                          modalType === 'edit'
                            ? editFormData.email ?? ''
                            : selectedClient.email
                        }
                        onChange={(e) =>
                          handleInputChange('email', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={
                          modalType === 'edit'
                            ? editFormData.phone_number ?? ''
                            : selectedClient.phone_number
                        }
                        onChange={(e) =>
                          handleInputChange('phone_number', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse
                      </label>
                      <input
                        type="text"
                        value={
                          modalType === 'edit'
                            ? (editFormData.address as string) ?? ''
                            : selectedClient.address ?? ''
                        }
                        onChange={(e) =>
                          handleInputChange('address', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    {modalType === 'edit' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Points Fidélité
                          </label>
                          <input
                            type="number"
                            value={editFormData.loyalty_points ?? 0}
                            onChange={(e) =>
                              handleInputChange(
                                'loyalty_points',
                                Number(e.target.value)
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!editFormData.is_verified}
                              onChange={(e) =>
                                handleInputChange(
                                  'is_verified',
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Vérifié
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!editFormData.is_active}
                              onChange={(e) =>
                                handleInputChange(
                                  'is_active',
                                  e.target.checked
                                )
                              }
                              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Actif
                            </span>
                          </label>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedClient.loyalty_points || 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Points fidélité
                      </div>
                    </div>
                    <div className="text-center"></div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-purple-600">
                        {formatDate(selectedClient.created_at)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Membre depuis
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {modalType !== 'delete' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {modalType === 'view' ? 'Fermer' : 'Annuler'}
                </button>
                {modalType === 'edit' && (
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
