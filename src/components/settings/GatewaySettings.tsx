import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, PlugZap } from 'lucide-react';
import { useGatewayStore } from '../../stores/gatewayStore';
import type { GatewayProfile } from '../../types/gateway';

interface ProfileFormData {
  name: string;
  url: string;
  token: string;
  canvasPort: number;
}

const defaultFormData: ProfileFormData = {
  name: '',
  url: 'ws://127.0.0.1:18789',
  token: '',
  canvasPort: 18793,
};

function statusDotClass(status: string) {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-amber-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-slate-400';
  }
}

export function GatewaySettings() {
  const {
    profiles,
    connections,
    activeProfileId,
    isLoading,
    error,
    loadProfiles,
    addProfile,
    updateProfile,
    removeProfile,
    setDefault,
    connect,
    disconnect,
  } = useGatewayStore();

  const [formData, setFormData] = useState<ProfileFormData>(defaultFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadProfiles().catch(() => {});
  }, [loadProfiles]);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const getStatus = (id: string) => connections.get(id)?.status ?? 'disconnected';

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const existing = profileById.get(editingId);
        if (!existing) return;
        await updateProfile({
          ...existing,
          name: formData.name,
          url: formData.url,
          token: formData.token || undefined,
          canvasPort: formData.canvasPort,
        });
      } else {
        await addProfile({
          name: formData.name,
          url: formData.url,
          token: formData.token || undefined,
          canvasPort: formData.canvasPort,
          isDefault: profiles.length === 0,
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save gateway profile:', err);
    }
  };

  const handleEdit = (profile: GatewayProfile) => {
    setFormData({
      name: profile.name,
      url: profile.url,
      token: profile.token || '',
      canvasPort: profile.canvasPort,
    });
    setEditingId(profile.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此网关配置吗？')) return;
    try {
      await removeProfile(id);
    } catch (err) {
      console.error('Failed to delete gateway profile:', err);
    }
  };

  const handleConnectToggle = async (profile: GatewayProfile) => {
    const status = getStatus(profile.id);
    try {
      if (status === 'connected' || status === 'connecting') {
        await disconnect(profile.id);
      } else {
        await connect(profile.id);
      }
    } catch (err) {
      console.error('Gateway connect/disconnect failed:', err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id);
    } catch (err) {
      console.error('Failed to set default gateway:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">网关配置</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            管理多个 OpenClaw Gateway 配置，并快速连接/切换。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormData(defaultFormData);
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600"
        >
          <Plus className="h-4 w-4" />
          添加网关
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
              {editingId ? '编辑网关' : '添加新网关'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              取消
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                名称
              </label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="本地网关"
                required
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                WebSocket URL
              </label>
              <input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="ws://127.0.0.1:18789"
                required
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Token（可选）
              </label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                placeholder="gateway token"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)]">
                Canvas 端口
              </label>
              <input
                type="number"
                value={formData.canvasPort}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    canvasPort: Number.isFinite(parseInt(e.target.value, 10))
                      ? parseInt(e.target.value, 10)
                      : 18793,
                  })
                }
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                {isLoading ? '保存中…' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <PlugZap className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="text-sm text-[var(--color-text-secondary)]">还没有配置网关</div>
            <div className="mt-1 text-xs text-[var(--color-text-muted)]">
              点击“添加网关”来创建第一个配置
            </div>
          </div>
        ) : (
          profiles.map((profile) => {
            const status = getStatus(profile.id);
            const isActive = activeProfileId === profile.id;

            return (
              <div
                key={profile.id}
                className={`
                  rounded-xl border border-[var(--color-border)] p-4
                  ${isActive ? 'bg-sky-50 dark:bg-sky-900/10' : 'bg-[var(--color-bg-secondary)]'}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(status)}`} />
                      <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {profile.name}
                      </div>
                      {profile.isDefault && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-text-muted)] truncate">
                      {profile.url} • Canvas {profile.canvasPort}
                    </div>
                    {status === 'error' && connections.get(profile.id)?.error && (
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        {connections.get(profile.id)?.error}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnectToggle(profile)}
                      disabled={status === 'connecting'}
                      className={`
                        rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50
                        ${status === 'connected' ? 'bg-red-500 hover:bg-red-600' : 'bg-sky-500 hover:bg-sky-600'}
                      `}
                    >
                      {status === 'connected' ? '断开' : status === 'connecting' ? '连接中…' : '连接'}
                    </button>

                    {!profile.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(profile.id)}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                      >
                        设为默认
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleEdit(profile)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(profile.id)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default GatewaySettings;
