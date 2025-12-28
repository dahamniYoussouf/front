'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api/auth';
import { ArrowLeft, Edit, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';

type Promotion = {
  id: string;
  title: string;
  badge_text?: string | null;
};

type PromotionMenuItem = {
  id: string;
  nom?: string | null;
};

type PromotionOption = {
  id: string;
  title?: string | null;
  badge_text?: string | null;
  scope?: string | null;
  type?: string | null;
  is_active?: boolean;
  menu_item_id?: string | null;
  menu_items?: PromotionMenuItem[];
};

type MenuItem = {
  id: string;
  category_id?: string;
  nom: string;
  description?: string | null;
  prix: number;
  display_price?: number;
  photo_url?: string | null;
  temps_preparation?: number | null;
  is_available: boolean;
  additions?: Addition[];
  promotions?: Promotion[];
};

type Addition = {
  id: string;
  nom: string;
  description?: string | null;
  prix: number;
  is_available: boolean;
};

type AdditionForm = {
  nom: string;
  description: string;
  prix: string;
  is_available: boolean;
};

type AdditionModalMode = "create" | "edit";

type FoodCategory = {
  id: string;
  nom: string;
  description?: string | null;
  icone_url?: string | null;
  ordre_affichage?: number | null;
  items?: MenuItem[];
  items_count?: number;
};

type RestaurantInfo = {
  id: string;
  name: string;
  address?: string | null;
  phone_number?: string | null;
  email?: string | null;
  categories?: string[];
  home_categories?: Array<{ id: string; name: string; slug: string }>;
};

type RestaurantMenuPayload = {
  restaurant_id: string;
  restaurant: RestaurantInfo;
  categories: FoodCategory[];
  total_categories: number;
  total_items: number;
};

type ApiErrorLike = {
  response?: {
    data?: unknown;
  };
  message?: unknown;
};

type ModalType =
  | ''
  | 'create-category'
  | 'edit-category'
  | 'delete-category'
  | 'create-item'
  | 'edit-item'
  | 'delete-item';

type CategoryForm = {
  nom: string;
  description: string;
  icone_url: string;
  ordre_affichage: string;
};

type MenuItemForm = {
  category_id: string;
  nom: string;
  description: string;
  prix: string;
  photo_url: string;
  temps_preparation: string;
  is_available: boolean;
};

type PromotionCreateForm = {
  title: string;
  type: 'percentage' | 'amount' | 'buy_x_get_y' | 'other';
  discount_value: string;
  buy_quantity: string;
  free_quantity: string;
  custom_message: string;
  badge_text: string;
  currency: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const parseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatDA = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} DA`;

const getPromotionLabel = (promotion: {
  id: string;
  title?: string | null;
  badge_text?: string | null;
}) => {
  const title = typeof promotion.title === 'string' ? promotion.title.trim() : '';
  if (title) return title;
  const badge = typeof promotion.badge_text === 'string' ? promotion.badge_text.trim() : '';
  if (badge) return badge;
  return `Promotion ${promotion.id}`;
};

const getPromotionMenuItemIds = (promotion: PromotionOption) => {
  const ids = new Set<string>();
  if (promotion.menu_item_id) {
    ids.add(String(promotion.menu_item_id));
  }
  if (Array.isArray(promotion.menu_items)) {
    promotion.menu_items.forEach((item) => {
      if (item?.id) ids.add(String(item.id));
    });
  }
  return Array.from(ids);
};

const normalizePromotionScope = (scope?: string | null) => String(scope || '').trim().toLowerCase();

const isMenuItemScopedPromotion = (promotion: PromotionOption) => {
  const scope = normalizePromotionScope(promotion.scope);
  const hasMenuItems = Array.isArray(promotion.menu_items) && promotion.menu_items.length > 0;
  if (scope === 'menu_item') return true;
  if (!scope && (hasMenuItems || promotion.menu_item_id)) return true;
  return false;
};

const isPromotionLinkedToItem = (promotion: PromotionOption, menuItemId: string) => {
  if (promotion.menu_item_id && String(promotion.menu_item_id) === menuItemId) {
    return true;
  }
  if (Array.isArray(promotion.menu_items)) {
    return promotion.menu_items.some((item) => String(item.id) === menuItemId);
  }
  return false;
};

const findLinkedPromotion = (promotions: PromotionOption[], menuItemId: string) => {
  const direct = promotions.find(
    (promotion) => promotion.menu_item_id && String(promotion.menu_item_id) === menuItemId
  );
  if (direct) return direct;
  return promotions.find((promotion) => isPromotionLinkedToItem(promotion, menuItemId)) || null;
};

const defaultPromotionCreateForm: PromotionCreateForm = {
  title: '',
  type: 'percentage',
  discount_value: '',
  buy_quantity: '',
  free_quantity: '',
  custom_message: '',
  badge_text: '',
  currency: 'DZD',
  start_date: '',
  end_date: '',
  is_active: true
};

const getApiErrorMessage = (err: unknown, fallback: string) => {
  if (!err || typeof err !== 'object') return fallback;
  const maybe = err as ApiErrorLike;

  const data = maybe.response?.data;
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message;
  return fallback;
};

export default function RestaurantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = String(params.id || '');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [menu, setMenu] = useState<RestaurantMenuPayload | null>(null);
  const [modal, setModal] = useState<ModalType>('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    nom: '',
    description: '',
    icone_url: '',
    ordre_affichage: ''
  });

  const [itemForm, setItemForm] = useState<MenuItemForm>({
    category_id: '',
    nom: '',
    description: '',
    prix: '',
    photo_url: '',
    temps_preparation: '',
    is_available: true
  });

  const [additionModalOpen, setAdditionModalOpen] = useState(false);
  const [additionModalMode, setAdditionModalMode] = useState<AdditionModalMode>('create');
  const [additionModalItem, setAdditionModalItem] = useState<MenuItem | null>(null);
  const [additionModalAddition, setAdditionModalAddition] = useState<Addition | null>(null);
  const [additionForm, setAdditionForm] = useState<AdditionForm>({
    nom: '',
    description: '',
    prix: '',
    is_available: true
  });
  const [additionFormErrors, setAdditionFormErrors] = useState<Record<string, string>>({});
  const [additionModalError, setAdditionModalError] = useState('');
  const [additionSaving, setAdditionSaving] = useState(false);

  const [promotionOptions, setPromotionOptions] = useState<PromotionOption[]>([]);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [promotionError, setPromotionError] = useState('');
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [promotionModalItem, setPromotionModalItem] = useState<MenuItem | null>(null);
  const [promotionSelection, setPromotionSelection] = useState('');
  const [promotionModalError, setPromotionModalError] = useState('');
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotionCreateOpen, setPromotionCreateOpen] = useState(false);
  const [promotionCreateForm, setPromotionCreateForm] =
    useState<PromotionCreateForm>(defaultPromotionCreateForm);
  const [promotionCreateErrors, setPromotionCreateErrors] = useState<Record<string, string>>({});
  const [promotionCreateError, setPromotionCreateError] = useState('');
  const [promotionCreateSaving, setPromotionCreateSaving] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      window.setTimeout(() => setToast(null), 3000);
    },
    []
  );

  const [menuQuery, setMenuQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/restaurant/admin/details/${restaurantId}`, {
        params: { nocache: 'true' }
      });
      setMenu(response.data?.data as RestaurantMenuPayload);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Erreur lors du chargement du menu'));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const loadPromotions = useCallback(async () => {
    if (!restaurantId) return;
    setPromotionLoading(true);
    setPromotionError('');
    try {
      const response = await apiClient.get('/admin/promotions', {
        params: { restaurant_id: restaurantId, nocache: 'true' }
      });
      const data = response.data?.data;
      setPromotionOptions(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setPromotionError(getApiErrorMessage(err, 'Erreur lors du chargement des promotions'));
    } finally {
      setPromotionLoading(false);
    }
  }, [restaurantId]);

  React.useEffect(() => {
    loadMenu();
    loadPromotions();
  }, [loadMenu, loadPromotions]);

  const restaurant = menu?.restaurant;
  const categories = useMemo(() => menu?.categories || [], [menu]);
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const ao = a.ordre_affichage ?? Number.MAX_SAFE_INTEGER;
      const bo = b.ordre_affichage ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.nom || '').localeCompare(b.nom || '');
    });
  }, [categories]);

  const menuStats = useMemo(() => {
    const items = sortedCategories.flatMap((category) => category.items || []);
    const totalItems = items.length;
    const availableItems = items.filter((item) => item.is_available).length;
    const totalAdditions = items.reduce((sum, item) => sum + (item.additions?.length ?? 0), 0);

    return {
      totalCategories: sortedCategories.length,
      totalItems,
      availableItems,
      unavailableItems: totalItems - availableItems,
      totalAdditions
    };
  }, [sortedCategories]);

  const visibleCategories = useMemo(() => {
    const query = menuQuery.trim().toLowerCase();
    const hasSearch = query.length > 0;

    const matches = (value?: string | null) =>
      !hasSearch ? true : (value || '').toLowerCase().includes(query);

    const availabilityPredicate = (item: MenuItem) => {
      if (availabilityFilter === 'available') return item.is_available;
      if (availabilityFilter === 'unavailable') return !item.is_available;
      return true;
    };

    const itemMatchesQuery = (item: MenuItem) => {
      if (!hasSearch) return true;
      if (matches(item.nom) || matches(item.description)) return true;
      if (item.promotions?.some((promo) => matches(promo.title) || matches(promo.badge_text))) {
        return true;
      }
      if (item.additions?.some((addition) => matches(addition.nom) || matches(addition.description))) {
        return true;
      }
      return false;
    };

    return sortedCategories
      .map((category) => {
        const baseItems = (category.items || []).filter(availabilityPredicate);
        if (!hasSearch) {
          return { ...category, items: baseItems };
        }

        const categoryMatches = matches(category.nom) || matches(category.description);
        if (categoryMatches) {
          return { ...category, items: baseItems };
        }

        const items = baseItems.filter(itemMatchesQuery);
        if (items.length === 0) return null;
        return { ...category, items };
      })
      .filter(Boolean) as FoodCategory[];
  }, [sortedCategories, menuQuery, availabilityFilter]);

  const visibleItemsCount = useMemo(() => {
    return visibleCategories.reduce((sum, category) => sum + (category.items?.length ?? 0), 0);
  }, [visibleCategories]);

  const hasFilters = menuQuery.trim().length > 0 || availabilityFilter !== 'all';

  const editablePromotions = useMemo(() => {
    const allowedTypes = new Set(['percentage', 'amount', 'buy_x_get_y', 'other']);
    return [...promotionOptions]
      .filter((promotion) => {
        const type = String(promotion.type || '').toLowerCase();
        const hasAllowedType = !type || allowedTypes.has(type);
        const canTargetItem = isMenuItemScopedPromotion(promotion);
        return hasAllowedType && canTargetItem && !promotion.menu_item_id;
      })
      .sort((a, b) => {
        const aInactive = a.is_active === false ? 1 : 0;
        const bInactive = b.is_active === false ? 1 : 0;
        if (aInactive !== bInactive) return aInactive - bInactive;
        return getPromotionLabel(a).localeCompare(getPromotionLabel(b), 'fr');
      });
  }, [promotionOptions]);

  const linkedPromotion = useMemo(() => {
    if (!promotionModalItem) return null;
    return findLinkedPromotion(promotionOptions, String(promotionModalItem.id));
  }, [promotionModalItem, promotionOptions]);

  const lockedPromotion = useMemo(() => {
    if (!linkedPromotion) return null;
    if (linkedPromotion.menu_item_id) return linkedPromotion;
    if (!editablePromotions.some((promo) => promo.id === linkedPromotion.id)) {
      return linkedPromotion;
    }
    return null;
  }, [linkedPromotion, editablePromotions]);

  const currentEditablePromotionId = useMemo(() => {
    if (linkedPromotion && editablePromotions.some((promo) => promo.id === linkedPromotion.id)) {
      return linkedPromotion.id;
    }
    return '';
  }, [linkedPromotion, editablePromotions]);

  const currentPromotionId = useMemo(
    () => (lockedPromotion?.id ? lockedPromotion.id : currentEditablePromotionId),
    [lockedPromotion, currentEditablePromotionId]
  );

  const promotionSelectOptions = useMemo(() => {
    const options = [...editablePromotions];
    if (lockedPromotion && !options.some((promo) => promo.id === lockedPromotion.id)) {
      options.unshift(lockedPromotion);
    }
    return options;
  }, [editablePromotions, lockedPromotion]);

  React.useEffect(() => {
    if (!promotionModalOpen || !promotionModalItem) return;
    setPromotionSelection((prev) => (prev ? prev : currentPromotionId || ''));
  }, [promotionModalOpen, promotionModalItem, currentPromotionId]);

  const closeModal = () => {
    setModal('');
    setSelectedCategory(null);
    setSelectedItem(null);
    setModalError('');
  };

  const openCreateCategory = () => {
    setSelectedCategory(null);
    setCategoryForm({ nom: '', description: '', icone_url: '', ordre_affichage: '' });
    setModalError('');
    setModal('create-category');
  };

  const openEditCategory = (category: FoodCategory) => {
    setSelectedCategory(category);
    setCategoryForm({
      nom: category.nom || '',
      description: category.description || '',
      icone_url: category.icone_url || '',
      ordre_affichage: category.ordre_affichage != null ? String(category.ordre_affichage) : ''
    });
    setModalError('');
    setModal('edit-category');
  };

  const openDeleteCategory = (category: FoodCategory) => {
    setSelectedCategory(category);
    setModalError('');
    setModal('delete-category');
  };

  const openCreateItem = (categoryId: string) => {
    setSelectedItem(null);
    setItemForm({
      category_id: categoryId,
      nom: '',
      description: '',
      prix: '',
      photo_url: '',
      temps_preparation: '',
      is_available: true
    });
    setModalError('');
    setModal('create-item');
  };

  const openEditItem = (item: MenuItem, fallbackCategoryId?: string) => {
    setSelectedItem(item);
    setItemForm({
      category_id: item.category_id || fallbackCategoryId || '',
      nom: item.nom || '',
      description: item.description || '',
      prix: String(item.prix ?? ''),
      photo_url: item.photo_url || '',
      temps_preparation: item.temps_preparation != null ? String(item.temps_preparation) : '',
      is_available: !!item.is_available
    });
    setModalError('');
    setModal('edit-item');
  };

  const openDeleteItem = (item: MenuItem) => {
    setSelectedItem(item);
    setModalError('');
    setModal('delete-item');
  };

  const onCreateCategory = async () => {
    if (!restaurantId) return;
    setSaving(true);
    setModalError('');
    try {
      await apiClient.post(`/api/v1/food-categories/admin/restaurant/${restaurantId}`, {
        nom: categoryForm.nom,
        description: categoryForm.description || undefined,
        icone_url: categoryForm.icone_url || undefined,
        ordre_affichage: parseNumber(categoryForm.ordre_affichage)
      });
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la creation'));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateCategory = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    setModalError('');
    try {
      await apiClient.put(`/api/v1/food-categories/admin/${selectedCategory.id}`, {
        nom: categoryForm.nom,
        description: categoryForm.description || undefined,
        icone_url: categoryForm.icone_url || undefined,
        ordre_affichage: parseNumber(categoryForm.ordre_affichage)
      });
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la mise a jour'));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCategory = async () => {
    if (!selectedCategory) return;
    setSaving(true);
    setModalError('');
    try {
      await apiClient.delete(`/api/v1/food-categories/admin/${selectedCategory.id}`);
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setSaving(false);
    }
  };

  const onCreateItem = async () => {
    setSaving(true);
    setModalError('');
    try {
      if (!itemForm.category_id) {
        setModalError('Veuillez choisir une categorie.');
        return;
      }
      const prix = parseNumber(itemForm.prix);
      if (prix == null) {
        setModalError('Veuillez entrer un prix valide.');
        return;
      }
      await apiClient.post(`/menuitem/admin/create`, {
        category_id: itemForm.category_id,
        nom: itemForm.nom,
        description: itemForm.description || undefined,
        prix,
        photo_url: itemForm.photo_url || undefined,
        temps_preparation: parseNumber(itemForm.temps_preparation),
        is_available: itemForm.is_available
      });
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la creation'));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateItem = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setModalError('');
    try {
      if (!itemForm.category_id) {
        setModalError('Veuillez choisir une categorie.');
        return;
      }
      const prix = parseNumber(itemForm.prix);
      if (prix == null) {
        setModalError('Veuillez entrer un prix valide.');
        return;
      }
      await apiClient.put(`/menuitem/admin/update/${selectedItem.id}`, {
        category_id: itemForm.category_id,
        nom: itemForm.nom,
        description: itemForm.description || undefined,
        prix,
        photo_url: itemForm.photo_url || undefined,
        temps_preparation: parseNumber(itemForm.temps_preparation),
        is_available: itemForm.is_available
      });
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la mise a jour'));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteItem = async () => {
    if (!selectedItem) return;
    setSaving(true);
    setModalError('');
    try {
      await apiClient.delete(`/menuitem/admin/delete/${selectedItem.id}`);
      closeModal();
      await loadMenu();
    } catch (err: unknown) {
      setModalError(getApiErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setSaving(false);
    }
  };

  const onToggleAvailability = async (itemId: string) => {
    setSaving(true);
    setError('');
    try {
      await apiClient.patch(`/menuitem/admin/toggle-availability/${itemId}`);
      await loadMenu();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Erreur lors du changement d'etat"));
    } finally {
      setSaving(false);
    }
  };

  const openPromotionModal = (item: MenuItem) => {
    setPromotionModalItem(item);
    setPromotionSelection('');
    setPromotionModalError('');
    setPromotionCreateOpen(false);
    setPromotionCreateForm(defaultPromotionCreateForm);
    setPromotionCreateErrors({});
    setPromotionCreateError('');
    setPromotionModalOpen(true);
  };

  const closePromotionModal = () => {
    setPromotionModalOpen(false);
    setPromotionModalItem(null);
    setPromotionSelection('');
    setPromotionModalError('');
    setPromotionCreateOpen(false);
    setPromotionCreateForm(defaultPromotionCreateForm);
    setPromotionCreateErrors({});
    setPromotionCreateError('');
  };

  const updatePromotionMenuItems = async (
    promotion: PromotionOption,
    menuItemIds: string[],
    directMenuItemId?: string | null
  ) => {
    const payload: Record<string, unknown> = {
      menu_item_ids: menuItemIds
    };
    if (directMenuItemId !== undefined) {
      payload.menu_item_id = directMenuItemId;
    }
    await apiClient.put(`/admin/promotions/${promotion.id}`, payload);
  };

  const handlePromotionSave = async () => {
    if (!promotionModalItem) return;
    const currentPromotionId = lockedPromotion?.id || currentEditablePromotionId;
    if ((promotionSelection || '') === (currentPromotionId || '')) {
      closePromotionModal();
      return;
    }

    setPromotionSaving(true);
    setPromotionModalError('');
    try {
      const currentPromotion = currentPromotionId
        ? promotionOptions.find((promo) => promo.id === currentPromotionId) || lockedPromotion
        : null;

      if (currentPromotion) {
        const nextIds = getPromotionMenuItemIds(currentPromotion).filter(
          (id) => id !== promotionModalItem.id
        );
        const shouldClearDirect = Boolean(currentPromotion.menu_item_id);
        await updatePromotionMenuItems(
          currentPromotion,
          nextIds,
          shouldClearDirect ? null : undefined
        );
      }

      if (promotionSelection) {
        const nextPromotion =
          promotionOptions.find((promo) => promo.id === promotionSelection) ||
          editablePromotions.find((promo) => promo.id === promotionSelection);
        if (!nextPromotion) {
          throw new Error('Promotion introuvable');
        }
        const nextIds = getPromotionMenuItemIds(nextPromotion);
        if (!nextIds.includes(promotionModalItem.id)) {
          nextIds.push(promotionModalItem.id);
        }
        await updatePromotionMenuItems(nextPromotion, nextIds);
      }

      showNotification('Promotions mises a jour');
      closePromotionModal();
      await loadMenu();
      await loadPromotions();
    } catch (err: unknown) {
      setPromotionModalError(getApiErrorMessage(err, 'Erreur lors de la mise a jour des promotions'));
    } finally {
      setPromotionSaving(false);
    }
  };

  const handlePromotionCreate = async () => {
    if (!promotionModalItem) return;
    const errors: Record<string, string> = {};
    const title = promotionCreateForm.title.trim();
    const type = promotionCreateForm.type;

    if (!title) {
      errors.title = 'Le titre est obligatoire';
    }

    if (type === 'percentage' || type === 'amount') {
      const discountValue = parseNumber(promotionCreateForm.discount_value);
      if (discountValue === undefined || discountValue <= 0) {
        errors.discount_value = 'Valeur de reduction invalide';
      }
    }

    if (type === 'buy_x_get_y') {
      const buyValue = Number.parseInt(promotionCreateForm.buy_quantity, 10);
      const freeValue = Number.parseInt(promotionCreateForm.free_quantity, 10);
      if (!Number.isFinite(buyValue) || buyValue < 1) {
        errors.buy_quantity = 'Quantite a acheter invalide';
      }
      if (!Number.isFinite(freeValue) || freeValue < 1) {
        errors.free_quantity = 'Quantite offerte invalide';
      }
    }

    if (type === 'other' && !promotionCreateForm.custom_message.trim()) {
      errors.custom_message = 'Le message est obligatoire pour ce type';
    }

    if (promotionCreateForm.start_date && promotionCreateForm.end_date) {
      const start = new Date(promotionCreateForm.start_date);
      const end = new Date(promotionCreateForm.end_date);
      if (!(end > start)) {
        errors.end_date = 'La date de fin doit etre apres la date de debut';
      }
    }

    if (Object.keys(errors).length > 0) {
      setPromotionCreateErrors(errors);
      return;
    }

    setPromotionCreateSaving(true);
    setPromotionCreateError('');
    setPromotionCreateErrors({});
    try {
      const payload: Record<string, unknown> = {
        title,
        type,
        scope: 'menu_item',
        restaurant_id: restaurantId,
        is_active: promotionCreateForm.is_active
      };

      const badgeText = promotionCreateForm.badge_text.trim();
      if (badgeText) {
        payload.badge_text = badgeText;
      }

      const startDate = promotionCreateForm.start_date.trim();
      if (startDate) {
        payload.start_date = startDate;
      }

      const endDate = promotionCreateForm.end_date.trim();
      if (endDate) {
        payload.end_date = endDate;
      }

      const customMessage = promotionCreateForm.custom_message.trim();
      if (customMessage) {
        payload.custom_message = customMessage;
      }

      if (type === 'percentage' || type === 'amount') {
        payload.discount_value = parseNumber(promotionCreateForm.discount_value);
        if (type === 'amount' && promotionCreateForm.currency.trim()) {
          payload.currency = promotionCreateForm.currency.trim();
        }
      }

      if (type === 'buy_x_get_y') {
        payload.menu_item_id = promotionModalItem.id;
        payload.buy_quantity = Number.parseInt(promotionCreateForm.buy_quantity, 10);
        payload.free_quantity = Number.parseInt(promotionCreateForm.free_quantity, 10);
      } else {
        payload.menu_item_ids = [promotionModalItem.id];
      }

      const response = await apiClient.post('/admin/promotions', payload);
      const created = response.data?.data as PromotionOption | undefined;

      showNotification('Promotion creee');
      setPromotionCreateOpen(false);
      setPromotionCreateForm(defaultPromotionCreateForm);
      await loadMenu();
      await loadPromotions();

      if (created?.menu_item_id) {
        setPromotionSelection('');
      } else if (created?.id) {
        setPromotionSelection(String(created.id));
      }
    } catch (err: unknown) {
      setPromotionCreateError(getApiErrorMessage(err, 'Erreur lors de la creation de la promotion'));
    } finally {
      setPromotionCreateSaving(false);
    }
  };

  const openAdditionModal = (
    item: MenuItem,
    mode: AdditionModalMode,
    addition?: Addition
  ) => {
    setAdditionModalMode(mode);
    setAdditionModalItem(item);
    setAdditionModalAddition(addition || null);
    setAdditionForm({
      nom: addition?.nom || '',
      description: addition?.description || '',
      prix: addition ? String(addition.prix) : '',
      is_available: addition?.is_available ?? true
    });
    setAdditionFormErrors({});
    setAdditionModalError('');
    setAdditionModalOpen(true);
  };

  const closeAdditionModal = () => {
    setAdditionModalOpen(false);
    setAdditionModalItem(null);
    setAdditionModalAddition(null);
    setAdditionModalError('');
  };

  const createAddition = async (menuItemId: string, payload: {
    nom: string;
    description?: string;
    prix: number;
    is_available: boolean;
  }) => {
    await apiClient.post(`/api/v1/additions/admin/create`, {
      restaurant_id: restaurantId,
      menu_item_id: menuItemId,
      ...payload
    });
  };

  const updateAddition = async (additionId: string, payload: {
    nom: string;
    description?: string;
    prix: number;
    is_available: boolean;
  }) => {
    await apiClient.put(`/api/v1/additions/admin/update/${additionId}`, {
      restaurant_id: restaurantId,
      ...payload
    });
  };

  const deleteAddition = async (additionId: string) => {
    await apiClient.delete(`/api/v1/additions/admin/delete/${additionId}`, {
      data: { restaurant_id: restaurantId }
    });
  };

  const handleAdditionSubmit = async () => {
    if (!additionModalItem) return;
    const errors: Record<string, string> = {};
    if (!additionForm.nom.trim()) {
      errors.nom = 'Le nom est obligatoire';
    }
    const prixValue = parseFloat(additionForm.prix);
    if (Number.isNaN(prixValue)) {
      errors.prix = 'Prix invalide';
    } else if (prixValue < 0) {
      errors.prix = 'Le prix doit être positif';
    }

    if (Object.keys(errors).length > 0) {
      setAdditionFormErrors(errors);
      return;
    }

    setAdditionSaving(true);
    setAdditionModalError('');
    try {
      const payload = {
        nom: additionForm.nom.trim(),
        description: additionForm.description.trim() || undefined,
        prix: prixValue,
        is_available: additionForm.is_available
      };

      if (additionModalMode === 'create') {
        await createAddition(additionModalItem.id, payload);
        showNotification('Addition creee avec succes');
      } else if (additionModalAddition) {
        await updateAddition(additionModalAddition.id, payload);
        showNotification('Addition mise a jour');
      }

      closeAdditionModal();
      await loadMenu();
    } catch (err: unknown) {
      setAdditionModalError(getApiErrorMessage(err, 'Erreur lors de la sauvegarde'));
    } finally {
      setAdditionSaving(false);
    }
  };

  const handleDeleteAddition = async (additionId: string) => {
    if (!window.confirm('Supprimer cette addition ?')) return;
    setAdditionSaving(true);
    setAdditionModalError('');
    try {
      await deleteAddition(additionId);
      showNotification('Addition supprimee');
      await loadMenu();
    } catch (err: unknown) {
      setAdditionModalError(getApiErrorMessage(err, 'Erreur lors de la suppression'));
    } finally {
      setAdditionSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/restaurants')}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
          title="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={loadMenu}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
          title="Rafraichir"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {toast ? (
        <div
          className={`fixed right-4 top-4 z-[60] rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-100'
              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {additionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <div className="font-semibold text-gray-900 dark:text-slate-100">
                {additionModalMode === 'create' ? 'Ajouter une addition' : 'Modifier l&apos;addition'}
              </div>
              <button
                type="button"
                onClick={closeAdditionModal}
                className="rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {additionModalError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {additionModalError}
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Nom
                </label>
                <input
                  value={additionForm.nom}
                  onChange={(e) =>
                    setAdditionForm((prev) => ({ ...prev, nom: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Ex: Fromage supplémentaire"
                />
                {additionFormErrors.nom ? (
                  <p className="text-xs text-red-500 mt-1">{additionFormErrors.nom}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Prix (DA)
                </label>
                <input
                  value={additionForm.prix}
                  onChange={(e) =>
                    setAdditionForm((prev) => ({ ...prev, prix: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="250"
                  inputMode="decimal"
                />
                {additionFormErrors.prix ? (
                  <p className="text-xs text-red-500 mt-1">{additionFormErrors.prix}</p>
                ) : null}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Description
                </label>
                <textarea
                  value={additionForm.description}
                  onChange={(e) =>
                    setAdditionForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  placeholder="Optionnel"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={additionForm.is_available}
                  onChange={(e) =>
                    setAdditionForm((prev) => ({ ...prev, is_available: e.target.checked }))
                  }
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                />
                Disponible
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={closeAdditionModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                disabled={additionSaving}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleAdditionSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                disabled={additionSaving}
              >
                <Save className="h-4 w-4" />
                {additionModalMode === 'create' ? 'Ajouter' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {promotionModalOpen && promotionModalItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <div className="font-semibold text-gray-900 dark:text-slate-100">Promotions du plat</div>
              <button
                type="button"
                onClick={closePromotionModal}
                className="rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {promotionModalError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {promotionModalError}
                </div>
              ) : null}

              {promotionError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {promotionError}
                </div>
              ) : null}

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                Plat: <span className="font-medium">{promotionModalItem.nom}</span>
              </div>

              {lockedPromotion ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                  {lockedPromotion.menu_item_id ? 'Promotion liee via menu_item_id' : 'Promotion actuelle'}
                  {`: ${getPromotionLabel(lockedPromotion)}`}
                  <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-200">
                    Choisissez "Aucune promotion" pour la detacher ou liez une autre promotion.
                  </div>
                </div>
              ) : null}

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  Promotion associee
                </label>
                <select
                  value={promotionSelection}
                  onChange={(e) => setPromotionSelection(e.target.value)}
                  disabled={
                    promotionLoading ||
                    promotionSaving ||
                    promotionCreateSaving ||
                    promotionSelectOptions.length === 0
                  }
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">Aucune promotion</option>
                  {promotionSelectOptions.map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {getPromotionLabel(promo)}
                      {promo.is_active === false ? ' (inactive)' : ''}
                      {lockedPromotion && promo.id === lockedPromotion.id ? ' (verrouillee)' : ''}
                    </option>
                  ))}
                </select>
                {promotionLoading ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Chargement des promotions...
                  </p>
                ) : null}
                {!promotionLoading && editablePromotions.length === 0 && !lockedPromotion ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Aucune promotion modifiable pour ce restaurant.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    Nouvelle promotion
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromotionCreateOpen((prev) => !prev)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    disabled={promotionCreateSaving}
                  >
                    {promotionCreateOpen ? 'Masquer' : 'Ajouter'}
                  </button>
                </div>

                {promotionCreateOpen ? (
                  <div className="mt-3 space-y-3">
                    {promotionCreateError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                        {promotionCreateError}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Titre
                        </label>
                        <input
                          value={promotionCreateForm.title}
                          onChange={(e) =>
                            setPromotionCreateForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          placeholder="Ex: -20% sur le tacos"
                        />
                        {promotionCreateErrors.title ? (
                          <p className="mt-1 text-xs text-red-500">{promotionCreateErrors.title}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Type
                        </label>
                        <select
                          value={promotionCreateForm.type}
                          onChange={(e) =>
                            setPromotionCreateForm((prev) => ({
                              ...prev,
                              type: e.target.value as PromotionCreateForm['type']
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        >
                          <option value="percentage">Pourcentage</option>
                          <option value="amount">Montant</option>
                          <option value="buy_x_get_y">Acheter X, obtenir Y</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>

                      {promotionCreateForm.type === 'amount' ? (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                            Devise
                          </label>
                          <input
                            value={promotionCreateForm.currency}
                            onChange={(e) =>
                              setPromotionCreateForm((prev) => ({ ...prev, currency: e.target.value }))
                            }
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            placeholder="DZD"
                          />
                        </div>
                      ) : null}

                      {(promotionCreateForm.type === 'percentage' ||
                        promotionCreateForm.type === 'amount') && (
                        <div>
                          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                            Valeur reduction
                          </label>
                          <input
                            value={promotionCreateForm.discount_value}
                            onChange={(e) =>
                              setPromotionCreateForm((prev) => ({
                                ...prev,
                                discount_value: e.target.value
                              }))
                            }
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            placeholder={promotionCreateForm.type === 'percentage' ? '20' : '300'}
                            inputMode="decimal"
                          />
                          {promotionCreateErrors.discount_value ? (
                            <p className="mt-1 text-xs text-red-500">
                              {promotionCreateErrors.discount_value}
                            </p>
                          ) : null}
                        </div>
                      )}

                      {promotionCreateForm.type === 'buy_x_get_y' ? (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                              Quantite a acheter
                            </label>
                            <input
                              value={promotionCreateForm.buy_quantity}
                              onChange={(e) =>
                                setPromotionCreateForm((prev) => ({
                                  ...prev,
                                  buy_quantity: e.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              placeholder="2"
                              inputMode="numeric"
                            />
                            {promotionCreateErrors.buy_quantity ? (
                              <p className="mt-1 text-xs text-red-500">
                                {promotionCreateErrors.buy_quantity}
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                              Quantite offerte
                            </label>
                            <input
                              value={promotionCreateForm.free_quantity}
                              onChange={(e) =>
                                setPromotionCreateForm((prev) => ({
                                  ...prev,
                                  free_quantity: e.target.value
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                              placeholder="1"
                              inputMode="numeric"
                            />
                            {promotionCreateErrors.free_quantity ? (
                              <p className="mt-1 text-xs text-red-500">
                                {promotionCreateErrors.free_quantity}
                              </p>
                            ) : null}
                          </div>
                        </>
                      ) : null}

                      {(promotionCreateForm.type === 'other' ||
                        promotionCreateForm.type === 'buy_x_get_y') && (
                        <div className="sm:col-span-2">
                          <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                            Message
                          </label>
                          <textarea
                            value={promotionCreateForm.custom_message}
                            onChange={(e) =>
                              setPromotionCreateForm((prev) => ({
                                ...prev,
                                custom_message: e.target.value
                              }))
                            }
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                            placeholder="Ex: 2 achetes, 1 offert"
                          />
                          {promotionCreateErrors.custom_message ? (
                            <p className="mt-1 text-xs text-red-500">
                              {promotionCreateErrors.custom_message}
                            </p>
                          ) : null}
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Badge (optionnel)
                        </label>
                        <input
                          value={promotionCreateForm.badge_text}
                          onChange={(e) =>
                            setPromotionCreateForm((prev) => ({
                              ...prev,
                              badge_text: e.target.value
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                          placeholder="Ex: -20%"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Debut
                        </label>
                        <input
                          type="datetime-local"
                          value={promotionCreateForm.start_date}
                          onChange={(e) =>
                            setPromotionCreateForm((prev) => ({
                              ...prev,
                              start_date: e.target.value
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                          Fin
                        </label>
                        <input
                          type="datetime-local"
                          value={promotionCreateForm.end_date}
                          onChange={(e) =>
                            setPromotionCreateForm((prev) => ({
                              ...prev,
                              end_date: e.target.value
                            }))
                          }
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        />
                        {promotionCreateErrors.end_date ? (
                          <p className="mt-1 text-xs text-red-500">
                            {promotionCreateErrors.end_date}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={promotionCreateForm.is_active}
                        onChange={(e) =>
                          setPromotionCreateForm((prev) => ({
                            ...prev,
                            is_active: e.target.checked
                          }))
                        }
                        className="h-4 w-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500"
                      />
                      Promotion active
                    </label>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handlePromotionCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={promotionCreateSaving}
                      >
                        <Plus className="h-4 w-4" />
                        {promotionCreateSaving ? 'Creation...' : 'Creer et lier'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={closePromotionModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                disabled={promotionSaving || promotionCreateSaving}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePromotionSave}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                disabled={
                  promotionSaving ||
                  promotionLoading ||
                  promotionCreateSaving ||
                  promotionSelection === currentPromotionId
                }
              >
                {promotionSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              {restaurant?.name || 'Restaurant'}
            </h1>

            <div className="mt-1 space-y-1 text-sm text-gray-600 dark:text-slate-300">
              {restaurant?.address ? <div>{restaurant.address}</div> : null}
              {restaurant?.phone_number ? <div>{restaurant.phone_number}</div> : null}
              {restaurant?.email ? <div>{restaurant.email}</div> : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                ID: {restaurantId}
              </span>

              {restaurant?.home_categories?.length ? (
                <>
                  <span className="text-gray-500 dark:text-slate-400">Categories globales:</span>
                  {restaurant.home_categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200"
                      title={cat.slug}
                    >
                      {cat.name}
                    </span>
                  ))}
                </>
              ) : null}

              {restaurant?.categories?.length ? (
                <span className="text-gray-500 dark:text-slate-400">
                  Slugs: {restaurant.categories.join(', ')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950">
              <div className="text-xs text-gray-500 dark:text-slate-400">Categories</div>
              <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {menuStats.totalCategories}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950">
              <div className="text-xs text-gray-500 dark:text-slate-400">Plats</div>
              <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {menuStats.totalItems}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950">
              <div className="text-xs text-gray-500 dark:text-slate-400">Disponibles</div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-200">
                {menuStats.availableItems}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-950">
              <div className="text-xs text-gray-500 dark:text-slate-400">Indisponibles</div>
              <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {menuStats.unavailableItems}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                Rechercher (plat / addition / promo)
              </label>
              <input
                value={menuQuery}
                onChange={(e) => setMenuQuery(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="Ex: tacos, fromage, -20%..."
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                Disponibilité
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) =>
                  setAvailabilityFilter(e.target.value as 'all' | 'available' | 'unavailable')
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">Tous les plats</option>
                <option value="available">Disponibles</option>
                <option value="unavailable">Indisponibles</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMenuQuery('');
                setAvailabilityFilter('all');
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              disabled={loading || saving}
            >
              Reinitialiser
            </button>

            <button
              type="button"
              onClick={openCreateCategory}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={loading || saving}
            >
              <Plus className="h-4 w-4" />
              Ajouter categorie
            </button>
          </div>
        </div>

        {hasFilters ? (
          <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            Affichage: {visibleCategories.length} categories / {visibleItemsCount} plats (sur{' '}
            {menuStats.totalCategories} / {menuStats.totalItems})
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-slate-300">Chargement...</div>
        ) : sortedCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
            Aucune categorie de menu pour ce restaurant.
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
            Aucun resultat pour ces filtres.
          </div>
        ) : (
          visibleCategories.map((category) => {
            const items = category.items || [];
            return (
              <div
                key={category.id}
                className="rounded-xl border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-700"
              >
                <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      {category.nom}
                    </div>
                    {category.description ? (
                      <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                        {category.description}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                      <span>{items.length} plats</span>
                      {category.ordre_affichage != null ? (
                        <span>Ordre: {category.ordre_affichage}</span>
                      ) : null}
                      {category.icone_url ? (
                        <a
                          href={category.icone_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline dark:text-indigo-300"
                        >
                          Icone
                        </a>
                      ) : null}
                      <span className="font-mono">ID: {category.id}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openCreateItem(category.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      disabled={saving}
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter plat
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditCategory(category)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                      disabled={saving}
                    >
                      <Edit className="h-4 w-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteCategory(category)}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/20"
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </button>
                  </div>
                </div>

              

                <div className="p-4">
                  {items.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-300">
                      Aucun plat dans cette categorie.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              {item.photo_url ? (
                                <img
                                  src={item.photo_url}
                                  alt={item.nom}
                                  className="h-16 w-16 flex-none rounded-lg object-cover"
                                />
                              ) : (
                                <div className="h-16 w-16 flex-none rounded-lg bg-gray-100 dark:bg-slate-800" />
                              )}

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate font-semibold text-gray-900 dark:text-slate-100">
                                    {item.nom}
                                  </div>
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.is_available
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                        : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {item.is_available ? 'Disponible' : 'Indisponible'}
                                  </span>
                                  {item.promotions?.length
                                    ? item.promotions.map((promo) => (
                                        <span
                                          key={promo.id}
                                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                          title={promo.title}
                                        >
                                          {promo.badge_text || promo.title}
                                        </span>
                                      ))
                                    : null}
                                </div>

                                {item.description ? (
                                  <div className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                                    {item.description}
                                  </div>
                                ) : null}

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700 dark:text-slate-200">
                                  <span>Prix: {formatDA(item.display_price ?? item.prix)}</span>
                                  {item.temps_preparation != null ? (
                                    <span>Preparation: {item.temps_preparation} min</span>
                                  ) : null}
                                  <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                    ID: {item.id}
                                  </span>
                                </div>

                                {item.photo_url ? (
                                  <a
                                    href={item.photo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block text-xs text-indigo-600 hover:underline dark:text-indigo-300"
                                  >
                                    Ouvrir la photo
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onToggleAvailability(item.id)}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                disabled={saving}
                              >
                                {item.is_available ? 'Desactiver' : 'Activer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openAdditionModal(item, 'create')}
                                className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-900/40 dark:text-indigo-200 dark:hover:bg-indigo-900/20"
                                disabled={saving}
                              >
                                Ajouter addition
                              </button>
                              <button
                                type="button"
                                onClick={() => openPromotionModal(item)}
                                className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60 dark:border-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/20"
                                disabled={saving}
                              >
                                Promotions
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditItem(item, category.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                                disabled={saving}
                              >
                                <Edit className="h-4 w-4" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteItem(item)}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-900/20"
                                disabled={saving}
                              >
                                <Trash2 className="h-4 w-4" />
                                Supprimer
                              </button>
                            </div>
                          </div>

                          <details className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-900/50">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                              Additions ({item.additions?.length ?? 0})
                            </summary>
                            <div className="px-3 pb-3">
                              {item.additions && item.additions.length > 0 ? (
                                <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-100">
                                  {item.additions.map((addition) => (
                                    <div
                                      key={addition.id}
                                      className="flex flex-col gap-1 rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800"
                                    >
                                      <div className="flex items-center justify-between gap-2 text-sm font-medium text-gray-900 dark:text-slate-100">
                                        <span className="truncate">{addition.nom}</span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            addition.is_available
                                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                                              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                                          }`}
                                        >
                                          {addition.is_available ? 'Disponible' : 'Indisponible'}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap justify-between gap-2">
                                        <span className="text-gray-500 dark:text-slate-400">
                                          {formatDA(addition.prix)}
                                        </span>
                                        <div className="flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => openAdditionModal(item, 'edit', addition)}
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300"
                                          >
                                            Modifier
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteAddition(addition.id)}
                                            className="text-xs font-medium text-red-600 hover:text-red-500 dark:text-red-400"
                                          >
                                            Supprimer
                                          </button>
                                        </div>
                                      </div>
                                      {addition.description ? (
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                          {addition.description}
                                        </div>
                                      ) : null}
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        ID: {addition.id}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 text-xs italic text-gray-500 dark:text-slate-400">
                                  Aucune addition pour ce plat.
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
              <div className="font-semibold text-gray-900 dark:text-slate-100">
                {modal === 'create-category'
                  ? 'Creer une categorie'
                  : modal === 'edit-category'
                  ? 'Modifier la categorie'
                  : modal === 'delete-category'
                  ? 'Supprimer la categorie'
                  : modal === 'create-item'
                  ? 'Creer un plat'
                  : modal === 'edit-item'
                  ? 'Modifier le plat'
                  : 'Supprimer le plat'}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {modalError ? (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                  {modalError}
                </div>
              ) : null}

              {modal === 'create-category' || modal === 'edit-category' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Nom
                    </label>
                    <input
                      value={categoryForm.nom}
                      onChange={(e) => setCategoryForm((p) => ({ ...p, nom: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="Ex: Tacos"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Description
                    </label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm((p) => ({ ...p, description: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      rows={3}
                      placeholder="Optionnel"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Icone URL
                      </label>
                      <input
                        value={categoryForm.icone_url}
                        onChange={(e) =>
                          setCategoryForm((p) => ({ ...p, icone_url: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Ordre d&apos;affichage
                      </label>
                      <input
                        value={categoryForm.ordre_affichage}
                        onChange={(e) =>
                          setCategoryForm((p) => ({ ...p, ordre_affichage: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {modal === 'create-item' || modal === 'edit-item' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Categorie
                      </label>
                      <select
                        value={itemForm.category_id}
                        onChange={(e) => setItemForm((p) => ({ ...p, category_id: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      >
                        <option value="">Choisir...</option>
                        {sortedCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Prix (DA)
                      </label>
                      <input
                        value={itemForm.prix}
                        onChange={(e) => setItemForm((p) => ({ ...p, prix: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="1200"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Nom
                    </label>
                    <input
                      value={itemForm.nom}
                      onChange={(e) => setItemForm((p) => ({ ...p, nom: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      placeholder="Ex: Tacos mixte"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                      Description
                    </label>
                    <textarea
                      value={itemForm.description}
                      onChange={(e) =>
                        setItemForm((p) => ({ ...p, description: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      rows={3}
                      placeholder="Optionnel"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Photo URL
                      </label>
                      <input
                        value={itemForm.photo_url}
                        onChange={(e) => setItemForm((p) => ({ ...p, photo_url: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        Temps preparation (min)
                      </label>
                      <input
                        value={itemForm.temps_preparation}
                        onChange={(e) =>
                          setItemForm((p) => ({ ...p, temps_preparation: e.target.value }))
                        }
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        placeholder="10"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={itemForm.is_available}
                      onChange={(e) => setItemForm((p) => ({ ...p, is_available: e.target.checked }))}
                    />
                    Disponible
                  </label>
                </div>
              ) : null}

              {modal === 'delete-category' ? (
                <div className="text-sm text-gray-700 dark:text-slate-200">
                  Supprimer la categorie <span className="font-semibold">{selectedCategory?.nom}</span> ?
                  <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Si elle contient des plats, il faudra d&apos;abord les supprimer/deplacer.
                  </div>
                </div>
              ) : null}

              {modal === 'delete-item' ? (
                <div className="text-sm text-gray-700 dark:text-slate-200">
                  Supprimer le plat <span className="font-semibold">{selectedItem?.nom}</span> ?
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                disabled={saving}
              >
                Annuler
              </button>

              {modal === 'create-category' ? (
                <button
                  type="button"
                  onClick={onCreateCategory}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  Creer
                </button>
              ) : null}

              {modal === 'edit-category' ? (
                <button
                  type="button"
                  onClick={onUpdateCategory}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
              ) : null}

              {modal === 'delete-category' ? (
                <button
                  type="button"
                  onClick={onDeleteCategory}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              ) : null}

              {modal === 'create-item' ? (
                <button
                  type="button"
                  onClick={onCreateItem}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  Creer
                </button>
              ) : null}

              {modal === 'edit-item' ? (
                <button
                  type="button"
                  onClick={onUpdateItem}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Save className="h-4 w-4" />
                  Enregistrer
                </button>
              ) : null}

              {modal === 'delete-item' ? (
                <button
                  type="button"
                  onClick={onDeleteItem}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
