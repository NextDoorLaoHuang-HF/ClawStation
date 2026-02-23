import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ChatPanel } from '../chat/ChatPanel';
import { SessionTabs } from '../session/SessionTabs';
import { InputArea } from '../chat/InputArea';

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
    </div>
  );
};
