'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, Grid, Layers, Star, Zap, Sparkles, Megaphone } from 'lucide-react';

import Loader from '@/components/Loader';
import ModuleManager, {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleItem,
  ModuleFieldOnChangeContext,
  ModuleManagerReferences
} from './ModuleManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type ValidationErrorItem = { msg: string; param?: string };

class ApiError extends Error {
  status: number;
  payload?: unknown;
  errors?: ValidationErrorItem[];

  constructor(message: string, options: { status: number; payload?: unknown; errors?: ValidationErrorItem[] }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.payload = options.payload;
    this.errors = options.errors;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const coerceNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const extractValidationErrors = (payload: unknown): ValidationErrorItem[] => {
  if (!isRecord(payload)) return [];

  const rawErrors = payload.errors;
  if (Array.isArray(rawErrors)) {
    const result: ValidationErrorItem[] = [];
    rawErrors.forEach((entry) => {
      if (typeof entry === 'string') {
        const msg = coerceNonEmptyString(entry);
        if (msg) result.push({ msg });
        return;
      }
      if (!isRecord(entry)) {
        return;
      }
      const msg =
        coerceNonEmptyString(entry.msg) ||
        coerceNonEmptyString(entry.message) ||
        coerceNonEmptyString(entry.error) ||
        'Erreur de validation';
      const param =
        coerceNonEmptyString(entry.param) ||
        coerceNonEmptyString(entry.path) ||
        coerceNonEmptyString(entry.field) ||
        undefined;
      result.push(param ? { msg, param } : { msg });
    });
    return result;
  }

  if (isRecord(rawErrors)) {
    const result: ValidationErrorItem[] = [];
    Object.entries(rawErrors).forEach(([param, value]) => {
      const msg = coerceNonEmptyString(value);
      if (msg) result.push({ msg, param });
    });
    return result;
  }

  return [];
};

const extractBackendMessage = (payload: unknown): string | null => {
  const directText = coerceNonEmptyString(payload);
  if (directText) {
    return directText;
  }

  if (!isRecord(payload)) return null;

  const direct =
    coerceNonEmptyString(payload.message) || coerceNonEmptyString(payload.error) || coerceNonEmptyString(payload.msg);
  if (direct) return direct;

  const nestedData = payload.data;
  if (isRecord(nestedData)) {
    const nested =
      coerceNonEmptyString(nestedData.message) || coerceNonEmptyString(nestedData.error) || coerceNonEmptyString(nestedData.msg);
    if (nested) return nested;
  }

  const validationErrors = extractValidationErrors(payload);
  if (validationErrors.length) {
    return validationErrors[0].msg;
  }

  return null;
};

const readResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

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

const mapRestaurantOptions = (references?: ModuleManagerReferences) =>
  buildAsyncOptions(references?.restaurants ?? [], RESTAURANT_LABEL_KEYS);

type MenuItemContext = {
  state?: Record<string, unknown>;
  item?: ModuleItem & {
    restaurant?: { id?: string };
    category?: {
      restaurant_id?: string;
      restaurant?: { id?: string };
    };
  };
};

const buildMenuItemOptions = (
  references?: ModuleManagerReferences,
  context?: MenuItemContext
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

const getPromotionType = (state: Record<string, unknown>) => String(state.type ?? '').trim();
const getPromotionScope = (state: Record<string, unknown>) => String(state.scope ?? '').trim();

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
      { name: 'image_url', label: 'Image', type: 'image' },
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
      { name: 'image_url', label: 'Image', type: 'image' },
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
        label: 'Restaurant (optionnel)',
        visibleWhen: ({ state }) => {
          const type = getPromotionType(state);
          if (!type) return false;
          const scope = getPromotionScope(state);
          return ['percentage', 'amount', 'buy_x_get_y'].includes(type) || scope === 'restaurant' || scope === 'menu_item';
        },
        type: 'select',
        placeholder: 'Sélectionnez un restaurant (optionnel)',
        searchable: true,
        options: (refs) => mapRestaurantOptions(refs),
      },
      {
        name: 'scope',
        label: 'Perimetre (optionnel)',
        visibleWhen: ({ state }) => Boolean(getPromotionType(state)),
        type: 'select',
        placeholder: 'Laisser vide pour auto',
        options: [
          { value: 'restaurant', label: 'Restaurant (tous les plats)' },
          { value: 'menu_item', label: 'Plat (un ou plusieurs)' },
          { value: 'global', label: 'Global (tous les restaurants)' },
          { value: 'cart', label: 'Panier' },
          { value: 'delivery', label: 'Livraison' }
        ]
      },
      {
        name: 'menu_item_id',
        label: 'Plat (optionnel)',
        visibleWhen: ({ state }) => {
          const type = getPromotionType(state);
          if (!type) return false;
          const scope = getPromotionScope(state);
          return type === 'buy_x_get_y' || scope === 'menu_item';
        },
        type: 'select',
        placeholder: "SAclectionnez un restaurant d'abord",
        searchable: true,
        options: (refs, context) => buildMenuItemOptions(refs, context)
      },
      {
        name: 'menu_item_ids',
        label: 'Plats (plusieurs IDs)',
        visibleWhen: ({ state }) => {
          const type = getPromotionType(state);
          if (!type) return false;
          const scope = getPromotionScope(state);
          return type === 'percentage' || type === 'amount' || (scope === 'menu_item' && type !== 'buy_x_get_y');
        },
        type: 'textarea',
        placeholder: 'UUID1, UUID2, ...',
        hint: 'SAccparez les UUIDs par une virgule ou un saut de ligne'
      },
      {
        name: 'discount_value',
        label: 'Valeur du rabais',
        type: 'number',
        placeholder: '25',
        required: true,
        visibleWhen: ({ state }) => {
          const type = getPromotionType(state);
          return type === 'percentage' || type === 'amount';
        }
      },
      { name: 'currency', label: 'Devise', type: 'text', placeholder: 'DZD', visibleWhen: ({ state }) => getPromotionType(state) === 'amount' },
      { name: 'badge_text', label: 'Badge texte', type: 'text', placeholder: '-20%', visibleWhen: ({ state }) => Boolean(getPromotionType(state)) },
      {
        name: 'custom_message',
        label: 'Message (autre)',
        type: 'textarea',
        placeholder: 'Ex: Offre du jour',
        visibleWhen: ({ state }) => {
          const type = getPromotionType(state);
          return type === 'other' || type === 'buy_x_get_y';
        }
      },
      {
        name: 'buy_quantity',
        label: 'QuantitAc achetAce',
        type: 'number',
        placeholder: '1',
        required: true,
        visibleWhen: ({ state }) => getPromotionType(state) === 'buy_x_get_y'
      },
      {
        name: 'free_quantity',
        label: 'QuantitAc offerte',
        type: 'number',
        placeholder: '1',
        required: true,
        visibleWhen: ({ state }) => getPromotionType(state) === 'buy_x_get_y'
      },
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
      { name: 'title', label: 'Titre', type: 'text' },
      { name: 'content', label: 'Contenu', type: 'textarea' },
      { name: 'image_url', label: 'Image', type: 'image' },
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
    throw new ApiError('Client token unavailable', { status: 0 });
  }
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  if (!token) {
    throw new ApiError('Vous devez vous reconnecter pour accéder à cette section', { status: 401 });
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

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
  } catch (networkError) {
    const technical = networkError instanceof Error ? networkError.message : String(networkError);
    throw new ApiError(`Impossible de contacter le serveur. ${technical}`.trim(), { status: 0, payload: networkError });
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await readResponseBody(response);
  if (typeof payload === 'string') {
    const snippet = payload.trim().slice(0, 180);
    const message = snippet ? `Réponse invalide du serveur: ${snippet}` : 'Réponse invalide du serveur';
    throw new ApiError(message, { status: response.status, payload });
  }

  const validationErrors = extractValidationErrors(payload);
  const backendMessage = extractBackendMessage(payload);
  const hasSuccessFalse = isRecord(payload) && 'success' in payload && payload.success === false;

  if (!response.ok || hasSuccessFalse) {
    const isAuthError = response.status === 401 || response.status === 403;
    const fallbackMessage = isAuthError ? 'Session expirée. Veuillez vous reconnecter.' : `Erreur (${response.status})`;
    const message = backendMessage || (validationErrors.length ? 'Erreur de validation' : null) || fallbackMessage;

    throw new ApiError(message, {
      status: response.status,
      payload,
      errors: validationErrors.length ? validationErrors : undefined
    });
  }

  return payload;
};

export default function AdminHomepageManagement() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedModuleKey = searchParams?.get('module') ?? '';
  const [moduleData, setModuleData] = useState<Record<string, ModuleItem[]>>({});
  const [moduleLoading, setModuleLoading] = useState<Record<string, boolean>>({});
  const [moduleErrors, setModuleErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referenceLists, setReferenceLists] = useState<{
    restaurants: ModuleItem[];
  }>({
    restaurants: []
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [menuItemsByRestaurant, setMenuItemsByRestaurant] = useState<Record<string, ModuleItem[]>>({});


  const loadModule = useCallback(
    async (config: ModuleDescriptor) => {
      setModuleLoading((previous) => ({ ...previous, [config.key]: true }));
      try {
        const payload = await fetchWithToken(config.fetchEndpoint);
        const list = getArray(payload) as ModuleItem[];
        setModuleData((previous) => ({ ...previous, [config.key]: list }));
        setModuleErrors((previous) => {
          if (!previous[config.key]) {
            return previous;
          }
          const next = { ...previous };
          delete next[config.key];
          return next;
        });
      } catch (fetchError) {
        const message =
          fetchError instanceof Error && fetchError.message ? fetchError.message : `Impossible de charger ${config.title}`;
        setModuleErrors((previous) => ({ ...previous, [config.key]: message }));

        if (fetchError instanceof ApiError && (fetchError.status === 401 || fetchError.status === 403)) {
          setError(message);
          window.setTimeout(() => router.push('/login'), 1200);
        }
      } finally {
        setModuleLoading((previous) => ({ ...previous, [config.key]: false }));
      }
    },
    [router]
  );

  const fetchMenuItemsForRestaurant = useCallback(
    async (restaurantId: string, sourceModuleKey?: string) => {
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
        if (sourceModuleKey) {
          setModuleErrors((previous) => {
            if (!previous[sourceModuleKey]) {
              return previous;
            }
            const next = { ...previous };
            delete next[sourceModuleKey];
            return next;
          });
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : 'Impossible de charger les plats du restaurant';
        if (sourceModuleKey) {
          setModuleErrors((previous) => ({ ...previous, [sourceModuleKey]: message }));
        } else {
          setError(message);
        }
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          window.setTimeout(() => router.push('/login'), 1200);
        }
        // eslint-disable-next-line no-console
        console.error('Erreur lors de la récupération des plats par restaurant :', error);
      }
    },
    [router]
  );

  const moduleConfigs = useMemo(() => {
    return BASE_MODULE_CONFIGS.map((module) => {
      const needsMenuRefresh = module.key === 'recommended' || module.key === 'promotions';
      if (!needsMenuRefresh) {
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
            onValueChange: (value: string | number | boolean, context: ModuleFieldOnChangeContext) => {
              context.setter('menu_item_id', '');
              context.setter('menu_item_ids', '');
              const restaurantValue = String(value ?? '').trim();
              if (restaurantValue) {
                fetchMenuItemsForRestaurant(restaurantValue, module.key);
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
      setModuleErrors({});
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
        const message =
          error instanceof Error && error.message ? error.message : 'Impossible de charger la liste des restaurants';
        setError(message);
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          window.setTimeout(() => router.push('/login'), 1200);
        }
        console.warn('Impossible de charger la liste des restaurants :', error);
      }
    };

    loadReferences();
    return () => {
      active = false;
    };
  }, [fetchWithToken, refreshKey, loading]);

  const combinedReferences = useMemo<ModuleManagerReferences>(
    () =>
      ({
        ...moduleData,
        restaurants: referenceLists.restaurants,
        menuItemsByRestaurant
      } as ModuleManagerReferences),
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
                loadError={moduleErrors[module.key]}
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
