import React from 'react';
import { Bot, Settings, Plus, ChevronRight } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import type { AgentInfo } from '../../types';

/**
 * Sidebar - 左侧边栏组件
 * 
 * 显示 Agent 列表，支持切换当前 Agent
 */
export const Sidebar: React.FC = () => {
  const { agents, currentAgentId, setCurrentAgent, isLoading } = useAgentStore();

  const handleAgentClick = async (agentId: string) => {
    if (agentId !== currentAgentId && !isLoading) {
      await setCurrentAgent(agentId);
    }
  };

  return (
    <div className="w-64 h-full bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col">
      {/* Logo 区域 */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-[var(--color-text-primary)]">ClawStation</span>
        </div>
      </div>

      {/* Agent 列表 */}
      <div className="flex-1 overflow-y-auto claw-scrollbar py-2">
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider px-2 mb-2">
            Agents
          </div>
          
          <div className="space-y-1">
            {agents.map((agent) => (
              <AgentItem
                key={agent.id}
                agent={agent}
                isActive={agent.id === currentAgentId}
                onClick={() => handleAgentClick(agent.id)}
              />
            ))}
          </div>
        </div>

        {/* 新建 Agent 按钮 */}
        <div className="px-3 py-2">
          <button
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
            onClick={() => {
              // TODO: 打开新建 Agent 对话框
              console.log('Create new agent');
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Agent</span>
          </button>
        </div>
      </div>

      {/* 底部设置 */}
      <div className="p-3 border-t border-[var(--color-border)]">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          onClick={() => {
            // TODO: 打开设置
            console.log('Open settings');
          }}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
          <ChevronRight className="w-4 h-4 ml-auto" />
        </button>
      </div>
    </div>
  );
};

/**
 * Agent 列表项
 */
interface AgentItemProps {
  agent: AgentInfo;
  isActive: boolean;
  onClick: () => void;
}

const AgentItem: React.FC<AgentItemProps> = ({ agent, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={!agent.available}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
        ${isActive 
          ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' 
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
        }
        ${!agent.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span className="text-lg">{agent.emoji || '🤖'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{agent.name}</div>
        <div className="text-xs text-[var(--color-text-muted)] truncate">
          {agent.model}
        </div>
      </div>
      {isActive && (
        <div className="w-2 h-2 rounded-full bg-sky-500" />
      )}
    </button>
  );
};
