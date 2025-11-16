'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  MapPin,
  Phone,
  DollarSign,
  User,
  Store,
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

type OrderStatus = 
  | 'pending' 
  | 'accepted' 
  | 'preparing' 
  | 'assigned' 
  | 'arrived'
  | 'delivering' 
  | 'delivered' 
  | 'declined';

type OrderType = 'delivery' | 'pickup';

type PaymentMethod = 'baridi_mob' | 'cash_on_delivery' | 'bank_transfer';

interface OrderItem {
  id: string;
  menu_item_id: string;
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  instructions_speciales?: string;
  menu_item: {
    id: string;
    nom: string;
    description?: string;
    prix: number;
    photo_url?: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  client_id: string;
  restaurant_id: string;
  order_type: OrderType;
  status: OrderStatus;
  delivery_address?: string;
  delivery_location?: {
    type: string;
    coordinates: [number, number];
  };
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  delivery_instructions?: string;
  estimated_delivery_time?: string;
  preparation_time?: number;
  livreur_id?: string;
  accepted_at?: string;
  preparing_started_at?: string;
  assigned_at?: string;
  arrived_at?: string;
  delivering_started_at?: string;
  delivered_at?: string;
  rating?: number;
  review_comment?: string;
  decline_reason?: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    email: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string;
    image_url?: string;
  };
  driver?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    vehicle_type: string;
  };
  order_items?: OrderItem[];
}

type ModalType = '' | 'view' | 'accept' | 'decline' | 'assign';

interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | OrderStatus>('all');
  const [filterType, setFilterType] = useState<'all' | OrderType>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [actionFormData, setActionFormData] = useState<{
    preparation_time?: number;
    decline_reason?: string;
    driver_id?: string;
  }>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    total_pages: 1,
    total_items: 0
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch orders from backend
  useEffect(() => {
    fetchOrders();
  }, [currentPage, filterStatus, filterType]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      if (filterType !== 'all') {
        params.append('order_type', filterType);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`${API_URL}/order?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setOrders(data.data);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch orders:', err);
      setError(err?.message || 'Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders locally (for search)
  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    
    const search = searchTerm.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(search) ||
      order.client?.first_name?.toLowerCase().includes(search) ||
      order.client?.last_name?.toLowerCase().includes(search) ||
      order.restaurant?.name?.toLowerCase().includes(search)
    );
  });

  // Handle actions
  const handleAction = async (order: Order, type: ModalType) => {
    // Fetch full order details
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié');
        return;
      }

      const response = await fetch(`${API_URL}/order/${order.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des détails');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setSelectedOrder(data.data);
        
        if (type === 'accept') {
          setActionFormData({ preparation_time: 15 });
        } else if (type === 'decline') {
          setActionFormData({ decline_reason: '' });
        }
        
        setModalType(type);
        setShowModal(true);
      }
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      setError(err?.message || 'Impossible de charger les détails');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    setModalType('');
    setActionFormData({});
    setSaveLoading(false);
  };

  // Accept order
  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/order/${selectedOrder.id}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preparation_time: actionFormData.preparation_time || 15
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de l\'acceptation');
      }

      const data = await response.json();

      if (data.success) {
        await fetchOrders();
        handleCloseModal();
      } else {
        throw new Error('Échec de l\'acceptation');
      }
    } catch (err: any) {
      console.error('Erreur acceptation:', err);
      setError(err?.message || 'Impossible d\'accepter la commande');
    } finally {
      setSaveLoading(false);
    }
  };

  // Decline order
  const handleDeclineOrder = async () => {
    if (!selectedOrder || !actionFormData.decline_reason?.trim()) {
      setError('Veuillez fournir une raison de refus');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/order/${selectedOrder.id}/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: actionFormData.decline_reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors du refus');
      }

      const data = await response.json();

      if (data.success) {
        await fetchOrders();
        handleCloseModal();
      } else {
        throw new Error('Échec du refus');
      }
    } catch (err: any) {
      console.error('Erreur refus:', err);
      setError(err?.message || 'Impossible de refuser la commande');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD'
    }).format(amount);
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: { label: 'En attente', class: 'bg-yellow-100 text-yellow-800' },
      accepted: { label: 'Acceptée', class: 'bg-blue-100 text-blue-800' },
      preparing: { label: 'En préparation', class: 'bg-purple-100 text-purple-800' },
      assigned: { label: 'Livreur assigné', class: 'bg-indigo-100 text-indigo-800' },
      arrived: { label: 'Livreur arrivé', class: 'bg-cyan-100 text-cyan-800' },
      delivering: { label: 'En livraison', class: 'bg-orange-100 text-orange-800' },
      delivered: { label: 'Livrée', class: 'bg-green-100 text-green-800' },
      declined: { label: 'Refusée', class: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels = {
      baridi_mob: 'Baridi Mob',
      cash_on_delivery: 'Paiement à la livraison',
      bank_transfer: 'Virement bancaire'
    };
    return labels[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Commandes</h1>
              <p className="mt-1 text-sm text-gray-500">
                {pagination.total_items} commande{pagination.total_items > 1 ? 's' : ''} trouvée{pagination.total_items > 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par n° commande, client ou restaurant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="accepted">Acceptée</option>
              <option value="preparing">En préparation</option>
              <option value="assigned">Livreur assigné</option>
              <option value="delivering">En livraison</option>
              <option value="delivered">Livrée</option>
              <option value="declined">Refusée</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value="delivery">Livraison</option>
              <option value="pickup">À emporter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
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
                      Commande
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.payment_method && getPaymentMethodLabel(order.payment_method)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.client ? `${order.client.first_name} ${order.client.last_name}` : 'N/A'}
                            </div>
                            {order.client?.phone_number && (
                              <div className="text-sm text-gray-500 flex items-center">
                                <Phone className="w-3 h-3 mr-1" />
                                {order.client.phone_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Store className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {order.restaurant?.name || 'N/A'}
                            </div>
                            {order.restaurant?.address && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {order.restaurant.address}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {order.order_type === 'delivery' ? (
                            <Truck className="w-4 h-4 text-blue-500 mr-2" />
                          ) : (
                            <Package className="w-4 h-4 text-green-500 mr-2" />
                          )}
                          <span className="text-sm text-gray-900">
                            {order.order_type === 'delivery' ? 'Livraison' : 'À emporter'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(parseFloat(order.total_amount.toString()))}
                        </div>
                        <div className="text-xs text-gray-500">
                          Sous-total: {formatCurrency(parseFloat(order.subtotal.toString()))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(order, 'view')}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(order, 'accept')}
                                className="text-green-600 hover:text-green-900 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                title="Accepter"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAction(order, 'decline')}
                                className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                title="Refuser"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucune commande trouvée
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {pagination.current_page} sur {pagination.total_pages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={pagination.current_page === 1}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
                    disabled={pagination.current_page === pagination.total_pages}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'view' && 'Détails de la Commande'}
                {modalType === 'accept' && 'Accepter la Commande'}
                {modalType === 'decline' && 'Refuser la Commande'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {modalType === 'accept' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      Voulez-vous accepter cette commande ?
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temps de préparation (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={actionFormData.preparation_time || 15}
                      onChange={(e) => setActionFormData({ preparation_time: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Commande #{selectedOrder.order_number}</strong>
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Client: {selectedOrder.client?.first_name} {selectedOrder.client?.last_name}
                    </p>
                    <p className="text-sm text-blue-700">
                      Montant total: {formatCurrency(parseFloat(selectedOrder.total_amount.toString()))}
                    </p>
                  </div>
                </div>
              ) : modalType === 'decline' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      Veuillez fournir une raison pour le refus de cette commande.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Raison du refus *
                    </label>
                    <textarea
                      value={actionFormData.decline_reason || ''}
                      onChange={(e) => setActionFormData({ decline_reason: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Ex: Rupture de stock, fermeture exceptionnelle..."
                    />
                  </div>
                </div>
              ) : (
                // View mode
                <div className="space-y-6">
                  {/* Order Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Commande {selectedOrder.order_number}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Créée le {formatDate(selectedOrder.created_at)}
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                  </div>

                  {/* Client & Restaurant Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        Client
                      </h4>
                      {selectedOrder.client && (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            {selectedOrder.client.first_name} {selectedOrder.client.last_name}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {selectedOrder.client.phone_number}
                          </p>
                          <p className="text-sm text-gray-600">
                            {selectedOrder.client.email}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Store className="w-4 h-4 mr-2" />
                        Restaurant
                      </h4>
                      {selectedOrder.restaurant && (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            {selectedOrder.restaurant.name}
                          </p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {selectedOrder.restaurant.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  {selectedOrder.order_type === 'delivery' && selectedOrder.delivery_address && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        Adresse de livraison
                      </h4>
                      <p className="text-sm text-blue-800">
                        {selectedOrder.delivery_address}
                      </p>
                      {selectedOrder.delivery_instructions && (
                        <p className="text-sm text-blue-700 mt-2">
                          <strong>Instructions:</strong> {selectedOrder.delivery_instructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Order Items */}
                  {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Articles commandés
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.order_items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {item.menu_item.nom}
                              </p>
                              {item.instructions_speciales && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {item.instructions_speciales}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Quantité: {item.quantite} × {formatCurrency(parseFloat(item.prix_unitaire.toString()))}
                              </p>
                            </div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatCurrency(parseFloat(item.prix_total.toString()))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pricing */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Sous-total</span>
                        <span className="text-gray-900">
                          {formatCurrency(parseFloat(selectedOrder.subtotal.toString()))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Frais de livraison</span>
                        <span className="text-gray-900">
                          {formatCurrency(parseFloat(selectedOrder.delivery_fee.toString()))}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                        <span className="text-gray-900">Total</span>
                        <span className="text-green-600">
                          {formatCurrency(parseFloat(selectedOrder.total_amount.toString()))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>Mode de paiement:</strong> {getPaymentMethodLabel(selectedOrder.payment_method)}
                    </p>
                  </div>

                  {/* Driver Info */}
                  {selectedOrder.driver && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center">
                        <Truck className="w-4 h-4 mr-2" />
                        Livreur
                      </h4>
                      <div className="space-y-1">
                        <p className="text-sm text-purple-800">
                          {selectedOrder.driver.first_name} {selectedOrder.driver.last_name}
                        </p>
                        <p className="text-sm text-purple-700 flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {selectedOrder.driver.phone}
                        </p>
                        <p className="text-sm text-purple-700">
                          Véhicule: {selectedOrder.driver.vehicle_type}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {(selectedOrder.accepted_at || selectedOrder.preparing_started_at || 
                    selectedOrder.assigned_at || selectedOrder.delivered_at) && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Historique
                      </h4>
                      <div className="space-y-2">
                        {selectedOrder.accepted_at && (
                          <div className="flex items-center text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                            <span className="text-gray-600">Acceptée:</span>
                            <span className="text-gray-900 ml-2">{formatDate(selectedOrder.accepted_at)}</span>
                          </div>
                        )}
                        {selectedOrder.preparing_started_at && (
                          <div className="flex items-center text-sm">
                            <Clock className="w-4 h-4 text-purple-500 mr-2" />
                            <span className="text-gray-600">Préparation:</span>
                            <span className="text-gray-900 ml-2">{formatDate(selectedOrder.preparing_started_at)}</span>
                          </div>
                        )}
                        {selectedOrder.assigned_at && (
                          <div className="flex items-center text-sm">
                            <Truck className="w-4 h-4 text-blue-500 mr-2" />
                            <span className="text-gray-600">Livreur assigné:</span>
                            <span className="text-gray-900 ml-2">{formatDate(selectedOrder.assigned_at)}</span>
                          </div>
                        )}
                        {selectedOrder.delivered_at && (
                          <div className="flex items-center text-sm">
                            <Package className="w-4 h-4 text-green-500 mr-2" />
                            <span className="text-gray-600">Livrée:</span>
                            <span className="text-gray-900 ml-2">{formatDate(selectedOrder.delivered_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Decline Reason */}
                  {selectedOrder.decline_reason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-red-900 mb-2">
                        Raison du refus
                      </h4>
                      <p className="text-sm text-red-800">
                        {selectedOrder.decline_reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={saveLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {modalType === 'view' ? 'Fermer' : 'Annuler'}
              </button>
              {modalType === 'accept' && (
                <button
                  onClick={handleAcceptOrder}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Acceptation...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Accepter
                    </>
                  )}
                </button>
              )}
              {modalType === 'decline' && (
                <button
                  onClick={handleDeclineOrder}
                  disabled={saveLoading || !actionFormData.decline_reason?.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Refus...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Refuser
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}