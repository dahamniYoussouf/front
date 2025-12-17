'use client';

import Loader from '@/components/Loader';
import ModuleManager from '../ModuleManager';
import type {
  ModuleDescriptor,
  ModuleItem,
  ModuleManagerReferences
} from '../module-manager/types';
import type { AuthFetch } from './types';

type HomepageModuleSectionProps = {
  modulesToRender: ModuleDescriptor[];
  moduleData: Record<string, ModuleItem[]>;
  moduleLoading: Record<string, boolean>;
  moduleNotFound: boolean;
  loadModule: (config: ModuleDescriptor) => Promise<void>;
  fetchWithToken: AuthFetch;
  combinedReferences: ModuleManagerReferences;
  loading: boolean;
  error: string;
};

export default function HomepageModuleSection({
  modulesToRender,
  moduleData,
  moduleLoading,
  moduleNotFound,
  loadModule,
  fetchWithToken,
  combinedReferences,
  loading,
  error
}: HomepageModuleSectionProps) {
  return (
    <div className="space-y-6">
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
  );
}
