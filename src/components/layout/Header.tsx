import React from 'react';
import { Menu, Minimize2, Maximize2, X, Wifi, WifiOff } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { useGatewayStore } from '../../stores/gatewayStore';

/**
 * Header - 顶部工具栏组件
 * 
 * 显示当前 Agent 信息、连接状态、窗口控制按钮
 */
export const Header: React.FC = () => {
  const { getCurrentAgent } = useAgentStore();
  const currentAgent = getCurrentAgent();

  const { profiles, connections, activeProfileId } = useGatewayStore();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const activeConn = activeProfileId ? connections.get(activeProfileId) : undefined;
  const status = activeConn?.status || 'disconnected';

  return (
    <div className="h-12 flex items-center justify-between px-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
      {/* 左侧 - 菜单按钮和标题 */}
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          onClick={() => {
            // TODO: 切换侧边栏显示
            console.log('Toggle sidebar');
          }}
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentAgent?.emoji || '🤖'}</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {currentAgent?.name || 'ClawStation'}
          </span>
        </div>
      </div>

      {/* 中间 - 连接状态 */}
      <div className="flex items-center gap-2 text-sm">
        {status === 'connected' ? <Wifi className="w-4 h-4 text-green-500" />
          : status === 'connecting' ? <Wifi className="w-4 h-4 text-amber-500" />
            : <WifiOff className="w-4 h-4 text-red-500" />
        }
        <span className="text-[var(--color-text-muted)]">
          {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting…' : 'Disconnected'}
          {activeProfile ? ` • ${activeProfile.name}` : ''}
        </span>
      </div>

      {/* 右侧 - 窗口控制 */}
      <div className="flex items-center gap-1">
        <WindowButton icon={<Minimize2 className="w-4 h-4" />} onClick={() => console.log('Minimize')} />
        <WindowButton icon={<Maximize2 className="w-4 h-4" />} onClick={() => console.log('Maximize')} />
        <WindowButton 
          icon={<X className="w-4 h-4" />} 
          onClick={() => console.log('Close')}
          className="hover:bg-red-500 hover:text-white"
        />
      </div>
    </div>
  );
};

/**
 * 窗口控制按钮
 */
interface WindowButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}

const WindowButton: React.FC<WindowButtonProps> = ({ icon, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors ${className}`}
    >
      {icon}
    </button>
  );
};
