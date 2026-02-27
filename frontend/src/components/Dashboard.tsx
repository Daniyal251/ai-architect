import type { AgentResponse, ImplementationStep } from '../types.js';
import { AgentProfile } from './AgentProfile';
import { FlowDiagram } from './FlowDiagram';
import { Timeline } from './Timeline';
import { ProjectMetrics } from './ProjectMetrics';
import { SystemPrompt } from './SystemPrompt';
import { ChatCopilot } from './ChatCopilot';
import { UpgradeModal } from './UpgradeModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  data: AgentResponse;
  agentId?: string;
  onReset: () => void;
  username: string;
  onLogout: () => void;
}

function UsageBadge() {
  const { usage } = useAuth();
  if (!usage) return null;

  const isUnlimited = usage.generations_limit === -1;
  const percent = isUnlimited ? 100 : Math.round((usage.generations_used / usage.generations_limit) * 100);
  const isNearLimit = !isUnlimited && usage.generations_remaining <= 2;

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
      <div className="text-xs">
        <div className="font-medium text-gray-300">
          {isUnlimited ? '∞ генераций' : `${usage.generations_remaining} из ${usage.generations_limit}`}
        </div>
        <div className="text-gray-500">{usage.plan_name}</div>
      </div>
      {!isUnlimited && (
        <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isNearLimit ? 'bg-red-500' : percent > 50 ? 'bg-yellow-500' : 'bg-cyan-500'
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function Dashboard({ data, agentId, onReset, username, onLogout }: DashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<ImplementationStep | null>(null);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();
  const { plan, usage } = useAuth();

  const canExportPdf = plan === 'pro' || plan === 'admin';

  const handleExportPdf = () => {
    if (!canExportPdf) {
      setShowUpgrade(true);
      return;
    }
    // TODO: реальный PDF экспорт
    alert('PDF экспорт — скоро!');
  };

  const openChatForStep = (step: ImplementationStep) => {
    setActiveStep(step);
    setChatInitialMessage(null);
    setIsChatOpen(true);
  };

  const openChatWithMessage = (message: string) => {
    setActiveStep(null);
    setChatInitialMessage(message);
    setIsChatOpen(true);
  };

  const openChat = () => {
    setActiveStep(null);
    setChatInitialMessage(null);
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setActiveStep(null);
    setChatInitialMessage(null);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Архитектура ИИ-агента
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <UsageBadge />
            <span className="text-sm text-gray-400">👤 {username}</span>
            <button
              onClick={() => navigate('/pricing')}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
            >
              💳 Тарифы
            </button>
            <button
              onClick={() => navigate('/app/agents')}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
            >
              Мои агенты
            </button>
            <button
              onClick={openChat}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg
                         hover:opacity-90 transition flex items-center gap-2 text-sm"
            >
              💬 Помощник
            </button>
            <button
              onClick={handleExportPdf}
              className={`px-4 py-2 rounded-lg transition text-sm flex items-center gap-1 ${
                canExportPdf
                  ? 'bg-white/10 hover:bg-white/20'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
              title={canExportPdf ? 'Экспорт в PDF' : 'Доступно на тарифе Pro'}
            >
              📄 Экспорт PDF {!canExportPdf && <span className="text-xs">🔒</span>}
            </button>
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg hover:opacity-90 transition text-sm"
            >
              Новый агент
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-white/10 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition text-sm"
            >
              Выйти
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AgentProfile profile={data.agent_profile} description={data.description} />
          <FlowDiagram code={data.mermaid_code} />
          <Timeline steps={data.implementation_plan} onExecuteStep={openChatForStep} />
          <ProjectMetrics metrics={data.project_metrics} onHelpWithStep={openChatWithMessage} />
          <SystemPrompt prompt={data.system_prompt} techStack={data.tech_stack} />
        </div>

        {data.risk_status !== 'normal' && (
          <div className={`mt-6 p-4 rounded-xl border ${
            data.risk_status === 'high' ? 'bg-red-500/20 border-red-500' : 'bg-yellow-500/20 border-yellow-500'
          }`}>
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

      <ChatCopilot
        isOpen={isChatOpen}
        onClose={closeChat}
        dashboardContext={data}
        agentId={agentId}
        initialStep={activeStep}
        initialMessage={chatInitialMessage}
      />

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        usage={usage}
        reason="generation"
      />
    </div>
  );
}
