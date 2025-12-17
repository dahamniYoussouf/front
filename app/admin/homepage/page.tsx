'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Grid, Layers, Star, Zap, Sparkles, Megaphone } from 'lucide-react';

import Loader from '@/components/Loader';
import ModuleManager, {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleItem
} from './ModuleManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const ensureArrayPayload = (value: unknown): ModuleItem[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    if ('data' in value && Array.isArray((value as { data: unknown }).data)) {
      return (value as { data: unknown }).data as ModuleItem[];
    }
    if ('items' in value && Array.isArray((value as { items: unknown }).items)) {
      return (value as { items: unknown }).items as ModuleItem[];
    }
  }
  return [];
};

const buildAsyncOptions = (payload: unknown, labelKeys: string[]): ModuleFieldOption[] => {
  return ensureArrayPayload(payload)
    .map((entry) => {
      const idValue = entry.id ?? entry.uuid ?? entry._id ?? entry.code;
      if (!idValue) {
        return null;
      }
      const label =
        labelKeys
          .map((key) => (typeof entry[key] === 'string' ? entry[key] : undefined))
          .find((value) => value && String(value).trim()) ??
        (typeof entry.name === 'string' && entry.name.trim() ? entry.name : undefined) ??
        (typeof entry.title === 'string' && entry.title.trim() ? entry.title : undefined) ??
        String(idValue);
      return { value: String(idValue), label: String(label) };
    })
    .filter((option): option is ModuleFieldOption => Boolean(option));
};

const RESTAURANT_LABEL_KEYS = ['name', 'title', 'company_name'];
const MENU_ITEM_LABEL_KEYS = ['nom', 'name', 'title'];

const mapRestaurantOptions = (references?: Record<string, ModuleItem[]>) =>
  buildAsyncOptions(references?.restaurants ?? [], RESTAURANT_LABEL_KEYS);

const buildMenuItemOptions = (
  references?: Record<string, ModuleItem[]> & { menuItemsByRestaurant?: Record<string, ModuleItem[]> },
  context?: { state?: Record<string, unknown>; item?: ModuleItem }
) => {
  const isFormContext = Boolean(context?.state);
  const restaurantId =
    context?.state?.restaurant_id ??
    context?.item?.restaurant_id ??
    context?.item?.restaurant?.id ??
    context?.item?.category?.restaurant_id ??
    context?.item?.category?.restaurant?.id ??
    '';
  const normalizedRestaurantId = String(restaurantId ?? '').trim();

  if (isFormContext && !normalizedRestaurantId) {
    return [];
  }

  const restaurantSpecificItems =
    normalizedRestaurantId && references?.menuItemsByRestaurant?.[normalizedRestaurantId]
      ? references.menuItemsByRestaurant[normalizedRestaurantId]
      : [];
  const fallbackItems = references?.menuItems ?? [];
  const sourceItems = restaurantSpecificItems.length ? restaurantSpecificItems : fallbackItems;

  return sourceItems
    .map((item) => {
      const label =
        String(item.nom ?? item.name ?? item.title ?? item.description ?? item.id ?? '')
          .trim() || String(item.id ?? item.uuid ?? item._id ?? '');
      const value = String(item.id ?? item.uuid ?? item._id ?? '');
      if (!value) {
        return null;
      }
      return { value, label };
    })
    .filter((option): option is ModuleFieldOption => Boolean(option))
    .sort((a, b) => a.label.localeCompare(b.label));
};

const BASE_MODULE_CONFIGS: ModuleDescriptor[] = [
  {
    key: 'categories',
    title: "Catégories d'accueil",
    description: 'Organisez les familles de plats visibles dès l’ouverture.',
    icon: Grid,
    gradient: 'from-sky-500/80 to-sky-700/80',
    fetchEndpoint: '/admin/homepage/categories',
    createEndpoint: '/admin/homepage/categories',
    updateEndpoint: (item) => `/admin/homepage/categories/${item.id}`,
    deleteEndpoint: (item) => `/admin/homepage/categories/${item.id}`,
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Burgers' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Accroche courte' },
      { name: 'image_url', label: 'Image URL', type: 'url', placeholder: 'https://...' },
      { name: 'display_order', label: "Ordre d'affichage", type: 'number', placeholder: '1' },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item) => (typeof item.description === 'string' ? item.description : '')
  },
  {
    key: 'thematics',
    title: 'Collections thématiques',
    description: 'Regroupez les restaurants par ambiance pour inspirer les clients.',
    icon: Layers,
    gradient: 'from-purple-500/80 to-indigo-700/80',
    fetchEndpoint: '/admin/homepage/thematic-selections',
    createEndpoint: '/admin/homepage/thematic-selections',
    updateEndpoint: (item) => `/admin/homepage/thematic-selections/${item.id}`,
    deleteEndpoint: (item) => `/admin/homepage/thematic-selections/${item.id}`,
    fields: [
      { name: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Tacos pour vous' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Récits rapides' },
      {
        name: 'home_category_id',
        label: 'Catégorie parente',
        type: 'select',
        hint: 'Sélectionnez la catégorie liée',
        options: (refs) =>
          (refs.categories || [])
            .filter((category) => category.id)
            .map((category) => ({
              value: String(category.id ?? ''),
              label: String(category.name ?? category.title ?? 'Catégorie')
            }))
      },
      { name: 'image_url', label: 'Image URL', type: 'url' },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item, refs) => {
      const parent = refs?.categories?.find((category) => category.id === item.home_category_id);
      if (parent) {
        return `Catégorie parente : ${parent.name ?? parent.title ?? '…'}`;
      }
      if (item.home_category_id) {
        return `Parent ID : ${item.home_category_id}`;
      }
      return '';
    }
  },
  {
    key: 'recommended',
    title: 'Plats recommandés',
    description: 'Sélectionnez les plats premium que l’on met en avant sur la home.',
    icon: Star,
    gradient: 'from-amber-500/80 to-orange-700/80',
    fetchEndpoint: '/admin/homepage/recommended-dishes',
    createEndpoint: '/admin/homepage/recommended-dishes',
    updateEndpoint: (item) => `/admin/homepage/recommended-dishes/${item.id}`,
    deleteEndpoint: (item) => `/admin/homepage/recommended-dishes/${item.id}`,
      fields: [
      {
        name: 'restaurant_id',
        label: 'Restaurant',
        type: 'select',
        required: true,
        placeholder: 'Sélectionnez un restaurant',
        searchable: true,
        options: (refs) => mapRestaurantOptions(refs),
      },
      {
        name: 'menu_item_id',
        label: 'Plat',
        type: 'select',
        required: true,
        placeholder: 'Sélectionnez un restaurant d\'abord',
        searchable: true,
        hint: 'Le menu se met à jour après le choix d\'un restaurant',
        options: (refs, context) => buildMenuItemOptions(refs, context)
      },
      { name: 'reason', label: 'Motif', type: 'textarea', placeholder: 'Coup de cœur du chef' },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item) => {
      if (typeof item.reason === 'string' && item.reason.trim()) {
        return item.reason;
      }
      if (item.menu_item_id) {
        return `Plat ID : ${item.menu_item_id}`;
      }
      return '';
    }
  },
  {
    key: 'promotions',
    title: 'Promotions & badges',
    description: 'Gérez les rabais qui s’affichent sur les cartes et le panier.',
    icon: Zap,
    gradient: 'from-emerald-500/80 to-teal-700/80',
    fetchEndpoint: '/admin/promotions',
    createEndpoint: '/admin/promotions',
    updateEndpoint: (item) => `/admin/promotions/${item.id}`,
    deleteEndpoint: (item) => `/admin/promotions/${item.id}`,
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true, placeholder: '20% sur les burgers' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Détails rapides' },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'percentage', label: 'Pourcentage' },
          { value: 'amount', label: 'Montant' },
          { value: 'free_delivery', label: 'Livraison offerte' },
          { value: 'buy_x_get_y', label: '1 acheté = 1 offert' },
          { value: 'other', label: 'Autre' }
        ]
      },
      {
        name: 'restaurant_id',
        label: 'Restaurant (facultatif)',
        type: 'select',
        placeholder: 'Sélectionnez un restaurant (optionnel)',
        searchable: true,
        options: (refs) => mapRestaurantOptions(refs)
      },
      { name: 'discount_value', label: 'Valeur du rabais', type: 'number', placeholder: '25' },
      { name: 'badge_text', label: 'Badge texte', type: 'text', placeholder: '-20%' },
      { name: 'start_date', label: 'Début', type: 'date' },
      { name: 'end_date', label: 'Fin', type: 'date' },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item) => {
      const pieces: string[] = [];
      if (item.badge_text) {
        pieces.push(String(item.badge_text));
      }
      if (item.type) {
        pieces.push(String(item.type));
      }
      return pieces.join(' • ');
    }
  },
  {
    key: 'dailyDeals',
    title: 'Offres du jour',
    description: 'Fixez une promotion en tête de la home pour toute la journée.',
    icon: Sparkles,
    gradient: 'from-emerald-600/80 to-emerald-800/80',
    fetchEndpoint: '/admin/homepage/daily-deals',
    createEndpoint: '/admin/homepage/daily-deals',
    updateEndpoint: (item) => `/admin/homepage/daily-deals/${item.id}`,
    deleteEndpoint: (item) => `/admin/homepage/daily-deals/${item.id}`,
    fields: [
      {
        name: 'promotion_id',
        label: 'Promotion liée',
        type: 'select',
        required: true,
        options: (refs) =>
          (refs.promotions || [])
            .filter((promotion) => promotion.id)
            .map((promotion) => ({
              value: String(promotion.id),
              label: String(promotion.title ?? promotion.badge_text ?? promotion.id ?? 'Promotion')
            }))
      },
      { name: 'start_date', label: 'Début', type: 'date', required: true },
      { name: 'end_date', label: 'Fin', type: 'date', required: true },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item, refs) => {
      const promotion = refs?.promotions?.find((promo) => promo.id === item.promotion_id);
      if (promotion) {
        return `Promotion : ${promotion.title ?? promotion.badge_text ?? promotion.id ?? '—'}`;
      }
      if (item.promotion_id) {
        return `Promotion ID : ${item.promotion_id}`;
      }
      return '';
    }
  },
  {
    key: 'announcements',
    title: 'Annonces',
    description: 'Diffusez les messages de service et les rappels sur la home.',
    icon: Megaphone,
    gradient: 'from-slate-600/80 to-slate-800/80',
    fetchEndpoint: '/announcement/getall',
    createEndpoint: '/announcement/create',
    updateEndpoint: (item) => `/announcement/update/${item.id}`,
    deleteEndpoint: (item) => `/announcement/delete/${item.id}`,
    fields: [
      { name: 'title', label: 'Titre', type: 'text', required: true },
      { name: 'content', label: 'Contenu', type: 'textarea', required: true },
      {
        name: 'type',
        label: 'Ton',
        type: 'select',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'success', label: 'Succès' },
          { value: 'warning', label: 'Alerte' },
          { value: 'error', label: 'Urgent' }
        ],
        default: 'info'
      },
      {
        name: 'restaurant_id',
        label: 'Restaurant (optionnel)',
        type: 'select',
        placeholder: 'Associer un restaurant (facultatif)',
        searchable: true,
        options: (refs) => mapRestaurantOptions(refs)
      },
      { name: 'start_date', label: 'Début', type: 'date' },
      { name: 'end_date', label: 'Fin', type: 'date' },
      { name: 'is_active', label: 'Actif', type: 'checkbox', default: true }
    ],
    itemSubtitle: (item) => {
      const pieces: string[] = [];
      if (item.type) {
        pieces.push(String(item.type));
      }
      if (typeof item.content === 'string' && item.content.trim()) {
        pieces.push(item.content.trim().slice(0, 60));
      } else if (typeof item.message === 'string' && item.message.trim()) {
        pieces.push(item.message.trim().slice(0, 60));
      }
      return pieces.join(' • ');
    }
  }
];

const getArray = (value: unknown) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object' && 'data' in value && Array.isArray((value as { data: unknown }).data)) {
    return (value as { data: unknown }).data;
  }
  return [];
};

const fetchWithToken = async (endpoint: string, options: RequestInit = {}) => {
  if (typeof window === 'undefined') {
    throw new Error('Client token unavailable');
  }
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Vous devez vous reconnecter pour accéder à cette section');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { message?: string }).message || 'Impossible de récupérer les données');
  }

  return payload;
};

export default function AdminHomepageManagement() {
  const searchParams = useSearchParams();
  const selectedModuleKey = searchParams?.get('module') ?? '';
  const [moduleData, setModuleData] = useState<Record<string, ModuleItem[]>>({});
  const [moduleLoading, setModuleLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referenceLists, setReferenceLists] = useState<{
    restaurants: ModuleItem[];
  }>({
    restaurants: []
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuItemsByRestaurant, setMenuItemsByRestaurant] = useState<Record<string, ModuleItem[]>>({});


  const loadModule = useCallback(async (config: ModuleDescriptor) => {
    setModuleLoading((previous) => ({ ...previous, [config.key]: true }));
    try {
      const payload = await fetchWithToken(config.fetchEndpoint);
      const list = getArray(payload) as ModuleItem[];
      setModuleData((previous) => ({ ...previous, [config.key]: list }));
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : `Impossible de charger ${config.title}`;
      setError(message);
    } finally {
      setModuleLoading((previous) => ({ ...previous, [config.key]: false }));
    }
  }, []);

  const fetchMenuItemsForRestaurant = useCallback(
    async (restaurantId: string) => {
      if (!restaurantId) {
        return;
      }
      try {
        const payload = await fetchWithToken(`/menuitem/getall?restaurant_id=${restaurantId}&limit=1000`);
        const list = getArray(payload) as ModuleItem[];
        setMenuItemsByRestaurant((previous) => ({
          ...previous,
          [restaurantId]: list
        }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erreur lors de la récupération des plats par restaurant :', error);
      }
    },
    [fetchWithToken]
  );

  const moduleConfigs = useMemo(() => {
    return BASE_MODULE_CONFIGS.map((module) => {
      if (module.key !== 'recommended') {
        return module;
      }
      return {
        ...module,
        fields: module.fields.map((field) => {
          if (field.name !== 'restaurant_id') {
            return field;
          }
          return {
            ...field,
            onValueChange: (value, context) => {
              context.setter('menu_item_id', '');
              const restaurantValue = String(value ?? '').trim();
              if (restaurantValue) {
                fetchMenuItemsForRestaurant(restaurantValue);
              }
            }
          };
        })
      };
    });
  }, [fetchMenuItemsForRestaurant]);

  const selectedModule = useMemo(() => {
    if (!selectedModuleKey) {
      return null;
    }
    return moduleConfigs.find((module) => module.key === selectedModuleKey) ?? null;
  }, [selectedModuleKey, moduleConfigs]);
  const modulesToRender = selectedModule ? [selectedModule] : moduleConfigs;
  const moduleNotFound = Boolean(selectedModuleKey && !selectedModule);

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      setLoading(true);
      setError('');
      await Promise.all(moduleConfigs.map((config) => loadModule(config)));
      if (active) {
        setLoading(false);
      }
    };
    loadAll();
    return () => {
      active = false;
    };
  }, [loadModule, refreshKey, moduleConfigs]);

  useEffect(() => {
    if (loading) {
      return;
    }
    let active = true;
    const loadReferences = async () => {
      try {
        const payload = await fetchWithToken('/restaurant/getall');
        if (!active) {
          return;
        }
        setReferenceLists({
          restaurants: ensureArrayPayload(payload)
        });
      } catch (error) {
        console.warn('Impossible de charger la liste des restaurants :', error);
      }
    };

    loadReferences();
    return () => {
      active = false;
    };
  }, [fetchWithToken, refreshKey, loading]);

  const combinedReferences = useMemo(
    () => ({
      ...moduleData,
      restaurants: referenceLists.restaurants,
      menuItemsByRestaurant
    }),
    [moduleData, referenceLists, menuItemsByRestaurant]
  );

  const handlePageRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.45em] text-slate-500 dark:text-slate-400">Page d&apos;accueil</p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Modules de la page d&apos;accueil</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">Rebuild the homepage modules with focused edit and create views.</p>
          </div>
          <button
            type="button"
            onClick={handlePageRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir la vue
          </button>
        </header>
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
        {loading ? (
          <Loader message="Chargement des modules de la page d'accueil..." />
        ) : (
          <div className="space-y-6">
            {moduleNotFound && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-200">
                Module introuvable, affichage complet exécuté.
              </div>
            )}
            {modulesToRender.map((module) => (
              <ModuleManager
                key={module.key}
                config={module}
                items={moduleData[module.key] ?? []}
                isLoading={Boolean(moduleLoading[module.key])}
                onRefresh={() => loadModule(module)}
                fetchWithToken={fetchWithToken}
                references={combinedReferences}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
