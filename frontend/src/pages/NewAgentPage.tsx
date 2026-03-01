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
  const { usage, refreshUsage } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900">

      {/* Генерации — inline badge в верхней части страницы */}
      {(!isUnlimited || isWarning) && (
        <div className="flex justify-end px-6 pt-4">
          {!isUnlimited && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition
                ${isWarning
                  ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300'
                  : 'bg-white/5 border border-white/10 text-gray-400'
                }`}
              onClick={() => setShowUpgrade(true)}
            >
              <span>{genUsed}/{genLimit} генераций</span>
              {isWarning && <span className="text-xs">⚠️</span>}
            </div>
          )}
        </div>
      )}

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
