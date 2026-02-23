import React from 'react';
import { PluginCard } from './PluginCard';
import type { PluginInfo } from '../../lib/api';

interface PluginListProps {
  plugins: PluginInfo[];
  loading: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onReload: (id: string) => void;
  onUninstall: (id: string) => void;
}

export const PluginList: React.FC<PluginListProps> = ({
  plugins,
  loading,
  onToggle,
  onReload,
  onUninstall,
}) => {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-gray-500 dark:text-gray-400">暂无已安装插件</p>
        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
          从本地路径或远程 URL 安装插件
        </p>
      </div>
    );
  }

  // 排序：启用的在前，然后按名称排序
  const sortedPlugins = [...plugins].sort((a, b) => {
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      {sortedPlugins.map((plugin) => (
        <PluginCard
          key={plugin.id}
          plugin={plugin}
          onToggle={onToggle}
          onReload={onReload}
          onUninstall={onUninstall}
        />
      ))}
    </div>
  );
};
