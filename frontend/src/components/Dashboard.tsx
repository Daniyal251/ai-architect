import type { AgentResponse, ImplementationStep } from '../types.js';
import { AgentProfile } from './AgentProfile';
import { FlowDiagram } from './FlowDiagram';
import { Timeline } from './Timeline';
import { ProjectMetrics } from './ProjectMetrics';
import { SystemPrompt } from './SystemPrompt';
import { ChatCopilot } from './ChatCopilot';
import { UpgradeModal } from './UpgradeModal';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  data: AgentResponse;
  agentId?: string;
  onReset: () => void;
  username: string;
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

export function Dashboard({ data, agentId, onReset }: DashboardProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<ImplementationStep | null>(null);
  const [chatInitialMessage, setChatInitialMessage] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { plan, usage } = useAuth();

  const canExportPdf = plan === 'starter' || plan === 'pro' || plan === 'admin';
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!canExportPdf) {
      setShowUpgrade(true);
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const element = document.getElementById('agent-content');
      if (!element) return;
      const canvas = await html2canvas(element, {
        scale: 1.5,
        backgroundColor: '#030712',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      let pos = 0;
      let rem = imgH;
      while (rem > 0) {
        pdf.addImage(imgData, 'PNG', 0, -pos, pdfW, imgH);
        rem -= pdfH;
        pos += pdfH;
        if (rem > 0) pdf.addPage();
      }
      const name = (data.agent_profile?.name || 'agent').replace(/[^\w\u0400-\u04FF]/g, '_');
      pdf.save(`${name}.pdf`);
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setExporting(false);
    }
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
        <header className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-white">
            {data.agent_profile?.name || 'Архитектура агента'}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <UsageBadge />
            <button
              onClick={openChat}
              className="px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30
                         text-cyan-400 rounded-lg hover:opacity-80 transition text-sm flex items-center gap-1.5"
            >
              💬 Помощник
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className={`px-3 py-2 rounded-lg transition text-sm flex items-center gap-1.5 ${
                canExportPdf
                  ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                  : 'bg-white/5 text-gray-500 hover:bg-white/10'
              }`}
              title={canExportPdf ? 'Экспорт в PDF' : 'Доступно на тарифе Starter+'}
            >
              {exporting ? '⏳' : '📄'} PDF {!canExportPdf && <span className="text-xs">🔒</span>}
            </button>
            <button
              onClick={onReset}
              className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg hover:opacity-90 transition text-sm"
            >
              + Новый
            </button>
          </div>
        </header>

        <div id="agent-content" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
