import type {
  ModuleDescriptor,
  ModuleFieldOption,
  ModuleFieldOptionContext,
  ModuleFormField,
  ModuleManagerReferences
} from './types';
import { resolveOptions } from './helpers';

export type FieldRenderHelpers = {
  selectFilters?: Record<string, string>;
  asyncOptionsCache?: Record<string, ModuleFieldOption[]>;
  asyncLoading?: Record<string, boolean>;
  handleFilterChange?: (key: string, value: string) => void;
  fieldErrors?: Record<string, string>;
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
