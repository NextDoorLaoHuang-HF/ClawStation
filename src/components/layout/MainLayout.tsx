import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatPanel } from '../chat/ChatPanel';
import { SessionTabs } from '../session/SessionTabs';
import { InputArea } from '../chat/InputArea';
import { SettingsModal } from '../settings/SettingsModal';
import { useGatewayStore } from '../../stores/gatewayStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useAgentStore } from '../../stores/agentStore';
import { events } from '../../lib/api';

/**
 * MainLayout - 应用主布局
 * 
 * 布局结构:
 * ┌─────────┬────────────────────────────────────────────┐
 * │ Sidebar │ Header                                     │
 * │         │ ┌────────────────────────────────────────┐ │
 * │         │ │ Session Tabs                           │ │
 * │         │ ├────────────────────────────────────────┤ │
 * │         │ │                                        │ │
 * │         │ │ Chat Panel / Canvas Panel / Files      │ │
 * │         │ │                                        │ │
 * │         │ └────────────────────────────────────────┘ │
 * │         │ ┌────────────────────────────────────────┐ │
 * │         │ │ Input Area                             │ │
 * │         │ └────────────────────────────────────────┘ │
 * └─────────┴────────────────────────────────────────────┘
 */
export const MainLayout: React.FC = () => {
  const initGatewayEvents = useGatewayStore((s) => s.initializeEvents);
  const loadGatewayProfiles = useGatewayStore((s) => s.loadProfiles);
  const cleanupGateway = useGatewayStore((s) => s.cleanup);

  const loadAgents = useAgentStore((s) => s.loadAgents);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const handleAgentEvent = useSessionStore((s) => s.handleAgentEvent);

  useEffect(() => {
    // Best-effort initialization; in non-Tauri dev this may fail and stores will show errors.
    initGatewayEvents().catch(() => {});
    loadGatewayProfiles().catch(() => {});
    loadAgents().catch(() => {});
    loadSessions().catch(() => {});

    let unlisten: (() => void) | null = null;
    let disposed = false;
    events.onAgent((evt) => handleAgentEvent(evt)).then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unlisten = fn;
    }).catch(() => {});

    return () => {
      disposed = true;
      cleanupGateway();
      if (unlisten) unlisten();
    };
  }, [
    initGatewayEvents,
    loadGatewayProfiles,
    cleanupGateway,
    loadAgents,
    loadSessions,
    handleAgentEvent,
  ]);

  return (
    <div className="flex h-screen w-full bg-[var(--color-bg-primary)] overflow-hidden">
      {/* 左侧边栏 - Agent 列表 */}
      <Sidebar />
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <Header />
        
        {/* 会话标签页 */}
        <SessionTabs />
        
        {/* 聊天面板 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatPanel />
        </div>
        
        {/* 输入区域 */}
        <InputArea />
      </div>

      {/* 设置弹窗 */}
      <SettingsModal />
    </div>
  );
};
