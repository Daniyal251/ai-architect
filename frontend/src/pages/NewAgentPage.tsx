import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Landing } from '../components/Landing';
import { ClarificationDialog } from '../components/ClarificationDialog';
import { LoadingScreen } from '../components/LoadingScreen';
import { UpgradeModal } from '../components/UpgradeModal';
import { useAgentGenerator } from '../hooks/useAgentGenerator';
import type { DialogMessage } from '../types.js';

type Step = 'form' | 'clarification' | 'loading';

export function NewAgentPage() {
  const navigate = useNavigate();
  const { username, logout, usage, refreshUsage, plan } = useAuth();
  const [step, setStep] = useState<Step>('form');
  const [idea, setIdea] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { loading, loadingStage, error, generateAgent } = useAgentGenerator();

  const handleSubmit = (userIdea: string) => {
    // Проверяем лимит до уточнения
    if (usage && !usage.can_generate) {
      setShowUpgrade(true);
      return;
    }
    setIdea(userIdea);
    setStep('clarification');
  };

  const afterGenerate = async (agentId: string | null) => {
    await refreshUsage();
    if (agentId) {
      navigate(`/app/agent/${agentId}`);
    } else {
      setStep('form');
    }
  };

  const handleClarificationComplete = async (messages: DialogMessage[]) => {
    setStep('loading');
    afterGenerate(await generateAgent(idea, messages));
  };

  const handleSkipClarification = async () => {
    setStep('loading');
    afterGenerate(await generateAgent(idea));
  };

  if (loading || step === 'loading') {
    return <LoadingScreen stage={loadingStage} />;
  }

  // Счётчик генераций
  const genLimit = usage?.generations_limit ?? 3;
  const genUsed = usage?.generations_used ?? 0;
  const isUnlimited = genLimit === -1;
  const isWarning = !isUnlimited && genUsed >= genLimit - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <header className="p-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
          >
            AI Architect
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Счётчик генераций */}
            {!isUnlimited && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition
                  ${isWarning
                    ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
                    : 'bg-white/5 border border-white/10 text-gray-300'
                  }`}
                onClick={() => setShowUpgrade(true)}
                title="Нажми для апгрейда"
              >
                <span>{genUsed}/{genLimit}</span>
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isWarning ? 'bg-orange-400' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min(100, (genUsed / genLimit) * 100)}%` }}
                  />
                </div>
                {isWarning && <span className="text-xs">⚠️</span>}
              </div>
            )}
            {isUnlimited && (
              <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30">
                {plan === 'admin' ? '👑 Admin' : '∞ Pro'}
              </span>
            )}
            <button
              onClick={() => navigate('/app/agents')}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Мои агенты
            </button>
            <button
              onClick={() => navigate('/pricing')}
              className="px-3 py-1.5 text-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20
                         border border-cyan-500/30 text-cyan-400 rounded-lg hover:opacity-80 transition"
            >
              Тарифы
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Выйти ({username})
            </button>
          </div>
        </div>
      </header>

      {/* Ошибка лимита из хука (HTTP 402) */}
      {error && error.includes('генераци') && !showUpgrade && (
        <div className="max-w-2xl mx-auto mt-6 px-4">
          <div
            className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-4 text-orange-300 text-sm
                       cursor-pointer hover:bg-orange-500/20 transition"
            onClick={() => setShowUpgrade(true)}
          >
            {error} <span className="underline ml-1">Обновить тариф →</span>
          </div>
        </div>
      )}

      {error && !error.includes('генераци') && (
        <div className="max-w-2xl mx-auto mt-6 px-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {step === 'clarification' ? (
        <ClarificationDialog
          idea={idea}
          onComplete={handleClarificationComplete}
          onSkip={handleSkipClarification}
        />
      ) : (
        <Landing onSubmit={handleSubmit} loading={false} />
      )}

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        usage={usage}
        reason="generation"
      />
    </div>
  );
}
