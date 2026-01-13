'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type CashierStatus = 'active' | 'on_break' | 'offline' | 'suspended' | string;

type Permissions = {
  can_create_orders: boolean;
  can_cancel_orders: boolean;
  can_apply_discounts: boolean;
  can_process_refunds: boolean;
  can_view_reports: boolean;
};

type RestaurantOption = {
  id: string;
  name: string;
  address?: string;
};

const defaultPermissions: Permissions = {
  can_create_orders: true,
  can_cancel_orders: false,
  can_apply_discounts: false,
  can_process_refunds: false,
  can_view_reports: false,
};

interface Cashier {
  id: string;
  user_id: string;
  restaurant_id: string;
  restaurant?: RestaurantOption | null;
  cashier_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  status: CashierStatus;
  is_active: boolean;
  total_orders_processed?: number;
  total_sales_amount?: number;
  last_active_at?: string | null;
  profile_image_url?: string | null;
  permissions?: Permissions;
  created_at?: string;
  updated_at?: string;
}

type ModalType = '' | 'view' | 'edit' | 'delete' | 'create';

interface CreateCashierForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image_url: string;
  restaurant_id: string;
  permissions: Permissions;
}

export default function CashierManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState<boolean>(false);
  const [restaurantError, setRestaurantError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | CashierStatus>('all');
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [createForm, setCreateForm] = useState<CreateCashierForm>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    profile_image_url: '',
    restaurant_id: '',
    permissions: { ...defaultPermissions },
  });

  const [editForm, setEditForm] = useState<Partial<Cashier>>({});
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string>('');

  useEffect(() => {
    fetchCashiers();
  }, [currentPage, pageSize, searchTerm, filterStatus]);

  useEffect(() => {
    let active = true;
    const isRestaurantEntry = (entry: RestaurantOption | null): entry is RestaurantOption =>
      Boolean(entry);

    const loadRestaurants = async () => {
      try {
        setRestaurantsLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
          throw new Error('Non authentifie');
        }
        const response = await fetch(`${API_URL}/restaurant/getall`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Impossible de charger la liste des restaurants');
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data) ? payload.data : [];

        if (!active) {
          return;
        }

        const formatted: RestaurantOption[] = list
          .map((entry: { id?: string; name?: string; company_name?: string; address?: string }) => {
            if (!entry?.id) {
              return null;
            }
            const label = entry.name ?? entry.company_name ?? String(entry.id);
            return { id: entry.id, name: label, address: entry.address };
          })
          .filter(isRestaurantEntry)
          .sort((a: RestaurantOption, b: RestaurantOption) => a.name.localeCompare(b.name));

        setRestaurants(formatted);
        setRestaurantError('');
      } catch (err: any) {
        console.error('Erreur fetch restaurants:', err);
        if (active) {
          setRestaurantError(err?.message || 'Impossible de charger les restaurants');
        }
      } finally {
        if (active) {
          setRestaurantsLoading(false);
        }
      }
    };

    loadRestaurants();
    return () => {
      active = false;
    };
  }, []);

  // Réinitialiser à la page 1 quand la recherche ou le filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const fetchCashiers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifi?. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`${API_URL}/cashier/getall?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement des caissiers');
      const data = await res.json();
      if (data.success && data.data) {
        setCashiers(data.data as Cashier[]);
        const count = data.pagination?.total_items ?? data.count ?? data.total ?? data.data.length;
        setTotalCount(count);
        const pages = data.pagination?.total_pages || Math.max(1, Math.ceil(Math.max(count, 1) / pageSize));
        setTotalPages(pages);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const resetImageState = () => {
    setImagePreview(null);
    setImageUploadError('');
    setUploadingImage(false);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>, target: 'create' | 'edit') => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImageUploadError('');

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Veuillez selectionner une image valide.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImageUploadError("L'image ne doit pas depasser 5 MB.");
      event.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Echec de l'upload de l'image.");
      }

      const data = await response.json().catch(() => ({}));
      const url = typeof data?.url === 'string' ? data.url : '';
      if (!url) {
        throw new Error("URL de l'image manquante.");
      }

      if (target === 'create') {
        setCreateForm((prev) => ({ ...prev, profile_image_url: url }));
      } else {
        setEditForm((prev) => ({ ...prev, profile_image_url: url }));
      }
      setImagePreview(URL.createObjectURL(file));
    } catch (err: any) {
      setImageUploadError(err?.message || "Erreur lors de l'upload.");
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = (target: 'create' | 'edit') => {
    setImageUploadError('');
    setImagePreview(null);
    if (target === 'create') {
      setCreateForm((prev) => ({ ...prev, profile_image_url: '' }));
    } else {
      setEditForm((prev) => ({ ...prev, profile_image_url: '' }));
    }
  };

  const resetAndClose = () => {
    setShowModal(false);
    setModalType('');
    setSelectedCashier(null);
    setCreateForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      profile_image_url: '',
      restaurant_id: '',
      permissions: { ...defaultPermissions },
    });
    setEditForm({});
    resetImageState();
  };

  const handleCreate = async () => {
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const payload = {
        ...createForm,
        profile_image_url: createForm.profile_image_url || null
      };

      const res = await fetch(`${API_URL}/auth/register/cashier`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de cr?ation');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCashier) return;
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const payload: any = { ...editForm };
      delete payload.id;
      if (payload.profile_image_url === '') {
        payload.profile_image_url = null;
      }

      const res = await fetch(`${API_URL}/cashier/update/${selectedCashier.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de mise ? jour');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCashier) return;
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const res = await fetch(`${API_URL}/cashier/delete/${selectedCashier.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de suppression');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const openModal = (type: ModalType, cashier?: Cashier) => {
    resetImageState();
    setModalType(type);
    setShowModal(true);
    if (cashier) {
      setSelectedCashier(cashier);
      setEditForm({
        first_name: cashier.first_name,
        last_name: cashier.last_name,
        phone: cashier.phone,
        email: cashier.email || '',
        status: cashier.status,
        is_active: cashier.is_active,
        permissions: cashier.permissions,
        restaurant_id: cashier.restaurant_id,
        profile_image_url: cashier.profile_image_url ?? ''
      });
    } else {
      setSelectedCashier(null);
    }
  };

  const renderStatusBadge = (status: CashierStatus) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      on_break: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'active' && '🟢'}
        {status === 'on_break' && '🟡'}
        {status === 'offline' && '⚫'}
        {status === 'suspended' && '🔴'}
        {' '}
        {status === 'active' && 'Actif'}
        {status === 'on_break' && 'En pause'}
        {status === 'offline' && 'Hors ligne'}
        {status === 'suspended' && 'Suspendu'}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const resolveRestaurantName = (cashier: Cashier | null) => {
    if (!cashier) return 'Restaurant inconnu';
    if (cashier.restaurant?.name) {
      return cashier.restaurant.name;
    }
    const match = restaurants.find((restaurant) => restaurant.id === cashier.restaurant_id);
    return match?.name || 'Restaurant inconnu';
  };

  const startIndex = (currentPage - 1) * pageSize;
  const showingFrom = totalCount === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + cashiers.length, totalCount);
  const createImageUrl = imagePreview || createForm.profile_image_url;
  const editImageUrl =
    imagePreview ||
    (editForm.profile_image_url !== undefined ? editForm.profile_image_url : selectedCashier?.profile_image_url);
  const restaurantPlaceholder = restaurantsLoading
    ? 'Chargement des restaurants...'
    : restaurants.length === 0
    ? 'Aucun restaurant disponible'
    : 'Selectionner un restaurant';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestion des Caissiers</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {totalCount} caissier{totalCount !== 1 ? 's' : ''} trouvé{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal('create')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <Plus size={16} /> Nouveau caissier
              </button>
              <button
                onClick={fetchCashiers}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Erreur</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres */}
          <div className="mt-6 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="on_break">En pause</option>
              <option value="offline">Hors ligne</option>
              <option value="suspended">Suspendus</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Par page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
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
                      Caissier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restaurant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Commandes
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
                  {cashiers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img
                            src={
                              c.profile_image_url ||
                              `https://ui-avatars.com/api/?name=${c.first_name}+${c.last_name}&background=16a34a&color=fff`
                            }
                            alt={`${c.first_name} ${c.last_name}`}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono mt-1">
                              {c.cashier_code}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {c.is_active ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  <UserX className="w-3 h-3 mr-1" />
                                  Inactif
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {c.email && (
                            <div className="flex items-center gap-2 mb-1">
                              <Mail className="w-4 h-4 text-gray-400" />
                              {c.email}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {c.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono text-gray-900">{c.cashier_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{resolveRestaurantName(c)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(c.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          {c.total_orders_processed ?? 0}
                        </div>
                        {c.total_sales_amount && (
                          <div className="text-xs text-gray-500">
                            {c.total_sales_amount} DA
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {c.created_at && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(c.created_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal('view', c)}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('edit', c)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('delete', c)}
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

            {cashiers.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucun caissier trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            )}

            {totalCount > 0 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Affichage de <span className="font-medium">{showingFrom}</span> à{' '}
                  <span className="font-medium">{showingTo}</span>{' '}
                  sur <span className="font-medium">{totalCount}</span> caissier
                  {totalCount !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Précédent</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-green-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                  >
                    <span className="hidden sm:inline">Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'create' && 'Créer un Nouveau Caissier'}
                {modalType === 'view' && 'Détails du Caissier'}
                {modalType === 'edit' && 'Modifier le Caissier'}
                {modalType === 'delete' && 'Confirmer la Suppression'}
              </h2>
              <button
                onClick={resetAndClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">

              {modalType === 'create' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Prénom"
                        value={createForm.first_name}
                        onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom"
                        value={createForm.last_name}
                        onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Téléphone"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Mot de passe"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        value={createForm.restaurant_id}
                        onChange={(e) => setCreateForm({ ...createForm, restaurant_id: e.target.value })}
                      >
                        <option value="">{restaurantPlaceholder}</option>
                        {restaurants.map((restaurant) => (
                          <option key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </option>
                        ))}
                      </select>
                      {restaurantError && (
                        <p className="mt-1 text-xs text-red-600">{restaurantError}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Photo de profil (optionnel)
                    </label>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                      {createImageUrl ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <img
                            src={createImageUrl || ''}
                            alt="Apercu"
                            className="h-20 w-20 rounded-md object-cover border border-gray-200"
                          />
                          <div className="flex-1">
                            {!imagePreview && createForm.profile_image_url ? (
                              <p className="text-xs text-gray-500 break-all">{createForm.profile_image_url}</p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('create')}
                            disabled={uploadingImage || saveLoading}
                            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Supprimer
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Aucune image selectionnee.</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          htmlFor="cashier-create-image-upload"
                          className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white ${
                            uploadingImage || saveLoading
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer hover:bg-gray-100'
                          }`}
                        >
                          {uploadingImage
                            ? 'Upload en cours...'
                            : createImageUrl
                            ? "Changer l'image"
                            : 'Telecharger une image'}
                        </label>
                        <input
                          id="cashier-create-image-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'create')}
                          disabled={uploadingImage || saveLoading}
                          className="sr-only"
                        />
                        <span className="text-xs text-gray-500">Formats image, max 5 MB</span>
                      </div>
                    </div>
                    {imageUploadError && (
                      <p className="mt-1 text-xs text-red-600">{imageUploadError}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permissions
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(createForm.permissions).map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={(createForm.permissions as any)[key]}
                            onChange={(e) => setCreateForm({
                              ...createForm,
                              permissions: { ...createForm.permissions, [key]: e.target.checked },
                            })}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span>{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'delete' && selectedCashier ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Êtes-vous sûr de vouloir supprimer ce caissier ?
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>{selectedCashier.first_name} {selectedCashier.last_name}</strong> ({selectedCashier.cashier_code})
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible. Toutes les données du caissier
                    seront supprimées.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={resetAndClose}
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
              ) : modalType === 'view' && selectedCashier ? (
                <div className="space-y-6">
                  {/* Photo de profil */}
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        selectedCashier.profile_image_url ||
                        `https://ui-avatars.com/api/?name=${selectedCashier.first_name}+${selectedCashier.last_name}&background=16a34a&color=fff`
                      }
                      alt={`${selectedCashier.first_name} ${selectedCashier.last_name}`}
                      className="w-20 h-20 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedCashier.first_name} {selectedCashier.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {selectedCashier.cashier_code}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedCashier.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Compte actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <UserX className="w-3 h-3 mr-1" />
                            Compte inactif
                          </span>
                        )}
                        {renderStatusBadge(selectedCashier.status)}
                      </div>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <p className="text-sm text-gray-900">{selectedCashier.first_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <p className="text-sm text-gray-900">{selectedCashier.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {selectedCashier.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <p className="text-sm text-gray-900 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {selectedCashier.phone}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant
                      </label>
                      <p className="text-sm text-gray-900">{resolveRestaurantName(selectedCashier)}</p>
                    </div>
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {selectedCashier.total_orders_processed ?? 0}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Commandes traitées
                      </div>
                    </div>
                    {selectedCashier.total_sales_amount && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedCashier.total_sales_amount} DA
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Chiffre d'affaires
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Permissions */}
                  {selectedCashier.permissions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permissions
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedCashier.permissions).map(([key, value]) => (
                          value && (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {key.replace(/_/g, ' ')}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {modalType === 'edit' && selectedCashier && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Prénom"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Téléphone"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={editForm.status || 'offline'}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="active">Actif</option>
                        <option value="on_break">En pause</option>
                        <option value="offline">Hors ligne</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Restaurant
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                        value={editForm.restaurant_id || ''}
                        onChange={(e) => setEditForm({ ...editForm, restaurant_id: e.target.value })}
                      >
                        <option value="">{restaurantPlaceholder}</option>
                        {restaurants.map((restaurant) => (
                          <option key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </option>
                        ))}
                      </select>
                      {restaurantError && (
                        <p className="mt-1 text-xs text-red-600">{restaurantError}</p>
                      )}
                    </div>
                  <div className="flex items-center gap-4 pt-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Compte actif</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo de profil (optionnel)
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                    {editImageUrl ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <img
                          src={editImageUrl || ''}
                          alt="Apercu"
                          className="h-20 w-20 rounded-md object-cover border border-gray-200"
                        />
                        <div className="flex-1">
                          {!imagePreview && editForm.profile_image_url ? (
                            <p className="text-xs text-gray-500 break-all">{editForm.profile_image_url}</p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('edit')}
                          disabled={uploadingImage || saveLoading}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Aucune image selectionnee.</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="cashier-edit-image-upload"
                        className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white ${
                          uploadingImage || saveLoading
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:bg-gray-100'
                        }`}
                      >
                        {uploadingImage
                          ? 'Upload en cours...'
                          : editImageUrl
                          ? "Changer l'image"
                          : 'Telecharger une image'}
                      </label>
                      <input
                        id="cashier-edit-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'edit')}
                        disabled={uploadingImage || saveLoading}
                        className="sr-only"
                      />
                      <span className="text-xs text-gray-500">Formats image, max 5 MB</span>
                    </div>
                  </div>
                  {imageUploadError && (
                    <p className="mt-1 text-xs text-red-600">{imageUploadError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCashier.permissions && Object.keys(selectedCashier.permissions).map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={(editForm.permissions as any)?.[key] ?? (selectedCashier.permissions as any)[key]}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              permissions: {
                                ...(editForm.permissions || selectedCashier.permissions || defaultPermissions),
                                [key]: e.target.checked,
                              } as Permissions,
                            })}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span>{key.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {modalType !== 'delete' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={resetAndClose}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {modalType === 'view' ? 'Fermer' : 'Annuler'}
                </button>
                {modalType === 'create' && (
                  <button
                    onClick={handleCreate}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      'Créer'
                    )}
                  </button>
                )}
                {modalType === 'edit' && (
                  <button
                    onClick={handleUpdate}
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
