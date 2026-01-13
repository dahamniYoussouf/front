'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Heart,
  Star,
  MapPin,
  Search,
  AlertCircle,
  Store,
  UtensilsCrossed,
  Tag,
  StickyNote,
  Layers,
  LayoutGrid,
  Users
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==== TYPES ====

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address?: string;
  rating?: number;
  image_url?: string;
  is_premium?: boolean;
  status?: string;
}

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
}

interface FavoriteRestaurant {
  id?: string;
  favorite_uuid?: string;
  notes?: string;
  tags?: string[];
  created_at?: string;
  added_at?: string;
  restaurant: Restaurant;
  client?: ClientInfo;
}

interface MenuItem {
  id: string;
  nom: string;
  description?: string;
  prix?: number;
  photo_url?: string;
  category_id?: string;
}

interface FavoriteMeal {
  id?: string;
  favorite_uuid?: string;
  customizations?: string;
  notes?: string;
  created_at?: string;
  createdAt?: string;
  meal: MenuItem & {
    restaurant?: {
      id: string;
      name: string;
      address?: string;
      rating?: number;
      image_url?: string;
    };
  };
  client?: ClientInfo;
}

type TabType = 'restaurants' | 'meals';
type ViewMode = 'grouped' | 'flat';

const getFavoriteKey = (fav: { id?: string; favorite_uuid?: string }, fallback: string) =>
  fav.id || fav.favorite_uuid || fallback;

const getFavoriteDate = (fav: { created_at?: string; added_at?: string; createdAt?: string }) =>
  fav.added_at || fav.created_at || fav.createdAt || '';

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function ClientFavorites() {
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Récupérer les favoris
  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        return;
      }

      // Utiliser les endpoints admin
      const endpoint = activeTab === 'restaurants' 
        ? '/admin/favorites/restaurants'
        : '/admin/favorites/meals';

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des favoris');
      }

      const data = await response.json();

      if (data.success) {
        if (activeTab === 'restaurants') {
          setFavoriteRestaurants(data.data || []);
        } else {
          setFavoriteMeals(data.data || []);
        }
      }
    } catch (err: unknown) {
      console.error('Erreur fetch favoris:', err);
      setError(err instanceof Error ? err.message : 'Impossible de charger les favoris');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Filtrer les favoris
  const filteredRestaurants = favoriteRestaurants.filter((fav) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
       fav.restaurant?.name?.toLowerCase().includes(search) ||
  fav.restaurant?.address?.toLowerCase().includes(search) ||
  fav.notes?.toLowerCase().includes(search);
    
    const matchesTag = filterTag === 'all' || (fav.tags && fav.tags.includes(filterTag));
    
    return matchesSearch && matchesTag;
  });

  const filteredMeals = favoriteMeals.filter((fav) => {
    const search = searchTerm.toLowerCase();
    return (
      fav.meal.nom.toLowerCase().includes(search) ||
      (fav.meal.restaurant?.name || '').toLowerCase().includes(search) ||
      fav.notes?.toLowerCase().includes(search)
    );
  });

  // Récupérer tous les tags uniques
  const allTags = Array.from(
    new Set(favoriteRestaurants.flatMap(fav => fav.tags || []))
  );

  const restaurantGroups = useMemo(() => {
    const map = new Map<
      string,
      { restaurant: Restaurant; favorites: FavoriteRestaurant[]; clientsCount: number; tags: string[] }
    >();

    for (const fav of filteredRestaurants) {
      const restaurant = fav.restaurant;
      if (!restaurant?.id) continue;

      const key = restaurant.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          restaurant,
          favorites: [fav],
          clientsCount: fav.client?.id ? 1 : 0,
          tags: fav.tags ? [...fav.tags] : []
        });
        continue;
      }

      existing.favorites.push(fav);
      if (fav.client?.id && !existing.favorites.some((f) => f !== fav && f.client?.id === fav.client?.id)) {
        existing.clientsCount += 1;
      }
      if (fav.tags) existing.tags.push(...fav.tags);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.favorites.length !== a.favorites.length) return b.favorites.length - a.favorites.length;
      return (a.restaurant.name || '').localeCompare(b.restaurant.name || '');
    });
  }, [filteredRestaurants]);

  const mealGroups = useMemo(() => {
    const map = new Map<
      string,
      { meal: FavoriteMeal['meal']; favorites: FavoriteMeal[]; clientsCount: number }
    >();

    for (const fav of filteredMeals) {
      const meal = fav.meal;
      if (!meal?.id) continue;

      const key = meal.id;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          meal,
          favorites: [fav],
          clientsCount: fav.client?.id ? 1 : 0
        });
        continue;
      }

      existing.favorites.push(fav);
      if (fav.client?.id && !existing.favorites.some((f) => f !== fav && f.client?.id === fav.client?.id)) {
        existing.clientsCount += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.favorites.length !== a.favorites.length) return b.favorites.length - a.favorites.length;
      return (a.meal.nom || '').localeCompare(b.meal.nom || '');
    });
  }, [filteredMeals]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Gérer les actions
  /*
  const handleEdit = (item: FavoriteRestaurant | FavoriteMeal) => {
    setSelectedItem(item);
    
    if (activeTab === 'restaurants') {
      const restaurant = item as FavoriteRestaurant;
      setEditFormData({
        notes: restaurant.notes || '',
        tags: restaurant.tags || []
      });
      setModalType('edit-restaurant');
    } else {
      const meal = item as FavoriteMeal;
      setEditFormData({
        notes: meal.notes || '',
        customizations: meal.customizations || ''
      });
      setModalType('edit-meal');
    }
    
    setShowModal(true);
  };

  const handleDelete = (item: FavoriteRestaurant | FavoriteMeal) => {
    setSelectedItem(item);
    setModalType('delete');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setModalType('');
    setEditFormData({});
    setSaveLoading(false);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const endpoint = activeTab === 'restaurants'
        ? `/favoriterestaurant/updatefavorite/${selectedItem.favorite_uuid}`
        : `/favoritemeal/updatefavorite/${selectedItem.favorite_uuid}`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      await fetchFavorites();
      handleCloseModal();
    } catch (err: any) {
      setError(err?.message || 'Impossible de sauvegarder');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const endpoint = activeTab === 'restaurants'
        ? `/favoriterestaurant/delete/${selectedItem.favorite_uuid}`
        : `/favoritemeal/delete/${selectedItem.favorite_uuid}`;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      await fetchFavorites();
      handleCloseModal();
    } catch (err: any) {
      setError(err?.message || 'Impossible de supprimer');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  */

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex-1 w-full">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Gestion des Favoris
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Retrouvez tous vos restaurants et plats préférés
              </p>
            </div>
            <button
              onClick={fetchFavorites}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('restaurants')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto ${
                activeTab === 'restaurants'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Store className="w-5 h-5" />
              Restaurants
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {favoriteRestaurants.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('meals')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors w-full sm:w-auto ${
                activeTab === 'meals'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UtensilsCrossed className="w-5 h-5" />
              Plats
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {favoriteMeals.length}
              </span>
            </button>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Rechercher ${activeTab === 'restaurants' ? 'un restaurant' : 'un plat'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
              />
            </div>
            
            {activeTab === 'restaurants' && allTags.length > 0 && (
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full lg:w-56 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">Tous les tags</option>
                {allTags.map((tag) => (
  <option key={`tag-filter-${tag}`} value={tag}>
    {tag}
  </option>
))}
              </select>
            )}

            <div className="flex gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold border transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Layers className="w-4 h-4" />
                Groupé
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold border transition-colors ${
                  viewMode === 'flat'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Détail
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : activeTab === 'restaurants' ? (
          viewMode === 'grouped' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {restaurantGroups.map((group) => {
                const restaurant = group.restaurant;
                const isExpanded = !!expandedGroups[restaurant.id];
                const uniqueTags = Array.from(new Set(group.tags)).slice(0, 6);

                return (
                  <div
                    key={restaurant.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="relative h-36">
                      <img
                        src={restaurant.image_url || 'https://via.placeholder.com/400x300?text=Restaurant'}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                      {restaurant.is_premium && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                          PREMIUM
                        </span>
                      )}
                      <span className="absolute top-2 right-2 bg-white/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                        {group.favorites.length} fav
                      </span>
                    </div>

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                          {restaurant.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                          <Users className="w-3.5 h-3.5" />
                          {group.clientsCount}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mb-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-gray-700">
                          {restaurant.rating || 'N/A'}
                        </span>
                      </div>

                      {restaurant.address && (
                        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{restaurant.address}</span>
                        </div>
                      )}

                      {uniqueTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {uniqueTags.map((tag) => (
                            <span
                              key={`${restaurant.id}-${tag}`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                            >
                              <Tag className="w-2.5 h-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => toggleGroup(restaurant.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                          {group.favorites
                            .slice()
                            .sort((a, b) => (getFavoriteDate(b) || '').localeCompare(getFavoriteDate(a) || ''))
                            .slice(0, 5)
                            .map((fav, idx) => {
                              const key = getFavoriteKey(fav, `${restaurant.id}-${idx}`);
                              const clientName = fav.client
                                ? `${fav.client.first_name} ${fav.client.last_name}`
                                : 'Client';

                              return (
                                <div key={key} className="rounded border border-gray-100 p-2 bg-gray-50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 truncate">
                                        {clientName}
                                      </div>
                                      {fav.client?.email && (
                                        <div className="text-xs text-gray-500 truncate">{fav.client.email}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 whitespace-nowrap">
                                      {formatDate(getFavoriteDate(fav))}
                                    </div>
                                  </div>

                                  {fav.notes && (
                                    <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                                      <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <p className="line-clamp-3">{fav.notes}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {group.favorites.length > 5 && (
                            <div className="text-xs text-gray-500">+{group.favorites.length - 5} autres</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {restaurantGroups.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun restaurant favori</h3>
                  <p className="text-gray-500">Commencez à ajouter des restaurants à vos favoris</p>
                </div>
              )}
            </div>
          ) : (
            // Liste des restaurants favoris
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRestaurants.map((fav, idx) => {
              // Use favorite_uuid as primary key, fallback to unique combination
              const uniqueKey = getFavoriteKey(fav, `${fav.restaurant?.id}-${fav.client?.id}-${idx}`);

              return (
                <div
                  key={uniqueKey}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative h-36">
                  <img
                    src={fav.restaurant.image_url || 'https://via.placeholder.com/400x300?text=Restaurant'}
                    alt={fav.restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  {fav.restaurant.is_premium && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">
                      PREMIUM
                    </span>
                  )}
                  
                </div>
                
                <div className="p-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                    {fav.restaurant.name}
                  </h3>
                  
                  {fav.client && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5">
                      <span className="font-medium">Client:</span>
                      <span className="truncate">{fav.client.first_name} {fav.client.last_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 mb-1.5">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-medium text-gray-700">
                      {fav.restaurant.rating || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{fav.restaurant.address}</span>
                  </div>
                  
                  {fav.tags && fav.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {fav.tags.map((tag, tagIdx) => (
                        <span
                          key={`tag-${uniqueKey}-${tag}-${tagIdx}`}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {fav.notes && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 p-1.5 rounded mb-2">
                      <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{fav.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate">Ajouté le {formatDate(getFavoriteDate(fav))}</span>
                  </div>
                  
                 
                </div>
              </div>
              );
            })}
            
            {filteredRestaurants.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun restaurant favori
                </h3>
                <p className="text-gray-500">
                  Commencez à ajouter des restaurants à vos favoris
                </p>
              </div>
            )}
          </div>
          )
        ) : (
          viewMode === 'grouped' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mealGroups.map((group) => {
                const meal = group.meal;
                const isExpanded = !!expandedGroups[meal.id];
                const restaurantName = meal.restaurant?.name ?? 'Restaurant';

                return (
                  <div
                    key={meal.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="relative h-36">
                      <img
                        src={meal.photo_url || 'https://via.placeholder.com/400x300?text=Meal'}
                        alt={meal.nom}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 right-2 bg-white/90 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                        {group.favorites.length} fav
                      </span>
                    </div>

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                          {meal.nom}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                          <Users className="w-3.5 h-3.5" />
                          {group.clientsCount}
                        </span>
                      </div>

                      <p className="text-xl font-bold text-red-600 mb-1.5">{meal.prix} DA</p>

                      {meal.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{meal.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 pb-2 border-b">
                        <Store className="w-3.5 h-3.5" />
                        <span className="font-medium truncate">{restaurantName}</span>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => toggleGroup(meal.id)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          {isExpanded ? 'Masquer les détails' : 'Voir les détails'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 border-t pt-3 space-y-2">
                          {group.favorites
                            .slice()
                            .sort((a, b) => (getFavoriteDate(b) || '').localeCompare(getFavoriteDate(a) || ''))
                            .slice(0, 5)
                            .map((fav, idx) => {
                              const key = getFavoriteKey(fav, `${meal.id}-${idx}`);
                              const clientName = fav.client
                                ? `${fav.client.first_name} ${fav.client.last_name}`
                                : 'Client';

                              return (
                                <div key={key} className="rounded border border-gray-100 p-2 bg-gray-50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-gray-900 truncate">
                                        {clientName}
                                      </div>
                                      {fav.client?.email && (
                                        <div className="text-xs text-gray-500 truncate">{fav.client.email}</div>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 whitespace-nowrap">
                                      {formatDate(getFavoriteDate(fav))}
                                    </div>
                                  </div>

                                  {fav.customizations && (
                                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                                      <p className="text-xs font-medium text-yellow-800 mb-0.5">
                                        Personnalisations:
                                      </p>
                                      <p className="text-xs text-yellow-700 line-clamp-2">{fav.customizations}</p>
                                    </div>
                                  )}

                                  {fav.notes && (
                                    <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
                                      <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      <p className="line-clamp-3">{fav.notes}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          {group.favorites.length > 5 && (
                            <div className="text-xs text-gray-500">+{group.favorites.length - 5} autres</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {mealGroups.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun plat favori</h3>
                  <p className="text-gray-500">Commencez à ajouter des plats à vos favoris</p>
                </div>
              )}
            </div>
          ) : (
            // Liste des plats favoris
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMeals.map((fav, idx) => {
              // Use favorite_uuid as primary key, fallback to unique combination
              const uniqueKey = getFavoriteKey(fav, `${fav.meal?.id}-${fav.client?.id}-${idx}`);

              return (
                <div
                  key={uniqueKey}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative h-36">
                  <img
                    src={fav.meal.photo_url || 'https://via.placeholder.com/400x300?text=Meal'}
                    alt={fav.meal.nom}
                    className="w-full h-full object-cover"
                  />
                  
                </div>
                
                <div className="p-3">
                  <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-1">
                    {fav.meal.nom}
                  </h3>
                  
                  {fav.client && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5">
                      <span className="font-medium">Client:</span>
                      <span className="truncate">{fav.client.first_name} {fav.client.last_name}</span>
                    </div>
                  )}
                  
                  <p className="text-xl font-bold text-red-600 mb-1.5">
                    {fav.meal.prix} DA
                  </p>
                  
                  {fav.meal.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {fav.meal.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2 pb-2 border-b">
                    <Store className="w-3.5 h-3.5" />
                    <span className="font-medium truncate">{fav.meal?.restaurant?.name ?? "Restaurant "}</span>
                  </div>
                  
                  {fav.customizations && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-1.5 mb-2">
                      <p className="text-xs font-medium text-yellow-800 mb-0.5">Personnalisations:</p>
                      <p className="text-xs text-yellow-700 line-clamp-2">{fav.customizations}</p>
                    </div>
                  )}
                  
                  {fav.notes && (
                    <div className="flex items-start gap-1.5 text-xs text-gray-600 bg-gray-50 p-1.5 rounded mb-2">
                      <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{fav.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate">Ajouté le {formatDate(getFavoriteDate(fav))}</span>
                  </div>
                  
                  
                </div>
              </div>
              );
            })}
            
            {filteredMeals.length === 0 && (
              <div className="col-span-full text-center py-12">
                <UtensilsCrossed className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun plat favori
                </h3>
                <p className="text-gray-500">
                  Commencez à ajouter des plats à vos favoris
                </p>
              </div>
            )}
          </div>
          )
        )}
      </div>

      {/* Modal */}
      {/*
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'delete' 
                  ? 'Confirmer la suppression'
                  : modalType === 'edit-restaurant'
                  ? 'Modifier le restaurant favori'
                  : 'Modifier le plat favori'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                ×
              </button>
            </div>

          

           
          </div>
        </div>
      */}
    </div>
  );
}
