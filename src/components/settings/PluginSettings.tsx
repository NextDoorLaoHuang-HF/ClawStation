import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, FolderOpen, RefreshCw } from 'lucide-react';
import { PluginList } from './PluginList';
import { plugins, type PluginInfo } from '../../lib/api';

export const PluginSettings: React.FC = () => {
  const [pluginList, setPluginList] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [sourceInput, setSourceInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const clearMessageTimerRef = useRef<number | null>(null);

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await plugins.list();
      setPluginList(list);
    } catch (err) {
      setError('加载插件列表失败: ' + String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  useEffect(() => {
    return () => {
      if (clearMessageTimerRef.current !== null) {
        window.clearTimeout(clearMessageTimerRef.current);
        clearMessageTimerRef.current = null;
      }
    };
  }, []);

  const showMessage = (msg: string, isError = false) => {
    if (clearMessageTimerRef.current !== null) {
      window.clearTimeout(clearMessageTimerRef.current);
      clearMessageTimerRef.current = null;
    }

    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    clearMessageTimerRef.current = window.setTimeout(() => {
      setError(null);
      setSuccess(null);
      clearMessageTimerRef.current = null;
    }, 3000);
  };

  const handleInstall = async () => {
    if (!sourceInput.trim()) {
      showMessage('请输入插件源路径或 URL', true);
      return;
    }

    setInstallLoading(true);
    try {
      await plugins.install(sourceInput.trim());
      showMessage('插件安装成功');
      setSourceInput('');
      await loadPlugins();
    } catch (err) {
      showMessage('安装失败: ' + String(err), true);
    } finally {
      setInstallLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await plugins.enable(id);
        showMessage('插件已启用');
      } else {
        await plugins.disable(id);
        showMessage('插件已禁用');
      }
      await loadPlugins();
    } catch (err) {
      showMessage('操作失败: ' + String(err), true);
    }
  };

  const handleReload = async (id: string) => {
    try {
      await plugins.reload(id);
      showMessage('插件已重新加载');
      await loadPlugins();
    } catch (err) {
      showMessage('重新加载失败: ' + String(err), true);
    }
  };

  const handleUninstall = async (id: string) => {
    if (!confirm('确定要卸载此插件吗？')) {
      return;
    }
    try {
      await plugins.uninstall(id);
      showMessage('插件已卸载');
      await loadPlugins();
    } catch (err) {
      showMessage('卸载失败: ' + String(err), true);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          插件管理
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          安装、管理和配置 ClawStation 插件
        </p>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      {/* 安装区域 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          安装新插件
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <FolderOpen className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder="输入本地路径或远程 URL..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleInstall()}
            />
          </div>
          <button
            onClick={handleInstall}
            disabled={installLoading}
            className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {installLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            安装
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          支持本地文件夹路径 (如 ~/.clawstation/plugins/my-plugin) 或 Git URL
        </p>
      </div>

      {/* 插件列表 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            已安装插件 ({pluginList.length})
          </h3>
          <button
            onClick={loadPlugins}
            disabled={loading}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
        <PluginList
          plugins={pluginList}
          loading={loading}
          onToggle={handleToggle}
          onReload={handleReload}
          onUninstall={handleUninstall}
        />
      </div>

      {/* 插件目录信息 */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>插件目录:</strong> ~/.clawstation/plugins/
        </p>
      </div>
    </div>
  );
};
