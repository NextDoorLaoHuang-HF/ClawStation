import React, { useEffect } from 'react';
import { X, Plug, Wifi } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { GatewaySettings } from './GatewaySettings';
import { PluginSettings } from './PluginSettings';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, settingsTab, closeSettings, setSettingsTab } = useUIStore();

  useEffect(() => {
    if (!isSettingsOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={closeSettings}
        aria-label="Close settings"
      />

      <div className="relative w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl flex">
        {/* Left nav */}
        <div className="w-56 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2">
          <div className="px-2 py-2 text-sm font-semibold text-[var(--color-text-primary)]">
            Settings
          </div>

          <button
            type="button"
            onClick={() => setSettingsTab('gateway')}
            className={`
              w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors
              ${settingsTab === 'gateway'
                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            <Wifi className="w-4 h-4" />
            <span>Gateway</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsTab('plugins')}
            className={`
              w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors
              ${settingsTab === 'plugins'
                ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            <Plug className="w-4 h-4" />
            <span>Plugins</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {settingsTab === 'gateway' ? 'Gateway Settings' : 'Plugin Settings'}
            </div>
            <button
              type="button"
              onClick={closeSettings}
              className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto claw-scrollbar p-4">
            {settingsTab === 'gateway' ? <GatewaySettings /> : <PluginSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

