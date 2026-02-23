import React from 'react';
import { Power, Trash2, RefreshCw, Puzzle } from 'lucide-react';
import type { PluginInfo } from '../../lib/api';

interface PluginCardProps {
  plugin: PluginInfo;
  onToggle: (id: string, enabled: boolean) => void;
  onReload: (id: string) => void;
  onUninstall: (id: string) => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  onToggle,
  onReload,
  onUninstall,
}) => {
  return (
    <div className={`rounded-lg border p-4 transition-all ${
      plugin.enabled 
        ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' 
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${
            plugin.enabled 
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' 
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            <Puzzle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {plugin.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {plugin.description}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span>v{plugin.version}</span>
              <span>•</span>
              <span>{plugin.author}</span>
              {plugin.loaded && (
                <>
                  <span>•</span>
                  <span className="text-green-500">已加载</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReload(plugin.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="重新加载"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => onToggle(plugin.id, !plugin.enabled)}
            className={`rounded p-1.5 transition-colors ${
              plugin.enabled
                ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-500'
            }`}
            title={plugin.enabled ? '禁用' : '启用'}
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={() => onUninstall(plugin.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 dark:hover:text-red-300"
            title="卸载"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
