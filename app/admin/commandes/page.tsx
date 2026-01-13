'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  LayoutGrid,
  List,
  Truck,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  User,
  Store,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    phone_number?: string;
    email?: string;
    address?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    image_url?: string;
    phone_number?: string;
    email?: string;
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
type ViewMode = 'cards' | 'table';

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
};

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
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
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
  const [pageSize, setPageSize] = useState<number>(20);

  const patchOrderInState = (id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((order) => (order.id === id ? { ...order, ...patch } : order)));
  };

  const removeOrderFromState = (id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
  };

  const decrementPagination = (amount: number) => {
    setPagination((prev) => {
      const nextTotalItems = Math.max(0, (prev.total_items || 0) - amount);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalItems / pageSize));
      return {
        ...prev,
        total_items: nextTotalItems,
        total_pages: nextTotalPages
      };
    });
  };

  const fetchOrders = useCallback(async () => {
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
        limit: pageSize.toString()
      });

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      if (filterType !== 'all') {
        params.append('order_type', filterType);
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
    } catch (err) {
      console.error('Erreur fetch orders:', err);
      setError(getErrorMessage(err, 'Impossible de charger les commandes'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus, filterType, pageSize]);

  // Fetch orders from backend
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filter orders locally (for search)
  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return true;

    const matches = (value?: string) => (value ?? '').toLowerCase().includes(search);
    return (
      matches(order.order_number) ||
      matches(order.client?.first_name) ||
      matches(order.client?.last_name) ||
      matches(order.restaurant?.name)
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
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(getErrorMessage(err, 'Impossible de charger les détails'));
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
        if (filterStatus === 'pending' && orders.length === 1 && currentPage > 1) {
          handleCloseModal();
          setCurrentPage(currentPage - 1);
          return;
        }

        if (filterStatus === 'pending') {
          removeOrderFromState(selectedOrder.id);
          decrementPagination(1);
        } else {
          patchOrderInState(selectedOrder.id, {
            status: 'accepted',
            preparation_time: actionFormData.preparation_time || 15,
            accepted_at: new Date().toISOString()
          });
        }
        handleCloseModal();
      } else {
        throw new Error('Échec de l\'acceptation');
      }
    } catch (err) {
      console.error('Erreur acceptation:', err);
      setError(getErrorMessage(err, 'Impossible d\'accepter la commande'));
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
        if (filterStatus === 'pending' && orders.length === 1 && currentPage > 1) {
          handleCloseModal();
          setCurrentPage(currentPage - 1);
          return;
        }

        if (filterStatus === 'pending') {
          removeOrderFromState(selectedOrder.id);
          decrementPagination(1);
        } else {
          patchOrderInState(selectedOrder.id, {
            status: 'declined',
            decline_reason: actionFormData.decline_reason
          });
        }
        handleCloseModal();
      } else {
        throw new Error('Échec du refus');
      }
    } catch (err) {
      console.error('Erreur refus:', err);
      setError(getErrorMessage(err, 'Impossible de refuser la commande'));
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

  const totalItems = pagination.total_items || 0;
  const totalPages = Math.max(1, pagination.total_pages || 1);

  const handlePageChange = (page: number) => {
    if (loading) return;
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };
  const pageNumbers = getPageNumbers();

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestion des Commandes</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {pagination.total_items} commande{pagination.total_items > 1 ? 's' : ''} trouvée{pagination.total_items > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Cartes
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${
                    viewMode === 'table'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Tableau
                </button>
              </div>

              <button
                onClick={fetchOrders}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Chargement...' : 'Actualiser'}</span>
              </button>
            </div>
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
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par n° commande, client ou restaurant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as typeof filterStatus);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
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
                onChange={(e) => {
                  setFilterType(e.target.value as typeof filterType);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
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
            <div className="px-4 sm:px-6 py-5 sm:py-6">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">
                    Aucune commande trouvée
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Essayez de modifier vos critères de recherche
                  </p>
                </div>
              ) : viewMode === 'cards' ? (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200/70 rounded-3xl bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Commande
                          </p>
                          <p className="text-lg font-semibold text-gray-900">
                            {order.order_number}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(order.created_at)}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-1 md:items-end">
                          {getStatusBadge(order.status)}
                          <div className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                            {order.order_type === 'delivery' ? (
                              <>
                                <Truck className="w-4 h-4 text-blue-500" />
                                Livraison
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4 text-emerald-500" />
                                À emporter
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500">Client</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.client
                              ? `${order.client.first_name} ${order.client.last_name}`
                              : 'N/A'}
                          </p>
                          {order.client?.phone_number && (
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              {order.client.phone_number}
                            </p>
                          )}
                          {order.client?.email && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                              <Mail className="w-3 h-3" />
                              {order.client.email}
                            </p>
                          )}
                          {order.client?.address && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                              <MapPin className="w-3 h-3" />
                              {order.client.address}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500">Restaurant</p>
                          <div className="flex items-center gap-2">
                            {order.restaurant?.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={order.restaurant.image_url}
                                alt={order.restaurant.name || 'Restaurant'}
                                className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Store className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <p className="text-sm font-semibold text-gray-900">
                              {order.restaurant?.name || 'N/A'}
                            </p>
                          </div>
                          {order.restaurant?.address && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                              <MapPin className="w-3 h-3" />
                              {order.restaurant.address}
                            </p>
                          )}
                          {order.restaurant?.phone_number && (
                            <p className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              {order.restaurant.phone_number}
                            </p>
                          )}
                          {order.restaurant?.email && (
                            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
                              <Mail className="w-3 h-3" />
                              {order.restaurant.email}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500">Montant</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(order.total_amount ?? 0)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Sous-total: {formatCurrency(order.subtotal ?? 0)}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <DollarSign className="w-3 h-3" />
                            {getPaymentMethodLabel(order.payment_method)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs uppercase text-gray-500">Livraison</p>
                          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                            {order.order_type === 'delivery' ? (
                              <>
                                <Truck className="w-4 h-4 text-blue-500" />
                                Livraison
                              </>
                            ) : (
                              <>
                                <Package className="w-4 h-4 text-emerald-500" />
                                À emporter
                              </>
                            )}
                          </div>
                          {order.delivery_address ? (
                            <p className="text-xs text-gray-500 truncate">
                              {order.delivery_address}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">Sans adresse</p>
                          )}
                          {order.estimated_delivery_time && (
                            <p className="text-xs text-gray-500">
                              Prévu: {order.estimated_delivery_time}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 mt-4">
                        <button
                          onClick={() => handleAction(order, 'view')}
                          className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                          Voir les détails
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(order, 'accept')}
                              className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition"
                            >
                              Accepter
                            </button>
                            <button
                              onClick={() => handleAction(order, 'decline')}
                              className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition"
                            >
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="-mx-4 sm:-mx-6 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Commande
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Restaurant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="hidden xl:table-cell px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Livraison
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {order.order_number}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(order.created_at)}
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
                              {order.order_type === 'delivery' ? (
                                <>
                                  <Truck className="w-3.5 h-3.5 text-blue-500" />
                                  Livraison
                                </>
                              ) : (
                                <>
                                  <Package className="w-3.5 h-3.5 text-emerald-500" />
                                  À emporter
                                </>
                              )}
                            </div>

                            <div className="mt-2 space-y-1 text-xs text-gray-500 md:hidden max-w-[220px]">
                              <div className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3" />
                                <span className="font-semibold text-gray-700">Client:</span>
                                <span className="truncate">
                                  {order.client
                                    ? `${order.client.first_name} ${order.client.last_name}`
                                    : 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 truncate">
                                <Store className="w-3 h-3" />
                                <span className="font-semibold text-gray-700">Resto:</span>
                                <span className="truncate">{order.restaurant?.name || 'N/A'}</span>
                              </div>
                              {order.order_type === 'delivery' && order.delivery_address && (
                                <div className="flex items-center gap-1 truncate">
                                  <MapPin className="w-3 h-3" />
                                  <span className="truncate">{order.delivery_address}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(order.status)}
                          </td>

                          <td className="hidden md:table-cell px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {order.client
                                ? `${order.client.first_name} ${order.client.last_name}`
                                : 'N/A'}
                            </div>
                            {order.client?.phone_number && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />
                                {order.client.phone_number}
                              </div>
                            )}
                            {order.client?.email && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate max-w-[260px]">
                                <Mail className="w-3 h-3" />
                                {order.client.email}
                              </div>
                            )}
                          </td>

                          <td className="hidden lg:table-cell px-6 py-4">
                            <div className="flex items-center gap-2">
                              {order.restaurant?.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={order.restaurant.image_url}
                                  alt={order.restaurant.name || 'Restaurant'}
                                  className="w-8 h-8 rounded-lg object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <Store className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate max-w-[240px]">
                                  {order.restaurant?.name || 'N/A'}
                                </div>
                                {order.restaurant?.phone_number && (
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                    <Phone className="w-3 h-3" />
                                    {order.restaurant.phone_number}
                                  </div>
                                )}
                              </div>
                            </div>
                            {order.restaurant?.address && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 truncate max-w-[320px]">
                                <MapPin className="w-3 h-3" />
                                {order.restaurant.address}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(order.total_amount ?? 0)}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {getPaymentMethodLabel(order.payment_method)}
                            </div>
                          </td>

                          <td className="hidden xl:table-cell px-6 py-4 max-w-[320px]">
                            {order.order_type === 'delivery' ? (
                              <>
                                {order.delivery_address ? (
                                  <div className="text-xs text-gray-600 truncate">
                                    {order.delivery_address}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400">Sans adresse</div>
                                )}
                                {order.estimated_delivery_time && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Prévu: {order.estimated_delivery_time}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-gray-500">À emporter</div>
                            )}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex flex-col items-stretch sm:flex-row sm:items-center gap-2">
                              <button
                                onClick={() => handleAction(order, 'view')}
                                className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition inline-flex items-center justify-center gap-1"
                              >
                                <Eye className="w-4 h-4" />
                                Détails
                              </button>
                              {order.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAction(order, 'accept')}
                                    className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition"
                                  >
                                    Accepter
                                  </button>
                                  <button
                                    onClick={() => handleAction(order, 'decline')}
                                    className="w-full sm:w-auto px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                  >
                                    Refuser
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
              )}
            </div>

            {/* Pagination */}
            {!loading && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="text-sm text-gray-700">
                      Affichage de{' '}
                      <span className="font-medium">
                        {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                      </span>{' '}
                      à{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, totalItems)}
                      </span>{' '}
                      sur <span className="font-medium">{totalItems}</span> résultats
                    </div>

                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none bg-white"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={`order-page-size-${size}`} value={size}>
                          {size} par page
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors bg-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Précédent</span>
                    </button>

                    {pageNumbers[0] > 1 && (
                      <>
                        <button
                          onClick={() => handlePageChange(1)}
                          disabled={loading}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white bg-white"
                        >
                          1
                        </button>
                        {pageNumbers[0] > 2 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                      </>
                    )}

                    {pageNumbers.map((page) => (
                      <button
                        key={`order-page-${page}`}
                        onClick={() => handlePageChange(page)}
                        disabled={loading}
                        className={`px-3 py-2 border rounded-lg transition-colors ${
                          currentPage === page
                            ? 'bg-green-600 text-white border-green-600 font-medium'
                            : 'border-gray-300 hover:bg-white bg-white'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          disabled={loading}
                          className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white bg-white"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors bg-white"
                    >
                      <span className="hidden sm:inline">Suivant</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
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
                      {selectedOrder.client ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            {selectedOrder.client.first_name} {selectedOrder.client.last_name}
                          </p>
                          {selectedOrder.client.phone_number && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {selectedOrder.client.phone_number}
                            </p>
                          )}
                          {selectedOrder.client.email && (
                            <p className="text-sm text-gray-600 flex items-center truncate">
                              <Mail className="w-3 h-3 mr-1" />
                              {selectedOrder.client.email}
                            </p>
                          )}
                          {selectedOrder.client.address && (
                            <p className="text-sm text-gray-600 flex items-center truncate">
                              <MapPin className="w-3 h-3 mr-1" />
                              {selectedOrder.client.address}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">N/A</p>
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Store className="w-4 h-4 mr-2" />
                        Restaurant
                      </h4>
                      {selectedOrder.restaurant ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900">
                            {selectedOrder.restaurant.name}
                          </p>
                          {selectedOrder.restaurant.address && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {selectedOrder.restaurant.address}
                            </p>
                          )}
                          {selectedOrder.restaurant.phone_number && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {selectedOrder.restaurant.phone_number}
                            </p>
                          )}
                          {selectedOrder.restaurant.email && (
                            <p className="text-sm text-gray-600 flex items-center truncate">
                              <Mail className="w-3 h-3 mr-1" />
                              {selectedOrder.restaurant.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">N/A</p>
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
