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
  AlertCircle,
  Car,
  Star,
  TrendingUp,
  MapPin,
  Activity,
  Award,
  Plus,
  X,
  Save
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

type DriverStatus = 'available' | 'busy' | 'offline' | 'suspended' | string;
type VehicleType = 'motorcycle' | 'bicycle' | 'scooter' | string;

interface Driver {
  id: string;
  user_id: string;
  driver_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  vehicle_type: VehicleType;
  vehicle_plate?: string | null;
  license_number?: string | null;
  status: DriverStatus;
  current_location?: any;
  rating?: number | null;
  total_deliveries: number;
  active_orders: string[];
  max_orders_capacity: number;
  is_verified: boolean;
  is_active: boolean;
  last_active_at?: string | null;
  notes?: string | null;
  cancellation_count: number;
  created_at: string;
  updated_at: string;
  profile_image_url:string;
}

type ModalType = '' | 'view' | 'edit' | 'delete' | 'create';
type ActiveTab = 'all' | 'requests';

interface CreateDriverForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  vehicle_type: VehicleType;
  vehicle_plate: string;
  license_number: string;
  is_verified: boolean;
  is_active: boolean;
}

interface EditDriverForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  vehicle_type: VehicleType;
  vehicle_plate: string;
  license_number: string;
  is_verified: boolean;
  is_active: boolean;
  status: DriverStatus;
  notes: string;
}

export default function DriverManagement() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'available' | 'busy' | 'offline' | 'suspended' | 'verified' | 'unverified'
  >('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [editFormData, setEditFormData] = useState<Partial<EditDriverForm>>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Validation states
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Create form state
  const [createForm, setCreateForm] = useState<CreateDriverForm>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    vehicle_type: 'motorcycle',
    vehicle_plate: '',
    license_number: '',
    is_verified: false,
    is_active: true
  });

  // Récupérer les livreurs depuis le backend
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/driver/getall`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des livreurs');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const allDrivers = data.data as Driver[];
        setDrivers(allDrivers);
        
        // Séparer les livreurs non vérifiés et non suspendus
        const unverified = allDrivers.filter(d => !d.is_verified && d.status !== 'suspended');
        setPendingDrivers(unverified);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch drivers:', err);
      setError(err?.message || 'Impossible de charger les livreurs');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les livreurs
  const filteredDrivers = drivers.filter((driver) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      driver.first_name?.toLowerCase().includes(search) ||
      driver.last_name?.toLowerCase().includes(search) ||
      driver.email?.toLowerCase().includes(search) ||
      driver.phone?.includes(searchTerm) ||
      driver.driver_code?.toLowerCase().includes(search);

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'available' && driver.status === 'available') ||
      (filterStatus === 'busy' && driver.status === 'busy') ||
      (filterStatus === 'offline' && driver.status === 'offline') ||
      (filterStatus === 'suspended' && driver.status === 'suspended') ||
      (filterStatus === 'verified' && driver.is_verified) ||
      (filterStatus === 'unverified' && !driver.is_verified);

    return matchesSearch && matchesFilter;
  });

  // Gérer les actions
  const handleAction = (driver: Driver, type: ModalType) => {
    setSelectedDriver(driver);

    if (type === 'edit') {
      setEditFormData({
        first_name: driver.first_name,
        last_name: driver.last_name,
        email: driver.email ?? '',
        phone: driver.phone,
        vehicle_type: driver.vehicle_type,
        vehicle_plate: driver.vehicle_plate ?? '',
        license_number: driver.license_number ?? '',
        is_verified: driver.is_verified,
        is_active: driver.is_active,
        status: driver.status,
        notes: driver.notes ?? ''
      });
    }

    setModalType(type);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDriver(null);
    setModalType('');
    setEditFormData({});
    setSaveLoading(false);
    setError('');
    setCreateFormErrors({});
    setEditFormErrors({});
    // Reset create form
    setCreateForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      vehicle_type: 'motorcycle',
      vehicle_plate: '',
      license_number: '',
      is_verified: false,
      is_active: true
    });
  };

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email.trim()) return 'L\'email est obligatoire';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Format d\'email invalide';
    return '';
  };

  const validatePassword = (password: string): string => {
    if (!password) return 'Le mot de passe est obligatoire';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    return '';
  };

  const validateName = (name: string, fieldName: string): string => {
    if (!name.trim()) return `${fieldName} est obligatoire`;
    if (name.trim().length < 2) return `${fieldName} doit contenir au moins 2 caractères`;
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return 'Le téléphone est obligatoire';
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(phone.trim())) return 'Format de téléphone invalide';
    return '';
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    errors.email = validateEmail(createForm.email);
    errors.password = validatePassword(createForm.password);
    errors.first_name = validateName(createForm.first_name, 'Le prénom');
    errors.last_name = validateName(createForm.last_name, 'Le nom');
    errors.phone = validatePhone(createForm.phone);

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editFormData.email !== undefined) {
      errors.email = validateEmail(editFormData.email);
    }
    if (editFormData.first_name !== undefined) {
      errors.first_name = validateName(editFormData.first_name, 'Le prénom');
    }
    if (editFormData.last_name !== undefined) {
      errors.last_name = validateName(editFormData.last_name, 'Le nom');
    }
    if (editFormData.phone !== undefined) {
      errors.phone = validatePhone(editFormData.phone);
    }

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateDriver = async () => {
    // Validation
    if (!validateCreateForm()) {
      setError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...createForm,
          type: 'driver'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la création');
      }

      const data = await response.json();

      if (data.success || data.access_token) {
        setError('');
        alert('Livreur créé avec succès');
        handleCloseModal();
        await fetchDrivers();
      } else {
        throw new Error('Échec de la création');
      }
    } catch (err: any) {
      console.error('Erreur création:', err);
      setError(err?.message || 'Impossible de créer le livreur');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDriver) {
      setError('Aucun livreur sélectionné');
      return;
    }

    // Validation
    if (!validateEditForm()) {
      setError('Veuillez corriger les erreurs dans le formulaire');
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
        first_name: editFormData.first_name ?? selectedDriver.first_name,
        last_name: editFormData.last_name ?? selectedDriver.last_name,
        email: editFormData.email ?? selectedDriver.email ?? '',
        phone: editFormData.phone ?? selectedDriver.phone,
        vehicle_type: editFormData.vehicle_type ?? selectedDriver.vehicle_type,
        vehicle_plate: editFormData.vehicle_plate ?? selectedDriver.vehicle_plate ?? '',
        license_number: editFormData.license_number ?? selectedDriver.license_number ?? '',
        is_verified: editFormData.is_verified ?? selectedDriver.is_verified,
        is_active: editFormData.is_active ?? selectedDriver.is_active,
        status: editFormData.status ?? selectedDriver.status,
        notes: editFormData.notes ?? selectedDriver.notes ?? ''
      };

      const response = await fetch(`${API_URL}/driver/update/${selectedDriver.id}`, {
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
        await fetchDrivers();
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

  const handleApproveDriver = async (driver: Driver) => {
    if (confirm(`Approuver le livreur ${driver.first_name} ${driver.last_name} ?`)) {
      try {
        setSaveLoading(true);
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${API_URL}/driver/update/${driver.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_verified: true,
            is_active: true,
            status: 'available'
          })
        });

        if (!response.ok) throw new Error('Erreur lors de l\'approbation');

        setError('');
        alert('Livreur approuvé avec succès');
        await fetchDrivers();
      } catch (err: any) {
        console.error('Erreur approbation:', err);
        setError(err?.message || 'Impossible d\'approuver le livreur');
      } finally {
        setSaveLoading(false);
      }
    }
  };

  const handleRejectDriver = async (driver: Driver) => {
    const reason = prompt(`Raison du rejet de ${driver.first_name} ${driver.last_name} :`);
    if (reason) {
      try {
        setSaveLoading(true);
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`${API_URL}/driver/update/${driver.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            is_verified: false,
            is_active: false,
            status: 'suspended',
            notes: `Rejeté: ${reason}`
          })
        });

        if (!response.ok) throw new Error('Erreur lors du rejet');

        setError('');
        alert('Livreur rejeté');
        await fetchDrivers();
      } catch (err: any) {
        console.error('Erreur rejet:', err);
        setError(err?.message || 'Impossible de rejeter le livreur');
      } finally {
        setSaveLoading(false);
      }
    }
  };

  const handleDeleteModal = async () => {
    if (!selectedDriver) {
      setError('Aucun livreur sélectionné');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/driver/delete/${selectedDriver.id}`, {
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
        await fetchDrivers();
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

  const handleInputChange = (field: keyof EditDriverForm, value: any) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCreateInputChange = (field: keyof CreateDriverForm, value: any) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value
    }));

    // Clear field error when user starts typing
    if (createFormErrors[field]) {
      setCreateFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: DriverStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-blue-100 text-blue-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleIcon = (vehicleType: VehicleType) => {
    return <Car className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full">
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Livreurs</h1>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab === 'all' 
                  ? `${filteredDrivers.length} livreur${filteredDrivers.length > 1 ? 's' : ''} trouvé${filteredDrivers.length > 1 ? 's' : ''}`
                  : `${pendingDrivers.length} demande${pendingDrivers.length > 1 ? 's' : ''} en attente`
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <button
                onClick={() => {
                  setModalType('create');
                  setShowModal(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouveau Livreur
              </button>
              <button
                onClick={fetchDrivers}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {loading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-4 border-b mt-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tous les livreurs ({drivers.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Demandes en attente
              {pendingDrivers.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingDrivers.length}
                </span>
              )}
            </button>
          </div>

          {/* Message d'erreur global */}
          {error && !showModal && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres - seulement pour l'onglet "all" */}
          {activeTab === 'all' && (
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, code, email ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as typeof filterStatus)
                }
                className="w-full sm:w-60 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="available">Disponibles</option>
                <option value="busy">Occupés</option>
                <option value="offline">Hors ligne</option>
                <option value="suspended">Suspendus</option>
                <option value="verified">Vérifiés</option>
                <option value="unverified">Non vérifiés</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : activeTab === 'all' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Livreur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Véhicule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performance
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
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                         <img
                            src={
                              driver.profile_image_url ||
                              `https://ui-avatars.com/api/?name=${driver.first_name}+${driver.last_name}&background=16a34a&color=fff`
                            }
                            alt={`${driver.first_name} ${driver.last_name}`}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.first_name} {driver.last_name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {driver.driver_code}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {driver.is_verified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  Vérifié
                                </span>
                              )}
                              {driver.cancellation_count > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  ⚠️ {driver.cancellation_count} annulation{driver.cancellation_count > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {driver.phone || 'N/A'}
                          </div>
                          {driver.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-xs">{driver.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2 mb-1">
                            {getVehicleIcon(driver.vehicle_type)}
                            <span className="capitalize">{driver.vehicle_type}</span>
                          </div>
                          {driver.vehicle_plate && (
                            <div className="text-xs text-gray-500 font-mono">
                              {driver.vehicle_plate}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">
                              {driver.rating || '5.0'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <TrendingUp className="w-3 h-3" />
                            {driver.total_deliveries} livraison{driver.total_deliveries > 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                            <Activity className="w-3 h-3" />
                            {driver.active_orders.length}/{driver.max_orders_capacity} actives
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            driver.status
                          )}`}
                        >
                          {driver.status === 'available' && '🟢'}
                          {driver.status === 'busy' && '🔵'}
                          {driver.status === 'offline' && '⚫'}
                          {driver.status === 'suspended' && '🔴'}
                          {' '}
                          {driver.status === 'available' && 'Disponible'}
                          {driver.status === 'busy' && 'Occupé'}
                          {driver.status === 'offline' && 'Hors ligne'}
                          {driver.status === 'suspended' && 'Suspendu'}
                        </span>
                        {driver.last_active_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Actif: {formatDate(driver.last_active_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(driver.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(driver, 'view')}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(driver, 'edit')}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(driver, 'delete')}
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

            {filteredDrivers.length === 0 && (
              <div className="text-center py-12">
                <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucun livreur trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Onglet Demandes en attente */
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Demandes de livreurs en attente
            </h2>
            <p className="text-gray-600 mb-6">
              Consultez et gérez les demandes d'inscription des nouveaux livreurs.
            </p>
            {pendingDrivers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingDrivers.map((driver) => (
                  <div key={driver.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {driver.first_name} {driver.last_name}
                        </h3>
                        <p className="text-sm text-gray-500 font-mono mt-1">
                          {driver.driver_code}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 capitalize">
                          {driver.vehicle_type} - {driver.vehicle_plate || 'N/A'}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(driver.created_at)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{driver.phone}</span>
                      </div>
                      {driver.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="text-xs">{driver.email}</span>
                        </div>
                      )}
                      {driver.license_number && (
                        <div className="text-xs text-gray-500">
                          Permis: {driver.license_number}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(driver, 'view')}
                        className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Détails
                      </button>
                      <button
                        onClick={() => handleApproveDriver(driver)}
                        disabled={saveLoading}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectDriver(driver)}
                        disabled={saveLoading}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <UserX className="w-4 h-4" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">Aucune demande en attente</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Create Driver */}
      {showModal && modalType === 'create' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Créer un Nouveau Livreur</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="px-6 py-4">
              {/* Error message in modal */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {/* Informations de compte */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Informations du compte</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => handleCreateInputChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.email 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="driver@example.com"
                        required
                      />
                      {createFormErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => handleCreateInputChange('password', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.password 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="••••••••"
                        required
                      />
                      {createFormErrors.password ? (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.password}</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informations personnelles */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Informations personnelles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.first_name}
                        onChange={(e) => handleCreateInputChange('first_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.first_name 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Mohamed"
                        required
                      />
                      {createFormErrors.first_name && (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.last_name}
                        onChange={(e) => handleCreateInputChange('last_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.last_name 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="Benali"
                        required
                      />
                      {createFormErrors.last_name && (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.last_name}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={createForm.phone}
                        onChange={(e) => handleCreateInputChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.phone 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                        placeholder="+213 XXX XXX XXX"
                        required
                      />
                      {createFormErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informations du véhicule */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Informations du véhicule</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de véhicule
                      </label>
                      <select
                        value={createForm.vehicle_type}
                        onChange={(e) => handleCreateInputChange('vehicle_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="motorcycle">Moto</option>
                        <option value="bicycle">Vélo</option>
                        <option value="scooter">Scooter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plaque d'immatriculation
                      </label>
                      <input
                        type="text"
                        value={createForm.vehicle_plate}
                        onChange={(e) => handleCreateInputChange('vehicle_plate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="ABC-1234"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numéro de permis
                      </label>
                      <input
                        type="text"
                        value={createForm.license_number}
                        onChange={(e) => handleCreateInputChange('license_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123456789"
                      />
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Options</h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.is_verified}
                        onChange={(e) => handleCreateInputChange('is_verified', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Compte vérifié
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createForm.is_active}
                        onChange={(e) => handleCreateInputChange('is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Compte actif
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={handleCloseModal}
                disabled={saveLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateDriver}
                disabled={saveLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Créer le livreur
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View/Edit/Delete Driver */}
      {showModal && selectedDriver && modalType !== 'create' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'view' && 'Détails du Livreur'}
                {modalType === 'edit' && 'Modifier le Livreur'}
                {modalType === 'delete' && 'Confirmer la Suppression'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Error message in modal */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {modalType === 'delete' ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Êtes-vous sûr de vouloir supprimer ce livreur ?
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>{selectedDriver.first_name} {selectedDriver.last_name}</strong> ({selectedDriver.driver_code})
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible. Toutes les données du livreur
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
                      onClick={handleDeleteModal}
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
                  {/* Photo de profil / Icon */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                      <Car className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedDriver.first_name} {selectedDriver.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">
                        {selectedDriver.driver_code}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {selectedDriver.is_verified ? (
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDriver.status)}`}>
                          {selectedDriver.status}
                        </span>
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
                            : selectedDriver.first_name
                        }
                        onChange={(e) =>
                          handleInputChange('first_name', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          modalType === 'edit' && editFormErrors.first_name 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {modalType === 'edit' && editFormErrors.first_name && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.first_name}</p>
                      )}
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
                            : selectedDriver.last_name
                        }
                        onChange={(e) =>
                          handleInputChange('last_name', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          modalType === 'edit' && editFormErrors.last_name 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {modalType === 'edit' && editFormErrors.last_name && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={
                          modalType === 'edit'
                            ? editFormData.phone ?? ''
                            : selectedDriver.phone
                        }
                        onChange={(e) =>
                          handleInputChange('phone', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          modalType === 'edit' && editFormErrors.phone 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {modalType === 'edit' && editFormErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.phone}</p>
                      )}
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
                            : selectedDriver.email ?? ''
                        }
                        onChange={(e) =>
                          handleInputChange('email', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${
                          modalType === 'edit' && editFormErrors.email 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      />
                      {modalType === 'edit' && editFormErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{editFormErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type de véhicule
                      </label>
                      {modalType === 'edit' ? (
                        <select
                          value={editFormData.vehicle_type ?? selectedDriver.vehicle_type}
                          onChange={(e) =>
                            handleInputChange('vehicle_type', e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="motorcycle">Moto</option>
                          <option value="bicycle">Vélo</option>
                          <option value="scooter">Scooter</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={selectedDriver.vehicle_type}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50 disabled:text-gray-500 capitalize"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plaque d'immatriculation
                      </label>
                      <input
                        type="text"
                        value={
                          modalType === 'edit'
                            ? editFormData.vehicle_plate ?? ''
                            : selectedDriver.vehicle_plate ?? ''
                        }
                        onChange={(e) =>
                          handleInputChange('vehicle_plate', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Numéro de permis
                      </label>
                      <input
                        type="text"
                        value={
                          modalType === 'edit'
                            ? editFormData.license_number ?? ''
                            : selectedDriver.license_number ?? ''
                        }
                        onChange={(e) =>
                          handleInputChange('license_number', e.target.value)
                        }
                        disabled={modalType === 'view'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                    
                    {modalType === 'edit' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={editFormData.status ?? selectedDriver.status}
                            onChange={(e) =>
                              handleInputChange('status', e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="available">Disponible</option>
                            <option value="busy">Occupé</option>
                            <option value="offline">Hors ligne</option>
                            <option value="suspended">Suspendu</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-4 pt-6">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!editFormData.is_verified}
                              onChange={(e) =>
                                handleInputChange('is_verified', e.target.checked)
                              }
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
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
                                handleInputChange('is_active', e.target.checked)
                              }
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Actif
                            </span>
                          </label>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes
                          </label>
                          <textarea
                            value={editFormData.notes ?? ''}
                            onChange={(e) =>
                              handleInputChange('notes', e.target.value)
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Notes administratives..."
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Statistiques */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-600">
                        <Star className="w-5 h-5" />
                        {selectedDriver.rating || '5.0'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Note moyenne
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-blue-600">
                        <TrendingUp className="w-5 h-5" />
                        {selectedDriver.total_deliveries}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Livraisons
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600">
                        <Activity className="w-5 h-5" />
                        {selectedDriver.active_orders.length}/{selectedDriver.max_orders_capacity}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Commandes actives
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-2xl font-bold text-orange-600">
                        ⚠️ {selectedDriver.cancellation_count}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Annulations
                      </div>
                    </div>
                  </div>

                  {/* Date d'inscription */}
                  <div className="text-center text-sm text-gray-500 border-t pt-4">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Inscrit depuis le {formatDate(selectedDriver.created_at)}
                    </div>
                    {selectedDriver.last_active_at && (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <Activity className="w-4 h-4" />
                        Dernière activité: {formatDate(selectedDriver.last_active_at)}
                      </div>
                    )}
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}