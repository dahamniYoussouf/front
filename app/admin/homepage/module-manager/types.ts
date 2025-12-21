import type { ComponentType, SVGProps } from 'react';

export type ModuleItem = Record<string, unknown>;

export type ModuleManagerReferences = Partial<Record<string, ModuleItem[]>> & {
  restaurants?: ModuleItem[];
  menuItemsByRestaurant?: Record<string, ModuleItem[]>;
};

export type ModuleFieldOption = {
  label: string;
  value: string;
};

export type ModuleFieldOptionContext = {
  state?: Record<string, unknown>;
  item?: ModuleItem;
  role?: 'create' | 'edit';
};

export type ModuleFieldVisibilityContext = {
  state: Record<string, unknown>;
  role: 'create' | 'edit';
  item?: ModuleItem;
};

export type ModuleFieldOnChangeContext = {
  state: Record<string, unknown>;
  setter: (name: string, value: unknown) => void;
  role: 'create' | 'edit';
  fieldName: string;
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
    | ((
        references: ModuleManagerReferences,
        context?: ModuleFieldOptionContext
      ) => ModuleFieldOption[]);
  default?: string | number | boolean;
  searchable?: boolean;
  asyncOptions?: AsyncOptionsConfig;
  onValueChange?: (
    value: string | number | boolean,
    context: ModuleFieldOnChangeContext
  ) => void;
  visibleWhen?: (context: ModuleFieldVisibilityContext) => boolean;
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
  itemTitle?: (item: ModuleItem, references?: ModuleManagerReferences) => string;
  itemSubtitle?: (item: ModuleItem, references?: ModuleManagerReferences) => string;
};
