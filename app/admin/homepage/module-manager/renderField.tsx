import { ChangeEvent, useEffect, useRef, useState } from 'react';

import type {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleFieldOptionContext,
  ModuleFormField,
  ModuleManagerReferences
} from './types';
import { resolveOptions } from './helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type FieldRenderHelpers = {
  selectFilters?: Record<string, string>;
  asyncOptionsCache?: Record<string, ModuleFieldOption[]>;
  asyncLoading?: Record<string, boolean>;
  handleFilterChange?: (key: string, value: string) => void;
  fieldErrors?: Record<string, string>;
};

type ImageUploadFieldProps = {
  fieldId: string;
  label: string;
  value: unknown;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  onChange: (value: string) => void;
};

const normalizeStringValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
};

const ImageUploadField = ({
  fieldId,
  label,
  value,
  required,
  disabled,
  hint,
  error,
  onChange
}: ImageUploadFieldProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const lastUploadedUrl = useRef<string | null>(null);
  const normalizedValue = normalizeStringValue(value);
  const visibleUrl = previewUrl || normalizedValue;
  const fileInputId = `${fieldId}-file`;

  useEffect(() => {
    if (normalizedValue && lastUploadedUrl.current === normalizedValue) {
      return;
    }
    if (!normalizedValue && lastUploadedUrl.current === null) {
      return;
    }
    setPreviewUrl(null);
    lastUploadedUrl.current = null;
  }, [normalizedValue]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleRemove = () => {
    setLocalError(null);
    setPreviewUrl(null);
    lastUploadedUrl.current = null;
    onChange('');
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled) {
      event.target.value = '';
      return;
    }

    setLocalError(null);

    if (!file.type.startsWith('image/')) {
      setLocalError('Veuillez selectionner une image valide.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError("L'image ne doit pas depasser 5 MB.");
      event.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error("Echec de l'upload de l'image.");
      }

      const payload = await response.json().catch(() => ({}));
      const url = typeof payload?.url === 'string' ? payload.url : '';
      if (!url) {
        throw new Error("URL de l'image manquante.");
      }

      lastUploadedUrl.current = url;
      onChange(url);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (uploadError) {
      setLocalError(uploadError instanceof Error ? uploadError.message : "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor={fileInputId}>
        {label}
      </label>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
        {visibleUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={visibleUrl}
              alt={`${label} preview`}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {previewUrl ? 'Image previsualisee' : 'Image actuelle'}
              </p>
              {normalizedValue && !previewUrl ? (
                <p className="break-all text-[0.65rem] text-slate-400 dark:text-slate-500">{normalizedValue}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled || uploading}
            >
              Supprimer
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Aucune image selectionnee.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 ${
              disabled || uploading
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer hover:border-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            htmlFor={fileInputId}
          >
            {uploading ? 'Upload en cours...' : 'Telecharger une image'}
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || uploading}
            required={Boolean(required && !normalizedValue)}
            className="sr-only"
          />
          <span className="text-[0.65rem] text-slate-400 dark:text-slate-500">Formats image, max 5 MB</span>
        </div>
      </div>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {localError && <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{localError}</p>}
      {error && <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{error}</p>}
    </div>
  );
};

export const renderField = (
  config: ModuleDescriptor,
  field: ModuleFormField,
  state: Record<string, unknown>,
  setter: (name: string, value: unknown) => void,
  role: 'create' | 'edit',
  disabled = false,
  references?: ModuleManagerReferences,
  helpers?: FieldRenderHelpers
) => {
  const fieldId = `${config.key}-${role}-${field.name}`;
  const value = state[field.name];
  const baseInputClass =
    'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-emerald-500 focus:outline-none disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-white';

  const fieldError = helpers?.fieldErrors?.[field.name];
  const renderFieldError = () =>
    fieldError ? (
      <p className="text-xs font-medium text-rose-500 dark:text-rose-400">{fieldError}</p>
    ) : null;

  const optionContext: ModuleFieldOptionContext = { state, role };
  const applyChange = (input: string | number | boolean) => {
    setter(field.name, input);
    if (field.onValueChange) {
      field.onValueChange(input, {
        state,
        setter,
        role,
        fieldName: field.name
      });
    }
  };

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
            onChange={(event) => applyChange(event.target.value)}
            className={`${baseInputClass} min-h-[90px] resize-none`}
            disabled={disabled}
            required={field.required}
          />
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
          {renderFieldError()}
        </div>
      );
    case 'image':
      return (
        <ImageUploadField
          key={fieldId}
          fieldId={fieldId}
          label={field.label}
          value={value}
          required={field.required}
          disabled={disabled}
          hint={field.hint}
          error={fieldError}
          onChange={(nextValue) => applyChange(nextValue)}
        />
      );
    case 'select': {
      const baseOptions = resolveOptions(field, references, optionContext);
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
              placeholder={`Rechercher ${field.label.toLowerCase()}...`}
              onChange={(event) => {
                helpers?.handleFilterChange?.(fieldKey, event.target.value);
              }}
              className={`${baseInputClass} text-xs font-medium placeholder:text-slate-400`}
              disabled={disabled}
            />
          )}
          <div className="relative">
            <select
              id={fieldId}
              value={typeof value === 'string' ? value : ''}
              onChange={(event) => applyChange(event.target.value)}
              className={`${baseInputClass} appearance-none`}
              disabled={disabled}
              required={field.required}
            >
              <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}...`}</option>
              {filteredOptions.map((option) => (
                <option key={`${fieldKey}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {isLoadingAsync ? '...' : 'v'}
            </span>
          </div>
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
          {renderFieldError()}
        </div>
      );
    }
    case 'checkbox':
      return (
        <label
          key={fieldId}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
        >
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => applyChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
            disabled={disabled}
          />
          {field.label}
          {renderFieldError()}
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
            value={typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''}
            placeholder={field.placeholder}
            onChange={(event) => applyChange(event.target.value)}
            className={baseInputClass}
            disabled={disabled}
            required={field.required}
          />
          {field.hint && <p className="text-xs text-slate-400 dark:text-slate-500">{field.hint}</p>}
          {renderFieldError()}
        </div>
      );
    }
  }
};
