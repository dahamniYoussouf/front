'use client'
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MapPin, Star, Phone, Mail, MoreVertical, CheckCircle, XCircle, Clock, Eye, Edit, Trash2, X, Save, AlertCircle, RefreshCw } from 'lucide-react';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Get token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token') || '';
  }
  return '';
};

// API functions
const api = {
  // ... (gardez toutes les fonctions API existantes)
  
  // POST /restaurant/nearbyfilter - Get filtered restaurants
  getRestaurants: async (filters = {}) => {
    try {
      const token = getAuthToken();
      
      const requestBody = {
        categories: filters.categories || undefined,
        address: filters.address || undefined,  
        page: filters.page || 1,
        pageSize: filters.pageSize || 100
      };
      
      const response = await fetch(`${API_BASE_URL}/restaurant/filter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) throw new Error('Failed to fetch restaurants');
      
      const result = await response.json();
      return {
        data: result.data || [],
        count: result.count || 0
      };
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      return { data: [], count: 0 };
    }
  },
  
  getPendingRequests: async () => {
    try {
      const token = getAuthToken();
      
      const requestBody = {
        page: 1,
        pageSize: 100
      };
      
   const response = await fetch(`${API_BASE_URL}/restaurant/filter`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...requestBody,
    status: 'pending'
  })
});
      
      if (!response.ok) throw new Error('Failed to fetch pending requests');
      
      const result = await response.json();
      const pendingRestaurants = result.data;
      
      return {
        data: pendingRestaurants,
        count: pendingRestaurants.length
      };
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return { data: [], count: 0 };
    }
  },

  approveRestaurant: async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'approved',
          is_active: true
        })
      });
      
      if (!response.ok) throw new Error('Failed to approve restaurant');
      return await response.json();
    } catch (error) {
      console.error('Error approving restaurant:', error);
      throw error;
    }
  },

  rejectRestaurant: async (id, reason) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'suspended',
          is_active: false
        })
      });
      
      if (!response.ok) throw new Error('Failed to reject restaurant');
      return await response.json();
    } catch (error) {
      console.error('Error rejecting restaurant:', error);
      throw error;
    }
  },

  updateRestaurant: async (id, data) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Failed to update restaurant');
      return await response.json();
    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }
  },

  deleteRestaurant: async (id) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/delete/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete restaurant');
      return await response.json();
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  },

  // ✅ NEW: Create restaurant via /auth/register
  createRestaurant: async (data) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          type: 'restaurant'
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create restaurant');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  }
};

// Category options
const CATEGORY_OPTIONS = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burger' },
  { value: 'tacos', label: 'Tacos' },
  { value: 'sandwish', label: 'Sandwich' }
];

// Days of week for opening hours
const DAYS_OF_WEEK = [
  { value: 'mon', label: 'Lundi' },
  { value: 'tue', label: 'Mardi' },
  { value: 'wed', label: 'Mercredi' },
  { value: 'thu', label: 'Jeudi' },
  { value: 'fri', label: 'Vendredi' },
  { value: 'sat', label: 'Samedi' },
  { value: 'sun', label: 'Dimanche' }
];

export default function AdminRestaurantManagement() {
  const [activeTab, setActiveTab] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false); // ✅ NEW
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [notification, setNotification] = useState(null);
  const [filterAddress, setFilterAddress] = useState('');


  // ✅ NEW: Create form state
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    categories: [],
    description: '',
    address: '',
    lat: '',
    lng: '',
    rating: 0,
    image_url: '',
    is_active: true,
    is_premium: false,
    opening_hours: {
      mon: { open: 900, close: 1800 },
      tue: { open: 900, close: 1800 },
      wed: { open: 900, close: 1800 },
      thu: { open: 900, close: 1800 },
      fri: { open: 900, close: 1800 },
      sat: { open: 1000, close: 2300 },
      sun: { open: 1200, close: 2000 }
    }
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filterCategory, filterAddress]);

  useEffect(() => {
    applySearchFilter();
  }, [restaurants, searchQuery, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'all') {
        const apiFilters = {
          q: searchQuery.trim(),
           address: filterAddress.trim(),
          page: 1,
          pageSize: 100
        };
        
        if (filterCategory !== 'all') {
          apiFilters.categories = [filterCategory];
        }
        
        const result = await api.getRestaurants(apiFilters);
        setRestaurants(result.data);
      } else {
        const result = await api.getPendingRequests();
        setPendingRequests(result.data);
      }
    } catch (error) {
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    let filtered = [...restaurants];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'premium') {
        filtered = filtered.filter(r => r.is_premium === true);
      } else if (filterStatus === 'standard') {
        filtered = filtered.filter(r => r.is_premium === false);
      } else if (filterStatus === 'open') {
        filtered = filtered.filter(r => r.is_active === true);
      } else if (filterStatus === 'closed') {
        filtered = filtered.filter(r => r.is_active === false);
      } else {
        filtered = filtered.filter(r => r.status === filterStatus);
      }
    }

    setFilteredRestaurants(filtered);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // ✅ NEW: Handle create restaurant
  const handleCreateRestaurant = async () => {
    // Validation
    if (!createForm.email || !createForm.password || !createForm.name || 
        !createForm.address || !createForm.lat || !createForm.lng) {
      showNotification('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (createForm.categories.length === 0) {
      showNotification('Veuillez sélectionner au moins une catégorie', 'error');
      return;
    }

    try {
      await api.createRestaurant(createForm);
      showNotification('Restaurant créé avec succès');
      setShowCreateModal(false);
      
      // Reset form
      setCreateForm({
        email: '',
        password: '',
        name: '',
        categories: [],
        description: '',
        address: '',
        lat: '',
        lng: '',
        rating: 0,
        image_url: '',
        is_active: true,
        is_premium: false,
        opening_hours: {
          mon: { open: 900, close: 1800 },
          tue: { open: 900, close: 1800 },
          wed: { open: 900, close: 1800 },
          thu: { open: 900, close: 1800 },
          fri: { open: 900, close: 1800 },
          sat: { open: 1000, close: 2300 },
          sun: { open: 1200, close: 2000 }
        }
      });
      
      loadData();
    } catch (error) {
      showNotification(error.message || 'Erreur lors de la création', 'error');
    }
  };

  const handleApprove = async (id) => {
    if (confirm('Approuver ce restaurant ?')) {
      try {
        await api.approveRestaurant(id);
        showNotification('Restaurant approuvé avec succès');
        loadData();
      } catch (error) {
        showNotification('Erreur lors de l\'approbation', 'error');
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Raison du rejet :');
    if (reason) {
      try {
        await api.rejectRestaurant(id, reason);
        showNotification('Restaurant rejeté');
        loadData();
      } catch (error) {
        showNotification('Erreur lors du rejet', 'error');
      }
    }
  };

  const handleViewDetails = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
  };

  const handleEdit = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setEditForm({
      name: restaurant.name || '',
      address: restaurant.address || '',
      description: restaurant.description || '',
      is_active: restaurant.is_active ?? true,
      is_premium: restaurant.is_premium ?? false,
      categories: restaurant.categories || []
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRestaurant) return;

    try {
      await api.updateRestaurant(selectedRestaurant.id, editForm);
      showNotification('Restaurant mis à jour avec succès');
      setShowEditModal(false);
      loadData();
    } catch (error) {
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce restaurant ? Cette action est irréversible.')) {
      try {
        await api.deleteRestaurant(id);
        showNotification('Restaurant supprimé');
        loadData();
      } catch (error) {
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleToggleActive = async (restaurant) => {
    try {
      await api.updateRestaurant(restaurant.id, { 
        is_active: !restaurant.is_active 
      });
      loadData();
    } catch (error) {
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleTogglePremium = async (restaurant) => {
    try {
      await api.updateRestaurant(restaurant.id, { 
        is_premium: !restaurant.is_premium 
      });
      loadData();
    } catch (error) {
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterCategory('all');
      setFilterAddress('');  

  };

  const StatusBadge = ({ status }) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: 'En attente',
      approved: 'Approuvé',
      suspended: 'Suspendu'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const RestaurantCard = ({ restaurant }) => (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4">
      <div className="flex gap-4">
        <img
          src={restaurant.image_url || 'https://via.placeholder.com/80'}
          alt={restaurant.name}
          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-gray-600 ml-1">
                    {restaurant.rating ? parseFloat(restaurant.rating).toFixed(1) : '0.0'}
                  </span>
                </div>
                {restaurant.is_premium && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                    Premium
                  </span>
                )}
                <StatusBadge status={restaurant.status} />
              </div>
            </div>

            <div className="relative group">
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                <button
                  onClick={() => handleViewDetails(restaurant)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir détails
                </button>
                <button
                  onClick={() => handleEdit(restaurant)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(restaurant.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2">
            {restaurant.categories?.map((cat, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                {cat}
              </span>
            ))}
          </div>

          <div className="space-y-1 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{restaurant.address || 'Adresse non renseignée'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={restaurant.is_active}
                onChange={() => handleToggleActive(restaurant)}
                className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                {restaurant.is_active ? 'Actif' : 'Inactif'}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={restaurant.is_premium}
                onChange={() => handleTogglePremium(restaurant)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Premium</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const PendingRequestCard = ({ request }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{request.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {request.categories?.join(', ')}
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR') : ''}
        </span>
      </div>

      {request.image_url && (
        <img
          src={request.image_url}
          alt={request.name}
          className="w-full h-32 object-cover rounded-lg mb-3"
        />
      )}

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{request.address}</span>
        </div>
        {request.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleViewDetails(request)}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Détails
        </button>
        <button
          onClick={() => handleApprove(request.id)}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Accepter
        </button>
        <button
          onClick={() => handleReject(request.id)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Rejeter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
          notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Restaurants</h1>
            <div className="flex gap-3">
              {/* ✅ NEW: Create Restaurant Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouveau Restaurant
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tous les restaurants ({restaurants.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'requests'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Demandes en attente
              {pendingRequests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {activeTab === 'all' && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un restaurant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

        <div className="flex-1 min-w-64 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer par adresse..."
            value={filterAddress}
            onChange={(e) => setFilterAddress(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="open">Ouvert</option>
                <option value="closed">Fermé</option>
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
                <option value="approved">Approuvé</option>
                <option value="pending">En attente</option>
                <option value="suspended">Suspendu</option>
              </select>

              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-green-600"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        ) : activeTab === 'all' ? (
          <>
            <div className="mb-4 text-sm text-gray-600">
              {filteredRestaurants.length} restaurant(s) trouvé(s)
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
            {filteredRestaurants.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun restaurant trouvé</p>
              </div>
            )}
          </>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Demandes en attente
            </h2>
            <p className="text-gray-600 mb-6">
              Consultez et gérez les demandes d'inscription des nouveaux restaurants.
            </p>
            {pendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((request) => (
                  <PendingRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">Aucune demande en attente</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedRestaurant.name}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedRestaurant.image_url && (
                <img
                  src={selectedRestaurant.image_url}
                  alt={selectedRestaurant.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Statut</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedRestaurant.status} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Catégories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRestaurant.categories?.map((cat, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedRestaurant.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-gray-900 mt-1">{selectedRestaurant.description}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Adresse</label>
                  <p className="text-gray-900 mt-1">{selectedRestaurant.address || 'Non renseignée'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Note</label>
                    <div className="flex items-center mt-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-gray-900">
                        {selectedRestaurant.rating ? parseFloat(selectedRestaurant.rating).toFixed(1) : '0.0'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-900 mt-1">
                      {selectedRestaurant.is_premium ? 'Premium' : 'Standard'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">État</label>
                  <p className="text-gray-900 mt-1">
                    {selectedRestaurant.is_active ? 'Actif' : 'Inactif'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                {selectedRestaurant.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedRestaurant.id);
                        setShowDetailsModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accepter
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRestaurant.id);
                        setShowDetailsModal(false);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </button>
                  </>
                )}
                {selectedRestaurant.status !== 'pending' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedRestaurant);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold">Modifier le restaurant</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du restaurant *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nom du restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Description du restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Adresse complète"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories *
                  </label>
                  <div className="space-y-2">
                    {CATEGORY_OPTIONS.map(cat => (
                      <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.categories?.includes(cat.value)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...(editForm.categories || []), cat.value]
                              : (editForm.categories || []).filter(c => c !== cat.value);
                            setEditForm({...editForm, categories: newCategories});
                          }}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Restaurant actif</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editForm.is_premium}
                      onChange={(e) => setEditForm({...editForm, is_premium: e.target.checked})}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Compte Premium</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Create Restaurant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold">Créer un nouveau restaurant</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Account Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Informations du compte</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="restaurant@example.com"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Restaurant Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Informations du restaurant</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du restaurant * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom du restaurant"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Description du restaurant..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégories * <span className="text-red-500">●</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORY_OPTIONS.map(cat => (
                          <label key={cat.value} className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded hover:bg-white">
                            <input
                              type="checkbox"
                              checked={createForm.categories.includes(cat.value)}
                              onChange={(e) => {
                                const newCategories = e.target.checked
                                  ? [...createForm.categories, cat.value]
                                  : createForm.categories.filter(c => c !== cat.value);
                                setCreateForm({...createForm, categories: newCategories});
                              }}
                              className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">{cat.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL de l'image
                      </label>
                      <input
                        type="url"
                        value={createForm.image_url}
                        onChange={(e) => setCreateForm({...createForm, image_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Note (0-5)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={createForm.rating}
                        onChange={(e) => setCreateForm({...createForm, rating: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="4.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Localisation</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Adresse * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.address}
                        onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="123 Rue Example, Ville"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude * <span className="text-red-500">●</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.lat}
                          onChange={(e) => setCreateForm({...createForm, lat: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="36.7309715"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude * <span className="text-red-500">●</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.lng}
                          onChange={(e) => setCreateForm({...createForm, lng: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="3.1670642"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Options */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-white">
                      <input
                        type="checkbox"
                        checked={createForm.is_active}
                        onChange={(e) => setCreateForm({...createForm, is_active: e.target.checked})}
                        className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Restaurant actif</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-white">
                      <input
                        type="checkbox"
                        checked={createForm.is_premium}
                        onChange={(e) => setCreateForm({...createForm, is_premium: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Compte Premium</span>
                    </label>
                  </div>
                </div>

                {/* Opening Hours (Optional - Collapsed by default) */}
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="text-lg font-semibold cursor-pointer">
                    Horaires d'ouverture (optionnel)
                  </summary>
                  <div className="mt-4 space-y-3">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day.value} className="flex items-center gap-4">
                        <span className="w-24 text-sm font-medium text-gray-700">{day.label}</span>
                        <input
                          type="number"
                          min="0"
                          max="2359"
                          value={createForm.opening_hours[day.value]?.open || 900}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            opening_hours: {
                              ...createForm.opening_hours,
                              [day.value]: {
                                ...createForm.opening_hours[day.value],
                                open: parseInt(e.target.value) || 900
                              }
                            }
                          })}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="900"
                        />
                        <span className="text-sm text-gray-600">à</span>
                        <input
                          type="number"
                          min="0"
                          max="2359"
                          value={createForm.opening_hours[day.value]?.close || 1800}
                          onChange={(e) => setCreateForm({
                            ...createForm,
                            opening_hours: {
                              ...createForm.opening_hours,
                              [day.value]: {
                                ...createForm.opening_hours[day.value],
                                close: parseInt(e.target.value) || 1800
                              }
                            }
                          })}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="1800"
                        />
                        <span className="text-xs text-gray-500">(Format: HHMM, ex: 900 = 9h00)</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateRestaurant}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Créer le restaurant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}