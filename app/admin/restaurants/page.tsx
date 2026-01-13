'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api/auth';
import {
  Plus,
  Search,
  MapPin,
  Star,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  UtensilsCrossed
} from 'lucide-react';

// =========================
// TYPES
// =========================

type CategoryValue = string;

type StatusColor = 'yellow' | 'green' | 'red' | 'gray';

type RestaurantStatus = 'pending' | 'approved' | 'suspended' | 'archived' | string;

type ActiveTab = 'all' | 'requests';

type NotificationType = 'success' | 'error';

interface StatusOption {
  value: RestaurantStatus;
  label: string;
  color: StatusColor;
}

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

interface OpeningHour {
  open: number;
  close: number;
}

type OpeningHours = Record<DayKey, OpeningHour>;

interface Restaurant {
  id: string;
  name: string;
  email?: string;
  description?: string;
  address?: string;
    phone_number?: string;

  lat?: string;
  lng?: string;
  rating?: number | string;
  image_url?: string;
  is_active: boolean;
  is_premium: boolean;
  categories?: CategoryValue[];
  status?: RestaurantStatus;
  created_at?: string;
  opening_hours?: Partial<OpeningHours>;
}

interface OptionGroup {
  id: string;
  nom: string;
  description?: string | null;
  is_required: boolean;
  ordre_affichage?: number | null;
  additions?: Addition[];
  options?: Addition[];
}

interface Addition {
  id: string;
  nom: string;
  description?: string | null;
  prix: number;
  is_available?: boolean;
  option_group_id?: string | null;
}

interface MenuItem {
  id: string;
  nom: string;
  description?: string | null;
  prix: number;
  display_price?: number;
  photo_url?: string | null;
  temps_preparation?: number | null;
  is_available?: boolean;
  additions?: Addition[];
  option_groups?: OptionGroup[];
}

interface MenuCategory {
  id: string;
  nom: string;
  description?: string | null;
  items?: MenuItem[];
  items_count?: number;
}

interface RestaurantMenuDetails {
  restaurant_id: string;
  restaurant?: Restaurant;
  categories?: MenuCategory[];
}

interface RestaurantFilters {
  categories?: CategoryValue[];
  address?: string;
  status?: RestaurantStatus;
  is_active?: string;
  is_premium?: string;
  page?: number;
  pageSize?: number;
  q?: string;
  home_categories?: string[];
}

interface GlobalHomeCategory {
  id: string;
  name: string;
  slug: string;
}

interface NotificationState {
  message: string;
  type: NotificationType;
}

interface CreateRestaurantForm {
  email: string;
  password: string;
  name: string;
  categories: CategoryValue[];
  description: string;
  address: string;
  phone_number : string;
  lat: string;
  lng: string;
  rating: number;
  image_url: string;
  is_active: boolean;
  is_premium: boolean;
  opening_hours: OpeningHours;
}

interface EditRestaurantForm {
  name: string;
  address: string;
  phone_number: string;
  description: string;
  is_active: boolean;
  is_premium: boolean;
  categories: CategoryValue[];
  email?: string;
  lat?: string;
  lng?: string;
  rating?: number;
  image_url?: string;
  opening_hours?: Partial<OpeningHours>;
  status?: RestaurantStatus;
}

// =========================
// API configuration
// =========================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Get token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token') || '';
  }
  return '';
};

// API functions
const api = {
  getRestaurants: async (
    filters: RestaurantFilters = {}
  ): Promise<{ data: Restaurant[]; count: number; totalPages: number; page: number }> => {
    try {
      const token = getAuthToken();

      const requestBody: RestaurantFilters = {
        categories: filters.categories || undefined,
        address: filters.address || undefined,
        status: filters.status || undefined,
        is_active: filters.is_active || undefined,
        is_premium: filters.is_premium || undefined,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        q: filters.q || undefined,
        home_categories: filters.home_categories || undefined
      };

      const response = await fetch(`${API_BASE_URL}/restaurant/filter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Restaurant filter error response:', errorText);
        throw new Error(`Failed to fetch restaurants: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        data: (result.data || []) as Restaurant[],
        count: result.count || 0,
        totalPages: result.totalPages || 1,
        page: result.page || 1
      };
    } catch (error: unknown) {
      console.error('Error fetching restaurants:', error);
      if (error instanceof Error) {
        if (error.message) console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack:', error.stack);
      }
      return { data: [], count: 0, totalPages: 1, page: 1 };
    }
  },

  getPendingRequests: async (): Promise<{ data: Restaurant[]; count: number }> => {
    try {
      const token = getAuthToken();

      const requestBody: RestaurantFilters = {
        page: 1,
        pageSize: 100,
        status: 'pending'
      };

      const response = await fetch(`${API_BASE_URL}/restaurant/filter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pending requests error response:', errorText);
        throw new Error(`Failed to fetch pending requests: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const pendingRestaurants: Restaurant[] = result.data || [];

      return {
        data: pendingRestaurants,
        count: pendingRestaurants.length
      };
    } catch (error: unknown) {
      console.error('Error fetching pending requests:', error);
      if (error instanceof Error && error.message) {
        console.error('Error message:', error.message);
      }
      return { data: [], count: 0 };
    }
  },

  approveRestaurant: async (id: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
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

  rejectRestaurant: async (id: string, reason: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
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

  updateRestaurant: async (id: string, data: Partial<Restaurant>) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/update/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
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

  deleteRestaurant: async (id: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/restaurant/delete/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
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

  createRestaurant: async (data: CreateRestaurantForm) => {
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
    } catch (error: unknown) {
      console.error('Error creating restaurant:', error);
      throw error;
    }
  }
};

// Category options
const CATEGORY_OPTIONS: { value: CategoryValue; label: string }[] = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burger' },
  { value: 'tacos', label: 'Tacos' },
  { value: 'sandwish', label: 'Sandwich' }
];

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'pending', label: 'En attente', color: 'yellow' },
  { value: 'approved', label: 'Approuvé', color: 'green' },
  { value: 'suspended', label: 'Suspendu', color: 'red' },
  { value: 'archived', label: 'Archivé', color: 'gray' }
];

const DAYS_OF_WEEK: { value: DayKey; label: string }[] = [
  { value: 'mon', label: 'Lundi' },
  { value: 'tue', label: 'Mardi' },
  { value: 'wed', label: 'Mercredi' },
  { value: 'thu', label: 'Jeudi' },
  { value: 'fri', label: 'Vendredi' },
  { value: 'sat', label: 'Samedi' },
  { value: 'sun', label: 'Dimanche' }
];

const formatDA = (value?: number | string | null) => {
  const parsed =
    typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 'N/A';
  return `${new Intl.NumberFormat('fr-FR').format(parsed)} DA`;
};

const resolveGroupOptions = (item: MenuItem, group: OptionGroup) => {
  const direct = (group.additions && group.additions.length ? group.additions : group.options) || [];
  const itemAdditions = item.additions || [];
  if (itemAdditions.length === 0) {
    return direct;
  }
  if (direct.length === 0) {
    return itemAdditions.filter((addition) => addition.option_group_id === group.id);
  }
  const merged = [...direct];
  const ids = new Set(direct.map((option) => option.id));
  itemAdditions.forEach((addition) => {
    if (addition.option_group_id === group.id && !ids.has(addition.id)) {
      merged.push(addition);
      ids.add(addition.id);
    }
  });
  return merged;
};

export default function AdminRestaurantManagement() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Restaurant[]>([]);
  const [filteredPendingRequests, setFilteredPendingRequests] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingRestaurants, setUpdatingRestaurants] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string>('');

  const [filterStatus, setFilterStatus] = useState<RestaurantStatus | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPremium, setFilterPremium] = useState<'all' | 'premium' | 'standard'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | CategoryValue>('all');
  const [filterAddress, setFilterAddress] = useState<string>('');
  const [globalCategories, setGlobalCategories] = useState<GlobalHomeCategory[]>([]);
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(100);

  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [detailsMenu, setDetailsMenu] = useState<RestaurantMenuDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditRestaurantForm>({
    name: '',
    address: '',
    description: '',
    is_active: true,
    is_premium: false,
    phone_number: '',
    categories: [],
    email: '',
    lat: '',
    lng: '',
    rating: 0,
    image_url: '',
    opening_hours: {},
    status: undefined
  });
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const [createForm, setCreateForm] = useState<CreateRestaurantForm>({
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
    phone_number: '',
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

  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState<boolean>(false);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // Validation states
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  const patchRestaurantInState = (id: string, patch: Partial<Restaurant>) => {
    setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setFilteredRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const setRestaurantUpdating = (id: string, isUpdating: boolean) => {
    setUpdatingRestaurants((prev) => {
      if (isUpdating) return { ...prev, [id]: true };
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterAddress, filterStatus, filterActive, filterPremium, globalCategoryFilter]);

  // Load data when page or filters change
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, activeTab, filterCategory, filterAddress, filterStatus, filterActive, filterPremium, globalCategoryFilter, debouncedSearchQuery]);

  // Debounce search query (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Apply search filter
  useEffect(() => {
    applySearchFilter();
  }, [restaurants, debouncedSearchQuery]);

  // Apply search filter for pending requests
  useEffect(() => {
    applyPendingSearchFilter();
  }, [pendingRequests, pendingSearchQuery]);

  useEffect(() => {
    let isMounted = true;
    const fetchGlobalCategories = async () => {
      try {
        const response = await apiClient.get('/admin/homepage/categories');
        if (isMounted) {
          setGlobalCategories(response.data?.data || []);
        }
      } catch (err) {
        console.warn('Unable to load global categories', err);
      }
    };
    fetchGlobalCategories();
    return () => {
      isMounted = false;
    };
  }, []);


  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'all') {
        const apiFilters: RestaurantFilters = {
          q: debouncedSearchQuery.trim() || undefined,
          address: filterAddress.trim() || undefined,
          page: currentPage,
          pageSize: pageSize
        };

        const categoryFilters = [
          filterCategory !== 'all' ? filterCategory : null,
          globalCategoryFilter !== 'all' ? globalCategoryFilter : null
        ].filter((value): value is string => Boolean(value));
        if (categoryFilters.length > 0) {
          apiFilters.categories = [...new Set(categoryFilters)];
        }
        // Include pending restaurants in "all" tab by default
        if (filterStatus !== 'all') apiFilters.status = filterStatus;
        // If status is 'all', don't filter by status (include all including pending)
        if (filterActive === 'active') apiFilters.is_active = 'true';
        else if (filterActive === 'inactive') apiFilters.is_active = 'false';
        if (filterPremium === 'premium') apiFilters.is_premium = 'true';
        else if (filterPremium === 'standard') apiFilters.is_premium = 'false';

        const result = await api.getRestaurants(apiFilters);

        // Also load pending requests to include them in "all restaurants"
        let allRestaurants = [...result.data];
        if (filterStatus === 'all' || !filterStatus) {
          try {
            const pendingResult = await api.getPendingRequests();
            // Merge pending restaurants that are not already in the list
            const existingIds = new Set(result.data.map(r => r.id));
            const newPending = pendingResult.data.filter(r => !existingIds.has(r.id));
            allRestaurants = [...result.data, ...newPending];
          } catch (pendingError) {
            // If pending requests fail, just use regular restaurants
            console.warn('Could not load pending requests:', pendingError);
          }
        }

        setRestaurants(allRestaurants);
        const calculatedTotalPages = result.totalPages || (result.count > 0 
          ? Math.ceil(result.count / pageSize) 
          : 1);

setTotalPages(calculatedTotalPages);
        setTotalCount(result.count);
      } else {
        const result = await api.getPendingRequests();
        setPendingRequests(result.data);
        setFilteredPendingRequests(result.data);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      showNotification('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    let filtered = [...restaurants];
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.name?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.phone_number?.toLowerCase().includes(query)
      );
    }
    setFilteredRestaurants(filtered);
  };

  const applyPendingSearchFilter = () => {
    let filtered = [...pendingRequests];
    if (pendingSearchQuery.trim()) {
      const query = pendingSearchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        r.name?.toLowerCase().includes(query) ||
        r.address?.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.phone_number?.toLowerCase().includes(query) ||
        r.categories?.some(cat => cat.toLowerCase().includes(query))
      );
    }
    setFilteredPendingRequests(filtered);
  };

  const showNotification = (message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Validation functions
  const validateEmail = (email: string | undefined): string => {
    if (!email || !email.trim()) return 'L\'email est obligatoire';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Format d\'email invalide';
    return '';
  };

  const validatePassword = (password: string | undefined): string => {
    if (!password) return 'Le mot de passe est obligatoire';
    if (password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    return '';
  };

  const validateName = (name: string | undefined): string => {
    if (!name || !name.trim()) return 'Le nom est obligatoire';
    if (name.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères';
    return '';
  };

  const validateAddress = (address: string | undefined): string => {
    if (!address || !address.trim()) return 'L\'adresse est obligatoire';
    if (address.trim().length < 5) return 'L\'adresse doit contenir au moins 5 caractères';
    return '';
  };

  const validatePhone = (phone: string | undefined): string => {
    if (!phone || !phone.trim()) return 'Le téléphone est obligatoire';
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    if (!phoneRegex.test(phone.trim())) return 'Format de téléphone invalide';
    return '';
  };

  const validateCoordinate = (coord: string | undefined, type: 'latitude' | 'longitude'): string => {
    if (!coord || !coord.trim()) return `${type === 'latitude' ? 'La latitude' : 'La longitude'} est obligatoire`;
    const num = parseFloat(coord);
    if (isNaN(num)) return `${type === 'latitude' ? 'La latitude' : 'La longitude'} doit être un nombre`;
    if (type === 'latitude' && (num < -90 || num > 90)) return 'La latitude doit être entre -90 et 90';
    if (type === 'longitude' && (num < -180 || num > 180)) return 'La longitude doit être entre -180 et 180';
    return '';
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};

    errors.email = validateEmail(createForm.email);
    errors.password = validatePassword(createForm.password);
    errors.name = validateName(createForm.name);
    errors.address = validateAddress(createForm.address);
    errors.phone_number = validatePhone(createForm.phone_number);
    errors.lat = validateCoordinate(createForm.lat, 'latitude');
    errors.lng = validateCoordinate(createForm.lng, 'longitude');

    if (createForm.categories.length === 0) {
      errors.categories = 'Veuillez sélectionner au moins une catégorie';
    }

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (typeof editForm.email === 'string' && editForm.email.trim()) {
      errors.email = validateEmail(editForm.email);
    }
    if (typeof editForm.name === 'string' && editForm.name.trim()) {
      errors.name = validateName(editForm.name);
    }
    if (typeof editForm.address === 'string' && editForm.address.trim()) {
      errors.address = validateAddress(editForm.address);
    }
    if (typeof editForm.phone_number === 'string' && editForm.phone_number.trim()) {
      errors.phone_number = validatePhone(editForm.phone_number);
    }
    if (typeof editForm.lat === 'string' && editForm.lat.trim()) {
      errors.lat = validateCoordinate(editForm.lat, 'latitude');
    }
    if (typeof editForm.lng === 'string' && editForm.lng.trim()) {
      errors.lng = validateCoordinate(editForm.lng, 'longitude');
    }

    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key];
    });

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper functions to handle form changes with error clearing
  const handleCreateFormChange = <K extends keyof CreateRestaurantForm,>(
    field: K,
    value: CreateRestaurantForm[K]
  ) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (createFormErrors[field]) {
      setCreateFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCategoryToggle = (value: CategoryValue, checked: boolean) => {
    setCreateForm(prev => {
      const exists = prev.categories.includes(value);
      let newCategories = prev.categories;
      if (checked && !exists) {
        newCategories = [...prev.categories, value];
      } else if (!checked && exists) {
        newCategories = prev.categories.filter((cat) => cat !== value);
      }
      return { ...prev, categories: newCategories };
    });

    if (checked && createFormErrors.categories) {
      setCreateFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.categories;
        return newErrors;
      });
    }
  };

  const handleEditFormChange = <K extends keyof EditRestaurantForm,>(
    field: K,
    value: EditRestaurantForm[K]
  ) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (editFormErrors[field]) {
      setEditFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      setCurrentPage(newPage);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Veuillez sélectionner une image valide', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification("L'image ne doit pas dépasser 5 MB", 'error');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Échec de l'upload de l'image");
      }

      const data = await response.json();

      setCreateForm((prev) => ({ ...prev, image_url: data.url }));
      setImagePreview(URL.createObjectURL(file));
      showNotification('Image uploadée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification("Erreur lors de l'upload de l'image", 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setCreateForm((prev) => ({ ...prev, image_url: '' }));
    setImagePreview(null);
  };

  const handleEditImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Veuillez sélectionner une image valide', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification("L'image ne doit pas dépasser 5 MB", 'error');
      return;
    }

    setEditUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Échec de l'upload de l'image");
      }

      const data = await response.json();

      setEditForm((prev) => ({ ...prev, image_url: data.url }));
      setEditImagePreview(URL.createObjectURL(file));
      showNotification('Image uploadée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      showNotification("Erreur lors de l'upload de l'image", 'error');
    } finally {
      setEditUploadingImage(false);
    }
  };

  const removeEditImage = () => {
    setEditForm((prev) => ({ ...prev, image_url: '' }));
    setEditImagePreview(null);
  };

  const handleCreateRestaurant = async () => {
    if (!validateCreateForm()) {
      showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    try {
      await api.createRestaurant(createForm);
      showNotification('Restaurant créé avec succès');
      setShowCreateModal(false);

      setCreateForm({
        email: '',
        password: '',
        name: '',
        categories: [],
        description: '',
        phone_number: '',
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

      setImagePreview(null);
      setCurrentPage(1);
      loadData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      showNotification(message || 'Erreur lors de la création', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    if (confirm('Approuver ce restaurant ?')) {
      try {
        await api.approveRestaurant(id);
        showNotification('Restaurant approuvé avec succès');
        loadData();
      } catch {
        showNotification("Erreur lors de l'approbation", 'error');
      }
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Raison du rejet :');
    if (reason) {
      try {
        await api.rejectRestaurant(id, reason);
        showNotification('Restaurant rejeté');
        loadData();
      } catch {
        showNotification('Erreur lors du rejet', 'error');
      }
    }
  };

  const handleViewDetails = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setDetailsError(null);
    setDetailsMenu(null);
    try {
      const response = await apiClient.get(`/restaurant/admin/details/${restaurant.id}`);
      setDetailsMenu(response.data?.data || null);
    } catch (err) {
      console.error('Error fetching restaurant menu details:', err);
      setDetailsError("Impossible de charger le menu du restaurant.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setEditForm({
      name: restaurant.name || '',
      address: restaurant.address || '',
      phone_number: restaurant.phone_number || '',
      description: restaurant.description || '',
      is_active: restaurant.is_active ?? true,
      is_premium: restaurant.is_premium ?? false,
      categories: restaurant.categories || [],
      email: restaurant.email || '',
      lat: restaurant.lat || '',
      lng: restaurant.lng || '',
      rating:
        typeof restaurant.rating === 'number'
          ? restaurant.rating
          : restaurant.rating
          ? parseFloat(String(restaurant.rating))
          : 0,
      image_url: restaurant.image_url || '',
      opening_hours: restaurant.opening_hours || {},
      status: restaurant.status
    });
    setEditImagePreview(restaurant.image_url || null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRestaurant) return;

    if (!validateEditForm()) {
      showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
      return;
    }

    try {
      await api.updateRestaurant(selectedRestaurant.id, editForm);
      showNotification('Restaurant mis à jour avec succès');
      setShowEditModal(false);
      loadData();
    } catch {
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce restaurant ? Cette action est irréversible.')) {
      try {
        await api.deleteRestaurant(id);
        showNotification('Restaurant supprimé');

        if (filteredRestaurants.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else {
          loadData();
        }
      } catch {
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  const handleToggleActive = async (restaurant: Restaurant) => {
    if (updatingRestaurants[restaurant.id]) return;
    const nextIsActive = !restaurant.is_active;
    patchRestaurantInState(restaurant.id, { is_active: nextIsActive });
    setRestaurantUpdating(restaurant.id, true);
    try {
      await api.updateRestaurant(restaurant.id, { is_active: nextIsActive });
    } catch {
      patchRestaurantInState(restaurant.id, { is_active: restaurant.is_active });
      showNotification('Erreur lors de la mise à jour', 'error');
    } finally {
      setRestaurantUpdating(restaurant.id, false);
    }
  };

  const handleTogglePremium = async (restaurant: Restaurant) => {
    if (updatingRestaurants[restaurant.id]) return;
    const nextIsPremium = !restaurant.is_premium;
    patchRestaurantInState(restaurant.id, { is_premium: nextIsPremium });
    setRestaurantUpdating(restaurant.id, true);
    try {
      await api.updateRestaurant(restaurant.id, { is_premium: nextIsPremium });
    } catch {
      patchRestaurantInState(restaurant.id, { is_premium: restaurant.is_premium });
      showNotification('Erreur lors de la mise à jour', 'error');
    } finally {
      setRestaurantUpdating(restaurant.id, false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterActive('all');
    setFilterPremium('all');
    setFilterCategory('all');
    setGlobalCategoryFilter('all');
    setFilterAddress('');
    setCurrentPage(1);
  };

  const StatusBadge: React.FC<{ status?: RestaurantStatus }> = ({ status }) => {
    const statusConfig =
      STATUS_OPTIONS.find((s) => s.value === status) || ({
        color: 'gray',
        label: status || 'Inconnu'
      } as StatusOption);

    const colorClasses: Record<StatusColor, string> = {
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colorClasses[statusConfig.color]
        }`}
      >
        {statusConfig.label}
      </span>
    );
  };

  const Pagination: React.FC = () => {
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

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border border-gray-200 rounded-lg mt-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="text-sm text-gray-700">
            Affichage de{' '}
            <span className="font-medium">
              {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            à{' '}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, totalCount)}
            </span>{' '}
            sur <span className="font-medium">{totalCount}</span> résultats
          </div>

          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value={5}>5 par page</option>
            <option value={10}>10 par page</option>
            <option value={20}>20 par page</option>
            <option value={50}>50 par page</option>
            <option value={100}>100 par page</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
          </button>

          {pageNumbers[0] > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
              key={page}
              onClick={() => handlePageChange(page)}
              disabled={loading}
              className={`px-3 py-2 border rounded-lg transition-colors ${
                currentPage === page
                  ? 'bg-green-600 text-white border-green-600 font-medium'
                  : 'border-gray-300 hover:bg-gray-50'
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
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Composant pour afficher une image avec placeholder en cas d'erreur
  const ImageWithPlaceholder: React.FC<{
    src: string;
    alt: string;
    className?: string;
    placeholderClassName?: string;
    iconSize?: string;
  }> = ({ src, alt, className = '', placeholderClassName = '', iconSize = 'w-10 h-10' }) => {
    const [imageError, setImageError] = React.useState(false);

    if (imageError) {
      return (
        <div className={`${placeholderClassName} rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
          <UtensilsCrossed className={`${iconSize} text-gray-400 dark:text-gray-500`} />
        </div>
      );
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setImageError(true)}
      />
    );
  };

  const RestaurantListItem: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Image */}
        <div className="relative flex-shrink-0">
          {restaurant.image_url ? (
            <ImageWithPlaceholder
              src={restaurant.image_url}
              alt={restaurant.name}
              className="w-20 h-20 rounded-lg object-cover"
              placeholderClassName="w-20 h-20"
              iconSize="w-10 h-10"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <UtensilsCrossed className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
          )}
          {restaurant.is_premium && (
            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-white" />
            </div>
          )}
        </div>

        {/* Info principale */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 truncate text-lg">
                  {restaurant.name}
                </h3>
                <StatusBadge status={restaurant.status} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">
                    {restaurant.rating
                      ? parseFloat(String(restaurant.rating)).toFixed(1)
                      : '0.0'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate max-w-xs">
                    {restaurant.address || 'Adresse non renseignée'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>
                    {restaurant.phone_number || 'N/A'}
                  </span>
                </div>
              </div>
              {restaurant.categories && restaurant.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {restaurant.categories.map((cat, idx) => (
                    <span
                      key={`${cat}-${idx}`}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles et actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-1.5 rounded-lg">
                    <CheckCircle className={`w-4 h-4 ${restaurant.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restaurant.is_active}
                      disabled={Boolean(updatingRestaurants[restaurant.id])}
                      onChange={() => handleToggleActive(restaurant)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                      restaurant.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 mt-0.5 ${
                        restaurant.is_active ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-yellow-100 p-1.5 rounded-lg">
                    <Star className={`w-4 h-4 ${restaurant.is_premium ? 'text-yellow-600 fill-yellow-600' : 'text-gray-400'}`} />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restaurant.is_premium}
                      disabled={Boolean(updatingRestaurants[restaurant.id])}
                      onChange={() => handleTogglePremium(restaurant)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                      restaurant.is_premium ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 mt-0.5 ${
                        restaurant.is_premium ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </label>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => router.push(`/admin/restaurants/${restaurant.id}`)}
                  className="text-emerald-600 hover:text-emerald-900 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  title="Voir le menu"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleViewDetails(restaurant)}
                  className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Voir les détails"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(restaurant)}
                  className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(restaurant.id)}
                  className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PendingRequestCard: React.FC<{ request: Restaurant }> = ({ request }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{request.name}</h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {request.categories?.join(', ')}
          </p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
          {request.created_at
            ? new Date(request.created_at).toLocaleDateString('fr-FR')
            : ''}
        </span>
      </div>

      {request.image_url ? (
        <ImageWithPlaceholder
          src={request.image_url}
          alt={request.name}
          className="w-full h-32 sm:h-40 object-cover rounded-lg mb-3"
          placeholderClassName="w-full h-32 sm:h-40 mb-3"
          iconSize="w-16 h-16"
        />
      ) : (
        <div className="w-full h-32 sm:h-40 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
          <UtensilsCrossed className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        </div>
      )}

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
          <span className="break-words">{request.address || 'Adresse non renseignée'}</span>
        </div>
        {request.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {request.description}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => handleViewDetails(request)}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm"
        >
          <Eye className="w-4 h-4" />
          <span className="whitespace-nowrap">Détails</span>
        </button>
        <button
          onClick={() => handleApprove(request.id)}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="whitespace-nowrap">Accepter</span>
        </button>
        <button
          onClick={() => handleReject(request.id)}
          className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 text-sm"
        >
          <XCircle className="w-4 h-4" />
          <span className="whitespace-nowrap">Rejeter</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            notification.type === 'error' ? 'bg-red-500 dark:bg-red-600' : 'bg-green-500 dark:bg-green-600'
          } text-white`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Gestion des Restaurants
            </h1>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouveau Restaurant
              </button>
              <button
                onClick={loadData}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="flex gap-4 border-b overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
                activeTab === 'all'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tous les restaurants ({totalCount})
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

      {/* Filters Section */}
      {activeTab === 'all' && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un restaurant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Address Filter */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrer par adresse..."
                  value={filterAddress}
                  onChange={(e) => setFilterAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(
                    e.target.value === 'all'
                      ? 'all'
                      : (e.target.value as CategoryValue)
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Global Category Filter */}
              <div className="flex flex-col">
              
                <select
                  value={globalCategoryFilter}
                  onChange={(e) => setGlobalCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Toutes les catégories globales</option>
                  {globalCategories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value === 'all'
                      ? 'all'
                      : (e.target.value as RestaurantStatus)
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tous les statuts</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              {/* Active State Filter */}
              <select
                value={filterActive}
                onChange={(e) =>
                  setFilterActive(
                    e.target.value as 'all' | 'active' | 'inactive'
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tous les états</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>

              {/* Premium Filter */}
              <select
                value={filterPremium}
                onChange={(e) =>
                  setFilterPremium(
                    e.target.value as 'all' | 'premium' | 'standard'
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Tous les types</option>
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="mt-4">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Réinitialiser tous les filtres
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
            <div className="space-y-3">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantListItem key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
            {filteredRestaurants.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucun restaurant trouvé</p>
              </div>
            )}
            <Pagination />
          </>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Demandes en attente
            </h2>
            <p className="text-gray-600 mb-4">
              Consultez et gérez les demandes d&apos;inscription des nouveaux
              restaurants.
            </p>
            
            {/* Search bar for pending requests */}
            <div className="mb-6">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, adresse, email, téléphone..."
                  value={pendingSearchQuery}
                  onChange={(e) => setPendingSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {filteredPendingRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPendingRequests.map((request) => (
                  <PendingRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">
                  {pendingSearchQuery.trim() ? 'Aucune demande trouvée pour cette recherche' : 'Aucune demande en attente'}
                </p>
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

              {selectedRestaurant.image_url ? (
                <ImageWithPlaceholder
                  src={selectedRestaurant.image_url}
                  alt={selectedRestaurant.name}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                  placeholderClassName="w-full h-48 mb-4"
                  iconSize="w-20 h-20"
                />
              ) : (
                <div className="w-full h-48 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <UtensilsCrossed className="w-20 h-20 text-gray-400 dark:text-gray-500" />
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Statut
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={selectedRestaurant.status} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Catégories globales
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedRestaurant.categories?.map((cat, idx) => (
                      <span
                        key={`${cat}-${idx}`}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                      >
                        {globalCategories.find((entry) => entry.slug === cat)?.name ||
                          CATEGORY_OPTIONS.find((entry) => entry.value === cat)?.label ||
                          cat}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedRestaurant.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <p className="text-gray-900 mt-1">
                      {selectedRestaurant.description}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Adresse
                  </label>
                  <p className="text-gray-900 mt-1">
                    {selectedRestaurant.address || 'Non renseignée'}
                  </p>
                </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Numéro de téléphone
                </label>
                <p className="text-gray-900 mt-1">
                  {selectedRestaurant.phone_number || 'Non renseigné'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="text-gray-900 mt-1">
                  {selectedRestaurant.email || 'Non renseigné'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Latitude
                  </label>
                  <p className="text-gray-900 mt-1">
                    {selectedRestaurant.lat || 'Non renseignée'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Longitude
                  </label>
                  <p className="text-gray-900 mt-1">
                    {selectedRestaurant.lng || 'Non renseignée'}
                  </p>
                </div>
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Note
                    </label>
                    <div className="flex items-center mt-1">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="ml-1 text-gray-900">
                        {selectedRestaurant.rating
                          ? parseFloat(
                              String(selectedRestaurant.rating)
                            ).toFixed(1)
                          : '0.0'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <p className="text-gray-900 mt-1">
                      {selectedRestaurant.is_premium ? 'Premium' : 'Standard'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    État
                  </label>
                  <p className="text-gray-900 mt-1">
                    {selectedRestaurant.is_active ? 'Actif' : 'Inactif'}
                  </p>
                </div>

                {selectedRestaurant.opening_hours && Object.keys(selectedRestaurant.opening_hours).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Horaires d&apos;ouverture
                    </label>
                    <div className="mt-2 space-y-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const hours = selectedRestaurant.opening_hours?.[day.value];
                        if (!hours) return null;
                        const formatTime = (time: number) => {
                          const hours = Math.floor(time / 100);
                          const minutes = time % 100;
                          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                        };
                        return (
                          <div key={day.value} className="flex items-center gap-2 text-sm">
                            <span className="w-24 font-medium text-gray-700">{day.label}:</span>
                            <span className="text-gray-900">
                              {formatTime(hours.open)} - {formatTime(hours.close)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Menu et options
                  </label>
                  {detailsLoading ? (
                    <p className="mt-2 text-sm text-gray-500">Chargement du menu...</p>
                  ) : detailsError ? (
                    <p className="mt-2 text-sm text-red-600">{detailsError}</p>
                  ) : detailsMenu?.categories && detailsMenu.categories.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {detailsMenu.categories.map((category) => (
                        <details
                          key={category.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                        >
                          <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                            {category.nom} ({category.items?.length ?? 0})
                          </summary>
                          <div className="mt-3 space-y-3">
                            {category.items && category.items.length > 0 ? (
                              category.items.map((item) => {
                                const ungroupedAdditions = (item.additions || []).filter(
                                  (addition) => !addition.option_group_id
                                );
                                return (
                                  <div
                                    key={item.id}
                                    className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="font-semibold text-gray-900">
                                          {item.nom}
                                        </div>
                                        {item.description ? (
                                          <div className="mt-1 text-xs text-gray-500">
                                            {item.description}
                                          </div>
                                        ) : null}
                                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
                                          <span>
                                            Prix: {formatDA(item.display_price ?? item.prix)}
                                          </span>
                                          {item.temps_preparation != null ? (
                                            <span>Preparation: {item.temps_preparation} min</span>
                                          ) : null}
                                        </div>
                                      </div>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          item.is_available
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}
                                      >
                                        {item.is_available ? 'Disponible' : 'Indisponible'}
                                      </span>
                                    </div>

                                    <div className="mt-3">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Groupes d&apos;options ({item.option_groups?.length ?? 0})
                                      </div>
                                      {item.option_groups && item.option_groups.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                          {item.option_groups.map((group) => {
                                            const groupOptions = resolveGroupOptions(item, group);
                                            return (
                                              <div
                                                key={group.id}
                                                className="rounded-lg border border-dashed border-gray-200 bg-white/60 p-2 text-xs"
                                              >
                                                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                                                  <span>{group.nom}</span>
                                                  <span
                                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                      group.is_required
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}
                                                  >
                                                    {group.is_required ? 'Obligatoire' : 'Optionnel'}
                                                  </span>
                                                  <span className="text-xs text-gray-500">
                                                    {groupOptions.length} option(s)
                                                  </span>
                                                </div>
                                                {group.description ? (
                                                  <div className="mt-1 text-xs text-gray-500">
                                                    {group.description}
                                                  </div>
                                                ) : null}
                                                {groupOptions.length > 0 ? (
                                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                                    {groupOptions.map((option) => (
                                                      <span
                                                        key={option.id}
                                                        className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5"
                                                      >
                                                        {option.nom} ({formatDA(option.prix)})
                                                      </span>
                                                    ))}
                                                  </div>
                                                ) : (
                                                  <div className="mt-2 text-xs italic text-gray-500">
                                                    Aucune option dans ce groupe.
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs italic text-gray-500">
                                          Aucun groupe pour ce plat.
                                        </div>
                                      )}
                                    </div>

                                    {ungroupedAdditions.length > 0 ? (
                                      <div className="mt-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                          Additions sans groupe ({ungroupedAdditions.length})
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                                          {ungroupedAdditions.map((addition) => (
                                            <span
                                              key={addition.id}
                                              className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5"
                                            >
                                              {addition.nom} ({formatDA(addition.prix)})
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-xs italic text-gray-500">
                                Aucun plat dans cette categorie.
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Aucun menu disponible.</p>
                  )}
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
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nom du restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => {
                      setEditForm({ ...editForm, email: e.target.value });
                      if (editFormErrors.email) {
                        setEditFormErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      editFormErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="restaurant@example.com"
                  />
                  {editFormErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{editFormErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Description du restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image du restaurant
                  </label>
                  <div className="space-y-4">
                    {(editImagePreview || editForm.image_url) && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                        <img
                          src={editImagePreview || editForm.image_url || ''}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeEditImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <label className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                          {editUploadingImage ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-green-600"></div>
                              <span className="text-sm text-gray-600">
                                Upload en cours...
                              </span>
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-5 h-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">
                                Télécharger une image
                              </span>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          className="hidden"
                          disabled={editUploadingImage}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt("Entrez l'URL de l'image:");
                          if (url) {
                            setEditForm({ ...editForm, image_url: url });
                            setEditImagePreview(null);
                          }
                        }}
                        className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        title="Entrer une URL manuellement"
                      >
                        <svg
                          className="w-5 h-5 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      </button>
                    </div>

                    <p className="text-xs text-gray-500">
                      Formats acceptés: JPG, PNG, GIF. Taille max: 5 MB
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Adresse complète"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone_number || ''}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone_number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="+213 555 123 456"
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
                    value={editForm.rating ?? 0}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        rating: parseFloat(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="4.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={editForm.lat || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lat: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="36.7309715"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={editForm.lng || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lng: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="3.1670642"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories globales *
                  </label>
                  <div className="space-y-2">
                    {(globalCategories.length > 0
                      ? globalCategories.map((cat) => ({ value: cat.slug, label: cat.name }))
                      : CATEGORY_OPTIONS
                    ).map((cat) => (
                      <label
                        key={cat.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.categories.includes(cat.value)}
                          onChange={(e) => {
                            const newCategories = e.target.checked
                              ? [...editForm.categories, cat.value]
                              : editForm.categories.filter(
                                  (c) => c !== cat.value
                                );
                            setEditForm({
                              ...editForm,
                              categories: newCategories
                            });
                          }}
                          className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">
                          {cat.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          is_active: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Restaurant actif
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editForm.is_premium}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          is_premium: e.target.checked
                        })
                      }
                      className="w-4 h-4 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Compte Premium
                    </span>
                  </label>

                  <details className="col-span-2 bg-gray-50 p-3 rounded-lg">
                    <summary className="text-sm font-semibold cursor-pointer">
                      Horaires d&apos;ouverture (optionnel)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={day.value}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="w-24 font-medium text-gray-700">
                            {day.label}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="2359"
                            value={
                              editForm.opening_hours?.[day.value]?.open ?? 900
                            }
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                opening_hours: {
                                  ...(editForm.opening_hours || {}),
                                  [day.value]: {
                                    ...(editForm.opening_hours?.[day.value] ||
                                      {}),
                                    open: parseInt(e.target.value) || 900
                                  }
                                }
                              })
                            }
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="900"
                          />
                          <span className="text-gray-600">à</span>
                          <input
                            type="number"
                            min="0"
                            max="2359"
                            value={
                              editForm.opening_hours?.[day.value]?.close ?? 1800
                            }
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                opening_hours: {
                                  ...(editForm.opening_hours || {}),
                                  [day.value]: {
                                    ...(editForm.opening_hours?.[day.value] ||
                                      {}),
                                    close: parseInt(e.target.value) || 1800
                                  }
                                }
                              })
                            }
                            className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            placeholder="1800"
                          />
                          <span className="text-xs text-gray-500">
                            (HHMM, ex: 900 = 9h00)
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
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

      {/* Create Restaurant Modal */}
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
                  <h3 className="text-lg font-semibold mb-4">
                    Informations du compte
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="email"
                        value={createForm.email}
                        onChange={(e) => handleCreateFormChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.email 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-green-500'
                        }`}
                        placeholder="restaurant@example.com"
                        required
                      />
                      {createFormErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{createFormErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mot de passe * <span className="text-red-500">●</span>
                      </label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => handleCreateFormChange('password', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                          createFormErrors.password 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-green-500'
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
                    
                    <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de téléphone *{' '}
                      <span className="text-red-500">●</span>
                    </label>
                    <input
                      type="tel"
                      value={createForm.phone_number || ''}
                      onChange={(e) => handleCreateFormChange('phone_number', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        createFormErrors.phone_number
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-green-500'
                      }`}
                      placeholder="+213 555 123 456"
                      required
                    />
                    {createFormErrors.phone_number && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.phone_number}</p>
                    )}
                  </div>
                </div>
              </div>

                {/* Restaurant Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Informations du restaurant
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du restaurant *{' '}
                        <span className="text-red-500">●</span>
                      </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => handleCreateFormChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        createFormErrors.name
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-green-500'
                      }`}
                      placeholder="Nom du restaurant"
                      required
                    />
                    {createFormErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.name}</p>
                    )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            description: e.target.value
                          })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Description du restaurant..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Catégories *{' '}
                        <span className="text-red-500">●</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const isSelected =
                            createForm.categories.includes(cat.value);
                          const icons: Record<CategoryValue, string> = {
                            pizza: '🍕',
                            burger: '🍔',
                            tacos: '🌮',
                            sandwish: '🥪'
                          };
                          const colors: Record<CategoryValue, string> = {
                            pizza:
                              'from-red-50 to-orange-50 border-red-200 hover:border-red-400',
                            burger:
                              'from-yellow-50 to-amber-50 border-yellow-200 hover:border-yellow-400',
                            tacos:
                              'from-orange-50 to-yellow-50 border-orange-200 hover:border-orange-400',
                            sandwish:
                              'from-green-50 to-emerald-50 border-green-200 hover:border-green-400'
                          };
                          const selectedColors: Record<CategoryValue, string> =
                            {
                              pizza:
                                'from-red-100 to-orange-100 border-red-500 ring-2 ring-red-500 ring-offset-2',
                              burger:
                                'from-yellow-100 to-amber-100 border-yellow-500 ring-2 ring-yellow-500 ring-offset-2',
                              tacos:
                                'from-orange-100 to-yellow-100 border-orange-500 ring-2 ring-orange-500 ring-offset-2',
                              sandwish:
                                'from-green-100 to-emerald-100 border-green-500 ring-2 ring-green-500 ring-offset-2'
                            };

                          return (
                            <label
                              key={cat.value}
                              className={`relative flex flex-col items-center justify-center cursor-pointer p-4 border-2 rounded-xl transition-all duration-200 bg-gradient-to-br ${
                                isSelected
                                  ? selectedColors[cat.value]
                                  : colors[cat.value]
                              } ${
                                isSelected
                                  ? 'transform scale-105'
                                  : 'hover:scale-102'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  handleCategoryToggle(cat.value, e.target.checked)
                                }
                                className="absolute top-2 right-2 w-5 h-5 text-green-600 rounded-full focus:ring-2 focus:ring-green-500"
                              />
                              <span className="text-4xl mb-2">
                                {icons[cat.value]}
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? 'text-gray-900'
                                    : 'text-gray-700'
                                }`}
                              >
                                {cat.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {createForm.categories.length === 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          Veuillez sélectionner au moins une catégorie
                        </p>
                      )}
                    </div>

                    {/* Image Upload Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Image du restaurant
                      </label>

                      <div className="space-y-4">
                        {(imagePreview || createForm.image_url) && (
                          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                            <img
                              src={imagePreview || createForm.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <label className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                              {uploadingImage ? (
                                <>
                                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-green-600"></div>
                                  <span className="text-sm text-gray-600">
                                    Upload en cours...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <svg
                                    className="w-5 h-5 text-gray-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <span className="text-sm font-medium text-gray-700">
                                    Télécharger une image
                                  </span>
                                </>
                              )}
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              disabled={uploadingImage}
                            />
                          </label>

                          {/* Manual URL Input */}
                          <button
                            type="button"
                            onClick={() => {
                              const url = prompt('Entrez l\'URL de l\'image:');
                              if (url) {
                                setCreateForm({...createForm, image_url: url});
                                setImagePreview(null);
                              }
                            }}
                            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Entrer une URL manuellement"
                          >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </button>
                        </div>

                        <p className="text-xs text-gray-500">
                          Formats acceptés: JPG, PNG, GIF. Taille max: 5 MB
                        </p>
                      </div>
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
                      onChange={(e) => handleCreateFormChange('address', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                        createFormErrors.address
                          ? 'border-red-300 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-green-500'
                      }`}
                      placeholder="123 Rue Example, Ville"
                      required
                    />
                    {createFormErrors.address && (
                      <p className="text-red-500 text-xs mt-1">{createFormErrors.address}</p>
                    )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Latitude * <span className="text-red-500">●</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.lat}
                          onChange={(e) => handleCreateFormChange('lat', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                            createFormErrors.lat
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-green-500'
                          }`}
                          placeholder="36.7309715"
                          required
                        />
                        {createFormErrors.lat && (
                          <p className="text-red-500 text-xs mt-1">{createFormErrors.lat}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Longitude * <span className="text-red-500">●</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.lng}
                          onChange={(e) => handleCreateFormChange('lng', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
                            createFormErrors.lng
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-green-500'
                          }`}
                          placeholder="3.1670642"
                          required
                        />
                        {createFormErrors.lng && (
                          <p className="text-red-500 text-xs mt-1">{createFormErrors.lng}</p>
                        )}
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
                        className="w-4 h-4 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Compte Premium</span>
                    </label>
                  </div>
                </div>

                {/* Opening Hours */}
                <details className="bg-gray-50 p-4 rounded-lg">
                  <summary className="text-lg font-semibold cursor-pointer">
                    Horaires d&apos;ouverture (optionnel)
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
                  disabled={uploadingImage}
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
