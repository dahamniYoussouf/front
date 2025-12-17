import type {
  ModuleDescriptor,
  ModuleFieldOptionContext,
  ModuleFormField,
  ModuleItem,
  ModuleManagerReferences
} from './types';

export const buildDefaultState = (fields: ModuleFormField[]) => {
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

export const formatDateForInput = (value: unknown) => {
  if (!value) {
    return '';
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
};

export const mapItemToState = (item: ModuleItem, fields: ModuleFormField[]) => {
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

export const buildPayload = (state: Record<string, unknown>, fields: ModuleFormField[]) => {
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
    if (field.name === 'menu_item_ids') {
      const normalized =
        typeof rawValue === 'string'
          ? String(rawValue)
              .split(/[,\n]/)
              .map((token) => token.trim())
              .filter(Boolean)
          : Array.isArray(rawValue)
          ? rawValue.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
      if (!normalized.length) {
        return;
      }
      payload[field.name] = normalized;
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

export const resolveOptions = (
  field: ModuleFormField,
  references?: ModuleManagerReferences,
  context?: ModuleFieldOptionContext
) => {
  if (!field.options) {
    return [];
  }
  if (typeof field.options === 'function') {
    return field.options(references ?? {}, context);
  }
  return field.options;
};

export const buildItemMeta = (item: ModuleItem) => {
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
  return pieces.join(' ƒ?› ');
};

export const buildItemTitle = (
  item: ModuleItem,
  config: ModuleDescriptor,
  references?: ModuleManagerReferences
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
  return 'A%lAcment sans titre';
};

export const buildItemSubtitle = (
  item: ModuleItem,
  config: ModuleDescriptor,
  references?: ModuleManagerReferences
) => {
  if (config.itemSubtitle) {
    return config.itemSubtitle(item, references) ?? '';
  }
  return buildItemMeta(item);
};

export const formatCellValue = (
  item: ModuleItem,
  field: ModuleFormField,
  references?: ModuleManagerReferences
) => {
  const raw = item[field.name];

  if (raw === undefined || raw === null || raw === '') {
    return 'ƒ?"';
  }

  if (field.type === 'checkbox') {
    return Boolean(raw) ? 'Oui' : 'Non';
  }

  if (field.type === 'date') {
    return formatDateForInput(raw) || String(raw);
  }

  if (field.type === 'select') {
    const options = resolveOptions(field, references, { item });
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
