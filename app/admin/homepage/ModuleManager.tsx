'use client';

import { FormEvent, Key, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type ModuleItem = Record<string, unknown>;

export type ModuleFieldOption = {
  label: string;
  value: string;
};

export type AsyncOptionsConfig = {
  endpoint: (query: string) => string;
  mapper: (payload: unknown) => ModuleFieldOption[];
  minQueryLength?: number;
};

export type ModuleFormField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'url' | 'select' | 'checkbox' | 'date';
  placeholder?: string;
  hint?: string;
  required?: boolean;
  options?:
    | ModuleFieldOption[]
    | ((references: Record<string, ModuleItem[]>) => ModuleFieldOption[]);
  default?: string | number | boolean;
  searchable?: boolean;
  asyncOptions?: AsyncOptionsConfig;
};

export type ModuleDescriptor = {
  key: string;
  title: string;
  description: string;
  fetchEndpoint: string;
  createEndpoint?: string;
  updateEndpoint?: (item: ModuleItem) => string;
  deleteEndpoint?: (item: ModuleItem) => string;
  gradient: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  fields: ModuleFormField[];
  itemTitle?: (item: ModuleItem, references?: Record<string, ModuleItem[]>) => string;
  itemSubtitle?: (item: ModuleItem, references?: Record<string, ModuleItem[]>) => string;
};

type AuthFetch = (endpoint: string, options?: RequestInit) => Promise<unknown>;
type StatusMessage = { text: string; variant: 'error' | 'success' | 'neutral' };
type FieldRenderHelpers = {
  selectFilters?: Record<string, string>;
  asyncOptionsCache?: Record<string, ModuleFieldOption[]>;
  asyncLoading?: Record<string, boolean>;
  handleFilterChange?: (key: string, value: string) => void;
};

type ModuleManagerProps = {
  config: ModuleDescriptor;
  items: ModuleItem[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  fetchWithToken: AuthFetch;
  references?: Record<string, ModuleItem[]>;
};

const buildDefaultState = (fields: ModuleFormField[]) => {
  const state: Record<string, string | number | boolean> = {};
  fields.forEach((field) => {
    if (field.default !== undefined) {
      state[field.name] = field.default;
    } else if (field.type === 'checkbox') {
      state[field.name] = false;
    } else {
      state[field.name] = '';
    }
  });
  return state;
};

const formatDateForInput = (value: unknown) => {
  if (!value) {
    return '';
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

const mapItemToState = (item: ModuleItem, fields: ModuleFormField[]) => {
  const state: Record<string, string | number | boolean> = {};
  fields.forEach((field) => {
    const raw = item[field.name];
    if (field.type === 'checkbox') {
      state[field.name] = Boolean(raw);
    } else if (field.type === 'date') {
      state[field.name] = formatDateForInput(raw);
    } else {
      const value = raw ?? '';
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        state[field.name] = value;
      } else {
        state[field.name] = '';
      }
    }
  });
  return state;
};

const buildPayload = (state: Record<string, unknown>, fields: ModuleFormField[]) => {
  const payload: Record<string, unknown> = {};
  fields.forEach((field) => {
    const rawValue = state[field.name];
    if (rawValue === undefined) {
      return;
    }
    if (field.type === 'checkbox') {
      payload[field.name] = Boolean(rawValue);
      return;
    }
    if (field.type === 'number') {
      if (rawValue === '' || rawValue === null) {
        return;
      }
      const numeric = Number(rawValue);
      if (!Number.isNaN(numeric)) {
        payload[field.name] = numeric;
      }
      return;
    }
    if (field.type === 'date') {
      if (rawValue) {
        payload[field.name] = rawValue;
      }
      return;
    }
    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (trimmed === '' || trimmed === null) {
      return;
    }
    payload[field.name] = trimmed;
  });
  return payload;
};

const resolveOptions = (field: ModuleFormField, references?: Record<string, ModuleItem[]>) => {
  if (!field.options) {
    return [];
  }
  if (typeof field.options === 'function') {
    return field.options(references ?? {});
  }
  return field.options;
};

const buildItemMeta = (item: ModuleItem) => {
  const pieces: string[] = [];
  if (typeof item.is_active === 'boolean') {
    pieces.push(`Actif ${item.is_active ? 'Oui' : 'Non'}`);
  }
  if (item.display_order !== undefined && item.display_order !== null) {
    pieces.push(`Ordre ${item.display_order}`);
  }
  if (typeof item.reason === 'string' && item.reason.trim()) {
    pieces.push(item.reason);
  }
  if (!pieces.length && typeof item.description === 'string' && item.description.trim()) {
    pieces.push(item.description.trim());
  }
  return pieces.join(' • ');
};

const buildItemTitle = (
  item: ModuleItem,
  config: ModuleDescriptor,
  references?: Record<string, ModuleItem[]>
) => {
  if (config.itemTitle) {
    return config.itemTitle(item, references);
  }
  if (typeof item.name === 'string' && item.name.trim()) {
    return item.name;
  }
  if (typeof item.title === 'string' && item.title.trim()) {
    return item.title;
  }
  if (typeof item.reason === 'string' && item.reason.trim()) {
    return item.reason;
  }
  if (typeof item.id === 'string' || typeof item.id === 'number') {
    return String(item.id);
  }
  return 'Élément sans titre';
};

const buildItemSubtitle = (
  item: ModuleItem,
  config: ModuleDescriptor,
  references?: Record<string, ModuleItem[]>
) => {
  if (config.itemSubtitle) {
    return config.itemSubtitle(item, references) ?? '';
  }
  return buildItemMeta(item);
};

const formatCellValue = (
  item: ModuleItem,
  field: ModuleFormField,
  references?: Record<string, ModuleItem[]>
) => {
  const raw = item[field.name];

  if (raw === undefined || raw === null || raw === '') {
    return '—';
  }

  if (field.type === 'checkbox') {
    return Boolean(raw) ? 'Oui' : 'Non';
  }

  if (field.type === 'date') {
    return formatDateForInput(raw) || String(raw);
  }

  if (field.type === 'select') {
    const options = resolveOptions(field, references);
    const matched = options.find((option) => option.value === String(raw));
    return matched?.label ?? String(raw);
  }

  if (Array.isArray(raw) || typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }

  return String(raw);
};

const renderField = (
  config: ModuleDescriptor,
  field: ModuleFormField,
  state: Record<string, unknown>,
  setter: (name: string, value: unknown) => void,
  role: 'create' | 'edit',
  disabled = false,
  references?: Record<string, ModuleItem[]>,
  helpers?: FieldRenderHelpers
) => {
  const fieldId = `${config.key}-${role}-${field.name}`;
  const value = state[field.name];
  const baseInputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  const handleChange = (input: string) => setter(field.name, input);

  switch (field.type) {
    case 'textarea':
      return (
        <div key={fieldId} className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor={fieldId}>
            {field.label}
          </label>
          <textarea
            id={fieldId}
            rows={3}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={(event) => handleChange(event.target.value)}
            className={`${baseInputClass} min-h-[90px] resize-none`}
            disabled={disabled}
            required={field.required}
          />
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
        </div>
      );
    case 'select': {
      const baseOptions = resolveOptions(field, references);
      const fieldKey = `${config.key}-${field.name}`;
      const asyncOptions = field.asyncOptions ? helpers?.asyncOptionsCache?.[fieldKey] ?? [] : [];
      const mergedOptions = [...baseOptions, ...asyncOptions];
      const seen = new Set<string>();
      const dedupedOptions = mergedOptions.filter((option) => {
        if (seen.has(option.value)) {
          return false;
        }
        seen.add(option.value);
        return true;
      });
      const filterValue = helpers?.selectFilters?.[fieldKey] ?? '';
      const normalizedFilter = filterValue.trim().toLowerCase();
      const filteredOptions =
        normalizedFilter.length === 0
          ? dedupedOptions
          : dedupedOptions.filter(
              (option) =>
                option.label.toLowerCase().includes(normalizedFilter) ||
                option.value.toLowerCase().includes(normalizedFilter)
            );
      const showSearch = Boolean(field.searchable) || Boolean(field.asyncOptions);
      const isLoadingAsync = Boolean(field.asyncOptions && helpers?.asyncLoading?.[fieldKey]);

      return (
        <div key={fieldId} className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor={fieldId}>
            {field.label}
          </label>
          {showSearch && (
            <input
              id={`${fieldId}-search`}
              type="search"
              value={filterValue}
              placeholder={`Rechercher ${field.label.toLowerCase()}…`}
              onChange={(event) => {
                helpers?.handleFilterChange?.(fieldKey, event.target.value);
              }}
              className={`${baseInputClass} border-dashed border-slate-300 focus:border-emerald-500`}
              disabled={disabled}
            />
          )}
          {isLoadingAsync && (
            <p className="text-[0.6rem] text-slate-400">Chargement des options...</p>
          )}
          <select
            id={fieldId}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => handleChange(event.target.value)}
            className={baseInputClass}
            disabled={disabled || !dedupedOptions.length}
            required={field.required}
          >
            <option value="">Sélectionner</option>
            {filteredOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
        </div>
      );
    }
    case 'checkbox':
      return (
        <label
          key={fieldId}
          className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => setter(field.name, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-600"
            disabled={disabled}
          />
          {field.label}
        </label>
      );
    default: {
      const inputType =
        field.type === 'number'
          ? 'number'
          : field.type === 'url'
          ? 'url'
          : field.type === 'date'
          ? 'date'
          : 'text';
      return (
        <div key={fieldId} className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor={fieldId}>
            {field.label}
          </label>
          <input
            id={fieldId}
            type={inputType}
            value={
              typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
            }
            placeholder={field.placeholder}
            onChange={(event) => handleChange(event.target.value)}
            className={baseInputClass}
            disabled={disabled}
            required={field.required}
          />
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
        </div>
      );
    }
  }
};

export default function ModuleManager({
  config,
  items,
  isLoading,
  onRefresh,
  fetchWithToken,
  references,
}: ModuleManagerProps) {
  const referenceData = references ?? {};
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
      handleFilterChange
    }),
    [selectFilters, asyncOptionsCache, asyncLoading, handleFilterChange]
  );

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
    setBusy((previous) => ({ ...previous, create: true }));
    setCreateStatus(null);
    try {
      const payload = buildPayload(createState, config.fields);
      await fetchWithToken(config.createEndpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCreateState({ ...defaultFormState });
      setCreateStatus({ text: 'Nouvel élément enregistré.', variant: 'success' });
      await onRefresh();
      setShowCreateModal(false);
    } catch (error) {
      setCreateStatus({
        text: error instanceof Error ? error.message : 'Création impossible',
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
    setBusy((previous) => ({ ...previous, edit: true }));
    setEditStatus(null);
    try {
      const payload = buildPayload(editState, config.fields);
      if (!Object.keys(payload).length) {
        setEditStatus({ text: 'Aucune modification à enregistrer.', variant: 'neutral' });
        return;
      }
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
      setEditStatus({
        text: error instanceof Error ? error.message : 'Impossible de mettre à jour',
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
              {config.fields.map((field) =>
                renderField(
                  config,
                  field,
                  createState,
                  (name, value) => {
                    setCreateState((previous) => ({ ...previous, [name]: value }));
                    setCreateStatus(null);
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
              {config.fields.map((field) =>
                renderField(
                  config,
                  field,
                  editState,
                  (name, value) => {
                    setEditState((previous) => ({ ...previous, [name]: value }));
                    setEditStatus(null);
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
