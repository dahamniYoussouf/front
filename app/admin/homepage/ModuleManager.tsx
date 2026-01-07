'use client';

import { FormEvent, Key, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { renderField, FieldRenderHelpers } from './module-manager/renderField';
import {
  buildDefaultState,
  mapItemToState,
  buildPayload,
  buildItemTitle,
  formatCellValue
} from './module-manager/helpers';
import type {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleFieldOnChangeContext,
  ModuleFormField,
  ModuleItem,
  ModuleManagerReferences
} from './module-manager/types';

export type {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleFieldOnChangeContext,
  ModuleFormField,
  ModuleItem,
  ModuleManagerReferences
} from './module-manager/types';

type AuthFetch = (endpoint: string, options?: RequestInit) => Promise<unknown>;
type StatusMessage = { text: string; variant: 'error' | 'success' | 'neutral' };
type ValidationPayload = {
  msg: string;
  param?: string;
};
type FetchValidationError = Error & {
  errors?: ValidationPayload[];
};

const isFieldVisible = (
  field: ModuleFormField,
  context: { state: Record<string, unknown>; role: 'create' | 'edit'; item?: ModuleItem }
) => {
  if (!field.visibleWhen) {
    return true;
  }

  try {
    return field.visibleWhen(context);
  } catch {
    return true;
  }
};

const getPromotionType = (state: Record<string, unknown>) => String(state.type ?? '').trim();
const getPromotionScope = (state: Record<string, unknown>) => String(state.scope ?? '').trim();

const isPromotionFieldVisible = (fieldName: string, state: Record<string, unknown>) => {
  const type = getPromotionType(state);
  const scope = getPromotionScope(state);
  const hasType = Boolean(type);

  if (fieldName === 'title' || fieldName === 'description' || fieldName === 'type') {
    return true;
  }

  if (fieldName === 'discount_value') {
    return type === 'percentage' || type === 'amount';
  }

  if (fieldName === 'currency') {
    return type === 'amount';
  }

  if (fieldName === 'buy_quantity' || fieldName === 'free_quantity') {
    return false;
  }

  if (fieldName === 'custom_message') {
    return type === 'other';
  }

  if (fieldName === 'restaurant_id') {
    return (
      hasType &&
      (type === 'percentage' ||
        type === 'amount' ||
        scope === 'restaurant' ||
        scope === 'menu_item')
    );
  }

  if (fieldName === 'menu_item_id') {
    return hasType && scope === 'menu_item';
  }

  if (fieldName === 'menu_item_ids') {
    return hasType && (type === 'percentage' || type === 'amount' || scope === 'menu_item');
  }

  if (
    fieldName === 'scope' ||
    fieldName === 'badge_text' ||
    fieldName === 'start_date' ||
    fieldName === 'end_date' ||
    fieldName === 'is_active'
  ) {
    return hasType;
  }

  return hasType;
};

const shouldRenderField = (
  configKey: string,
  field: ModuleFormField,
  context: { state: Record<string, unknown>; role: 'create' | 'edit'; item?: ModuleItem }
) => {
  if (field.visibleWhen) {
    return isFieldVisible(field, context);
  }

  if (configKey === 'promotions') {
    return isPromotionFieldVisible(field.name, context.state);
  }

  return true;
};

const mapValidationErrors = (errors?: ValidationPayload[]) => {
  const result: Record<string, string> = {};
  if (!Array.isArray(errors)) {
    return result;
  }
  errors.forEach((entry) => {
    if (!entry.param) {
      return;
    }
    if (result[entry.param]) {
      return;
    }
    result[entry.param] = entry.msg || 'Erreur de validation';
  });
  return result;
};

type MenuItemPromotionReference = {
  promotionId?: string | number;
  title: string;
};

type MenuItemPromotionConflict = {
  menuItemId: string;
  promotions: MenuItemPromotionReference[];
};

const getStringOrNumberValue = (value: unknown): string | number | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const extractMenuItemIdsFromPayload = (payload: Record<string, unknown>) => {
  const ids = new Set<string>();
  const addId = (value?: unknown) => {
    if (value === undefined || value === null) {
      return;
    }
    const normalized = String(value).trim();
    if (normalized) {
      ids.add(normalized);
    }
  };

  addId(payload.menu_item_id);

  const menuItemIds = payload.menu_item_ids;
  if (typeof menuItemIds === 'string') {
    menuItemIds
      .split(/[,\n]/)
      .map((token) => token.trim())
      .forEach(addId);
  } else if (Array.isArray(menuItemIds)) {
    menuItemIds.forEach(addId);
  }

  return Array.from(ids);
};

const getPromotionTitle = (item: ModuleItem) => {
  if (typeof item.title === 'string' && item.title.trim()) {
    return item.title.trim();
  }
  if (typeof item.badge_text === 'string' && item.badge_text.trim()) {
    return item.badge_text.trim();
  }
  if (typeof item.description === 'string' && item.description.trim()) {
    return item.description.trim();
  }
  if (item.id !== undefined && item.id !== null) {
    return String(item.id);
  }
  return 'Promotion';
};

const buildMenuItemPromotionMap = (items: ModuleItem[]) => {
  const map = new Map<string, MenuItemPromotionReference[]>();
  items.forEach((promotion) => {
    const promotionReference: MenuItemPromotionReference = {
      promotionId: getStringOrNumberValue(promotion.id),
      title: getPromotionTitle(promotion)
    };
    const addReference = (menuItemId?: string | number) => {
      if (!menuItemId) {
        return;
      }
      const key = String(menuItemId);
      const existing = map.get(key) ?? [];
      existing.push(promotionReference);
      map.set(key, existing);
    };

    addReference(getStringOrNumberValue(promotion.menu_item_id));
    const linkedItems = Array.isArray(promotion.menu_items) ? promotion.menu_items : [];
    linkedItems.forEach((menuItem) => {
      addReference(getStringOrNumberValue((menuItem as ModuleItem)?.id));
    });
  });
  return map;
};

const findMenuItemPromotionConflicts = (
  menuItemIds: string[],
  map: Map<string, MenuItemPromotionReference[]>,
  currentPromotionId?: string | number
) => {
  const conflicts: MenuItemPromotionConflict[] = [];
  const currentIdString =
    currentPromotionId !== undefined && currentPromotionId !== null
      ? String(currentPromotionId)
      : null;

  menuItemIds.forEach((menuItemId) => {
    const references = map.get(menuItemId);
    if (!references?.length) {
      return;
    }
    const filtered = references.filter((reference) => {
      if (!currentIdString) {
        return true;
      }
      if (reference.promotionId === undefined || reference.promotionId === null) {
        return true;
      }
      return String(reference.promotionId) !== currentIdString;
    });
    if (filtered.length) {
      conflicts.push({ menuItemId, promotions: filtered });
    }
  });

  return conflicts;
};

type ModuleManagerProps = {
  config: ModuleDescriptor;
  items: ModuleItem[];
  isLoading: boolean;
  loadError?: string;
  onRefresh: () => Promise<void>;
  fetchWithToken: AuthFetch;
  references?: ModuleManagerReferences;
};

export default function ModuleManager({
  config,
  items,
  isLoading,
  loadError,
  onRefresh,
  fetchWithToken,
  references,
}: ModuleManagerProps) {
  const referenceData: ModuleManagerReferences = references ?? {};
  const defaultFormState = useMemo(() => buildDefaultState(config.fields), [config.fields]);
  const [createState, setCreateState] = useState<Record<string, unknown>>(() => ({ ...defaultFormState }));
  const [editState, setEditState] = useState<Record<string, unknown>>(() => ({ ...defaultFormState }));
  const [selectedItem, setSelectedItem] = useState<ModuleItem | null>(null);
  const [busy, setBusy] = useState({ create: false, edit: false });
  const [createStatus, setCreateStatus] = useState<StatusMessage | null>(null);
  const [editStatus, setEditStatus] = useState<StatusMessage | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectFilters, setSelectFilters] = useState<Record<string, string>>({});
  const [asyncOptionsCache, setAsyncOptionsCache] = useState<Record<string, ModuleFieldOption[]>>({});
  const [asyncLoading, setAsyncLoading] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const removeFieldError = (name: string) => {
    setFieldErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  useEffect(() => {
    setCreateState({ ...defaultFormState });
    setEditState({ ...defaultFormState });
    setSelectedItem(null);
    setCreateStatus(null);
    setEditStatus(null);
    setShowCreateModal(false);
    setShowEditModal(false);
    setDeletingId(null);
    setSelectFilters({});
    setAsyncOptionsCache({});
    setAsyncLoading({});
    setFieldErrors({});
  }, [config.key, defaultFormState]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    const fresh = items.find((entry) => entry.id === selectedItem.id);
    if (!fresh) {
      setSelectedItem(null);
      setEditState({ ...defaultFormState });
      return;
    }
    setEditState(mapItemToState(fresh, config.fields));
  }, [items, selectedItem, config.fields, defaultFormState]);

  const openCreateModal = () => {
    setCreateState({ ...defaultFormState });
    setCreateStatus(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateStatus(null);
  };

  const openEditModal = (item: ModuleItem) => {
    setSelectedItem(item);
    setEditState(mapItemToState(item, config.fields));
    setEditStatus(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleFilterChange = useCallback((key: string, value: string) => {
    setSelectFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const fetchAsyncOptions = useCallback(
    async (fieldKey: string, field: ModuleFormField) => {
      if (!field.asyncOptions) {
        return;
      }
      setAsyncLoading((previous) => ({ ...previous, [fieldKey]: true }));
      try {
        const payload = await fetchWithToken(field.asyncOptions.endpoint(''));
        const options = field.asyncOptions.mapper(payload);
        setAsyncOptionsCache((previous) => ({ ...previous, [fieldKey]: options }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Erreur lors du chargement des options', error);
      } finally {
        setAsyncLoading((previous) => ({ ...previous, [fieldKey]: false }));
      }
    },
    [fetchWithToken]
  );

  useEffect(() => {
    config.fields.forEach((field) => {
      if (!field.asyncOptions) {
        return;
      }
      const fieldKey = `${config.key}-${field.name}`;
      if (!asyncOptionsCache[fieldKey]) {
        fetchAsyncOptions(fieldKey, field);
      }
    });
  }, [config.fields, config.key, asyncOptionsCache, fetchAsyncOptions]);

  const fieldHelpers = useMemo(
    () => ({
      selectFilters,
      asyncOptionsCache,
      asyncLoading,
      handleFilterChange,
      fieldErrors
    }),
    [selectFilters, asyncOptionsCache, asyncLoading, handleFilterChange, fieldErrors]
  );

  const menuItemPromotionMap = useMemo(() => {
    if (config.key !== 'promotions') {
      return new Map<string, MenuItemPromotionReference[]>();
    }
    return buildMenuItemPromotionMap(items);
  }, [config.key, items]);

  const shouldProceedWithMenuItemConflicts = (
    payload: Record<string, unknown>,
    currentPromotionId?: string | number
  ) => {
    if (config.key !== 'promotions') {
      return true;
    }
    const selectedIds = extractMenuItemIdsFromPayload(payload);
    if (!selectedIds.length) {
      return true;
    }
    const conflicts = findMenuItemPromotionConflicts(selectedIds, menuItemPromotionMap, currentPromotionId);
    if (!conflicts.length) {
      return true;
    }
    const summary = conflicts
      .map(({ menuItemId, promotions }) => {
        const names = promotions.map((ref) => ref.title).join(', ');
        return `• ${menuItemId}: ${names}`;
      })
      .join('\n');
    return window.confirm(
      `Les plats suivants sont déjà liés à d'autres promotions :\n${summary}\nSouhaitez-vous continuer malgré tout ?`
    );
  };

  const handleDelete = async (item: ModuleItem, key?: string) => {
    if (!config.deleteEndpoint) {
      setEditStatus({ text: 'Suppression indisponible pour ce module', variant: 'error' });
      return;
    }

    const endpoint = config.deleteEndpoint(item);
    if (!endpoint) {
      setEditStatus({ text: 'URL de suppression manquante', variant: 'error' });
      return;
    }

    const targetId = key ?? `${config.key}-delete`;
    setDeletingId(targetId);
    setEditStatus(null);
    try {
      await fetchWithToken(endpoint, {
        method: 'DELETE'
      });
      setEditStatus({ text: 'Élément supprimé.', variant: 'success' });
      await onRefresh();
    } catch (error) {
      setEditStatus({
        text: error instanceof Error ? error.message : 'Suppression impossible',
        variant: 'error'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleModuleRefresh = async () => {
    setCreateStatus(null);
    setEditStatus(null);
    try {
      await onRefresh();
    } catch (refreshError) {
      setEditStatus({
        text: refreshError instanceof Error ? refreshError.message : 'Impossible de rafraîchir le module',
        variant: 'error',
      });
    }
  };

  const handleCreate = async () => {
    if (!config.createEndpoint) {
      setCreateStatus({ text: 'Créer est désactivé pour ce module', variant: 'error' });
      return;
    }
    setCreateStatus(null);
    setFieldErrors({});
    const visibleFields = config.fields.filter((field) =>
      shouldRenderField(config.key, field, { state: createState, role: 'create' })
    );
    const payload = buildPayload(createState, visibleFields);
    if (!shouldProceedWithMenuItemConflicts(payload)) {
      return;
    }
    setBusy((previous) => ({ ...previous, create: true }));
    try {
      await fetchWithToken(config.createEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCreateState({ ...defaultFormState });
      setCreateStatus({ text: 'Nouvel élément enregistré.', variant: 'success' });
      await onRefresh();
      setShowCreateModal(false);
    } catch (error) {
      const apiError = error as FetchValidationError;
      const validationErrors = mapValidationErrors(apiError.errors);
      if (Object.keys(validationErrors).length) {
        setFieldErrors(validationErrors);
      }
      setCreateStatus({
        text: apiError.message,
        variant: 'error',
      });
    } finally {
      setBusy((previous) => ({ ...previous, create: false }));
    }
  };

  const handleUpdate = async () => {
    if (!config.updateEndpoint || !selectedItem) {
      setEditStatus({ text: "Sélectionnez un élément pour l'éditer.", variant: 'error' });
      return;
    }
    setEditStatus(null);
    setFieldErrors({});
    const visibleFields = config.fields.filter((field) =>
      shouldRenderField(config.key, field, { state: editState, role: 'edit', item: selectedItem })
    );
    const payload = buildPayload(editState, visibleFields);
    if (!Object.keys(payload).length) {
      setEditStatus({ text: 'Aucune modification à enregistrer.', variant: 'neutral' });
      return;
    }
    if (!shouldProceedWithMenuItemConflicts(payload, getStringOrNumberValue(selectedItem?.id))) {
      return;
    }
    setBusy((previous) => ({ ...previous, edit: true }));
    try {
      await fetchWithToken(config.updateEndpoint(selectedItem), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setEditStatus({ text: 'Modifications appliquées.', variant: 'success' });
      setSelectedItem(null);
      setEditState({ ...defaultFormState });
      await onRefresh();
      setShowEditModal(false);
    } catch (error) {
      const apiError = error as FetchValidationError;
      const validationErrors = mapValidationErrors(apiError.errors);
      if (Object.keys(validationErrors).length) {
        setFieldErrors(validationErrors);
      }
      setEditStatus({
        text: apiError.message,
        variant: 'error',
      });
    } finally {
      setBusy((previous) => ({ ...previous, edit: false }));
    }
  };

  const statusMessage = editStatus ?? createStatus;
  const statusColorClass =
    statusMessage?.variant === 'error'
      ? 'text-red-500'
      : statusMessage?.variant === 'success'
      ? 'text-emerald-600'
      : 'text-slate-500';

  return (
    <article className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white ${config.gradient}`}>
            <config.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.45em] text-slate-400 dark:text-slate-500">Module</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{config.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{items.length} éléments</span>
          <button
            type="button"
            onClick={handleModuleRefresh}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            Rafraîchir
          </button>
        </div>
      </header>
      <div className="mt-4 space-y-4">
        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-200">
            {loadError}
          </div>
        ) : null}
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
            Chargement des éléments...
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Vue d’édition</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Gérez rapidement les éléments visibles sur la page d’accueil.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
              >
                Ajouter un élément
              </button>
            </div>
            {statusMessage && (
              <p className={`text-xs ${statusColorClass} pt-2`}>
                {statusMessage.text}
              </p>
            )}
            <div className="mt-4 space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Le module est vide pour le moment.</p>
              ) : (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto text-left text-[0.7rem]">
                      <thead className="border-b border-slate-200 text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-700">
                        <tr>
                          <th className="px-3 py-2 font-semibold">#</th>
                          <th className="px-3 py-2 font-semibold">Titre</th>
                          {config.fields.map((field) => (
                            <th key={`${config.key}-${field.name}`} className="px-3 py-2 font-semibold">
                              {field.label}
                            </th>
                          ))}
                          <th className="px-3 py-2 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((item, index) => {
                          const idValue = item.id;
                          const recordKey: Key =
                            typeof idValue === 'string' || typeof idValue === 'number'
                              ? idValue
                              : `${config.key}-${index}`;
                          const title = buildItemTitle(item, config, referenceData);
                          const isSelected =
                            selectedItem && item.id !== undefined ? selectedItem.id === item.id : selectedItem === item;
                          const isDeleting = deletingId === `${recordKey}`;
                          return (
                            <tr
                              key={recordKey}
                              className={`transition ${
                                isSelected
                                  ? 'bg-slate-50 dark:bg-slate-800/60'
                                  : 'bg-white dark:bg-slate-900'
                              }`}
                            >
                              <td className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">{index + 1}</td>
                              <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{title}</td>
                              {config.fields.map((field) => (
                                <td key={`${recordKey}-${field.name}`} className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                  {formatCellValue(item, field, referenceData)}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    className="text-[0.65rem] font-semibold text-emerald-600 transition hover:text-emerald-500 dark:text-emerald-400 dark:hover:text-emerald-300"
                                    onClick={() => openEditModal(item)}
                                  >
                                    Éditer
                                  </button>
                                  {config.deleteEndpoint && (
                                    <button
                                      type="button"
                                  onClick={() => handleDelete(item, `${recordKey}`)}
                                      className={`text-[0.65rem] font-semibold transition ${
                                        isDeleting ? 'text-red-500' : 'text-red-600'
                                      } hover:text-red-500 dark:hover:text-red-400`}
                                      disabled={Boolean(deletingId)}
                                    >
                                      {isDeleting ? 'Suppression…' : 'Supprimer'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">Créer</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Nouvel élément</h3>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Fermer
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              {config.fields
                .filter((field) => shouldRenderField(config.key, field, { state: createState, role: 'create' }))
                .map((field) =>
                  renderField(
                  config,
                  field,
                  createState,
                  (name, value) => {
                    setCreateState((previous) => ({ ...previous, [name]: value }));
                    setCreateStatus(null);
                    removeFieldError(name);
                  },
                  'create',
                  busy.create,
                  referenceData,
                  fieldHelpers
                  )
                )}
              {createStatus && (
                <p className={`text-xs ${createStatus.variant === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {createStatus.text}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                  onClick={closeCreateModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                  disabled={busy.create}
                >
                  {busy.create ? 'Création…' : 'Créer l’élément'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">Éditer</p>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Édition rapide</h3>
              </div>
              <div className="flex items-center gap-2">
                {config.deleteEndpoint && (() => {
                  const editKey =
                    typeof selectedItem.id === 'string' || typeof selectedItem.id === 'number'
                      ? `${selectedItem.id}`
                      : `${config.key}-edit`;
                  return (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedItem, editKey)}
                      className={`text-xs font-semibold ${
                        deletingId === editKey ? 'text-red-500' : 'text-red-600'
                      } hover:text-red-500 dark:hover:text-red-400`}
                      disabled={Boolean(deletingId)}
                    >
                      {deletingId === editKey ? 'Suppression…' : 'Supprimer'}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Fermer
                </button>
              </div>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                handleUpdate();
              }}
            >
              {config.fields
                .filter((field) => shouldRenderField(config.key, field, { state: editState, role: 'edit', item: selectedItem }))
                .map((field) =>
                  renderField(
                  config,
                  field,
                  editState,
                  (name, value) => {
                    setEditState((previous) => ({ ...previous, [name]: value }));
                    setEditStatus(null);
                    removeFieldError(name);
                  },
                  'edit',
                  busy.edit,
                  referenceData,
                  fieldHelpers
                  )
                )}
              {editStatus && (
                <p
                  className={`text-xs ${
                    editStatus.variant === 'error'
                      ? 'text-red-500'
                      : editStatus.variant === 'success'
                      ? 'text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {editStatus.text}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
                  onClick={closeEditModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
                  disabled={busy.edit}
                >
                  {busy.edit ? 'Mise à jour…' : 'Enregistrer les modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
