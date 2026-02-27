import type { AgentResponse } from '../types.js';
import { AgentProfile } from './AgentProfile';
import { FlowDiagram } from './FlowDiagram';
import { Timeline } from './Timeline';
import { ROICalculator } from './ROICalculator';
import { SystemPrompt } from './SystemPrompt';
import { ChatCopilot } from './ChatCopilot';
import { useState } from 'react';

interface DashboardProps {
  data: AgentResponse;
  onReset: () => void;
  username: string;
  onLogout: () => void;
}

export function Dashboard({ data, onReset, username, onLogout }: DashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Архитектура ИИ-агента
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">👤 {username}</span>
            <button
              onClick={() => setIsChatOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg 
                         hover:opacity-90 transition flex items-center gap-2"
            >
              💬 Помощник
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              📄 Экспорт PDF
            </button>
            <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
              🔗 Поделиться
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg hover:opacity-90 transition"
            >
              Новый агент
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition"
            >
              Выйти
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AgentProfile profile={data.agent_profile} description={data.description} />
          <FlowDiagram code={data.mermaid_code} />
          <Timeline steps={data.implementation_plan} />
          <ROICalculator roi={data.roi} />
          <SystemPrompt prompt={data.system_prompt} techStack={data.tech_stack} />
        </div>

        {data.risk_status !== 'normal' && (
          <div className={`mt-6 p-4 rounded-xl ${
            data.risk_status === 'high' ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500'
          } border`}>
            <p className="font-semibold">
              {data.risk_status === 'high' ? '⚠️ Высокий риск' : '⚡ Внимание'}
            </p>
            <p className="text-gray-300 text-sm mt-1">
              {data.risk_status === 'high' 
                ? 'Требуется уточнение бизнес-логики' 
                : 'Рекомендуется дополнительная проработка'}
            </p>
          </div>
        )}
      </div>

      {/* Chat Copilot */}
      <ChatCopilot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        dashboardContext={data}
      />
    </div>
  );
}
