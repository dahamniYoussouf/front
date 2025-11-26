'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Star,
  MapPin,
  Trash2,
  Edit,
  Search,
  AlertCircle,
  Store,
  UtensilsCrossed,
  Tag,
  StickyNote,
  ArrowLeft
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  rating: number;
  image_url: string;
  is_premium: boolean;
  status: string;
}

interface FavoriteRestaurant {
  favorite_uuid: string;
  notes: string;
  tags: string[];
  added_at: string;
  restaurant: Restaurant;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

interface MenuItem {
  id: string;
  nom: string;
  description: string;
  prix: number;
  photo_url: string;
  category_id: string;
}

interface FavoriteMeal {
  favorite_uuid: string;
  customizations: string;
  notes: string;
  createdAt: string;
  meal: MenuItem & {
    restaurant: {
      id: string;
      name: string;
      address: string;
      rating: number;
      image_url: string;
    };
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

type TabType = 'restaurants' | 'meals';
type ModalType = '' | 'edit-restaurant' | 'edit-meal' | 'delete';

export default function ClientFavorites() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('restaurants');
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<FavoriteRestaurant[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [selectedItem, setSelectedItem] = useState<FavoriteRestaurant | FavoriteMeal | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Récupérer les favoris
  useEffect(() => {
    fetchFavorites();
  }, [activeTab]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
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
    } catch (err: any) {
      console.error('Erreur fetch favoris:', err);
      setError(err?.message || 'Impossible de charger les favoris');
    } finally {
      setLoading(false);
    }
  };

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
      fav.meal.restaurant.name.toLowerCase().includes(search) ||
      fav.notes?.toLowerCase().includes(search)
    );
  });

  // Récupérer tous les tags uniques
  const allTags = Array.from(
    new Set(favoriteRestaurants.flatMap(fav => fav.tags || []))
  );

  // Gérer les actions
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
          <div className="flex flex-col sm:flex-row gap-4">
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
                className="w-full sm:w-56 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white"
              >
                <option value="all">Tous les tags</option>
                {allTags.map((tag) => (
  <option key={`tag-filter-${tag}`} value={tag}>
    {tag}
  </option>
))}
              </select>
            )}
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
          // Liste des restaurants favoris
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRestaurants.map((fav, idx) => {
              const baseRestaurantKey =
                fav.favorite_uuid ||
                fav.restaurant?.id ||
                fav.client?.id ||
                `restaurant-${idx}`;

              return (
                <div
                  key={`restaurant-card-${baseRestaurantKey}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative h-48">
                  <img
                    src={fav.restaurant.image_url || 'https://via.placeholder.com/400x300?text=Restaurant'}
                    alt={fav.restaurant.name}
                    className="w-full h-full object-cover"
                  />
                  {fav.restaurant.is_premium && (
                    <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded">
                      PREMIUM
                    </span>
                  )}
                  
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {fav.restaurant.name}
                  </h3>
                  
                  {fav.client && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <span className="font-medium">Client:</span>
                      <span>{fav.client.first_name} {fav.client.last_name}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {fav.restaurant.rating || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{fav.restaurant.address}</span>
                  </div>
                  
                  {fav.tags && fav.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {fav.tags.map((tag, tagIdx) => (
                        <span
                          key={`tag-${baseRestaurantKey}-${tag}-${tagIdx}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {fav.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3">
                      <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{fav.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>Ajouté le {fav.added_at}</span>
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
        ) : (
          // Liste des plats favoris
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMeals.map((fav, idx) => {
              const baseMealKey =
                fav.favorite_uuid ||
                fav.meal?.id ||
                fav.client?.id ||
                `meal-${idx}`;

              return (
                <div
                  key={`meal-card-${baseMealKey}`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative h-48">
                  <img
                    src={fav.meal.photo_url || 'https://via.placeholder.com/400x300?text=Meal'}
                    alt={fav.meal.nom}
                    className="w-full h-full object-cover"
                  />
                  
                </div>
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {fav.meal.nom}
                  </h3>
                  
                  {fav.client && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <span className="font-medium">Client:</span>
                      <span>{fav.client.first_name} {fav.client.last_name}</span>
                    </div>
                  )}
                  
                  <p className="text-2xl font-bold text-red-600 mb-2">
                    {fav.meal.prix} DA
                  </p>
                  
                  {fav.meal.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {fav.meal.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3 pb-3 border-b">
                    <Store className="w-4 h-4" />
                    <span className="font-medium">{fav.meal?.restaurant?.name ?? "Restaurant "}</span>
                  </div>
                  
                  {fav.customizations && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                      <p className="text-xs font-medium text-yellow-800 mb-1">Personnalisations:</p>
                      <p className="text-sm text-yellow-700">{fav.customizations}</p>
                    </div>
                  )}
                  
                  {fav.notes && (
                    <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3">
                      <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="line-clamp-2">{fav.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>Ajouté le {fav.createdAt}</span>
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
        )}
      </div>

      {/* Modal */}
      {showModal && selectedItem && (
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
      )}
    </div>
  );
}