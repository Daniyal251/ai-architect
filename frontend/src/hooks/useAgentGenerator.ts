import { useState } from 'react';
import type { AgentResponse } from '../types.js';

const API_URL = 'http://localhost:8000';

export function useAgentGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState('');

  const generateAgent = async (idea: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const stages = [
      'Декомпозиция бизнес-задачи...',
      'Проектирование логической схемы интеграции...',
      'Отрисовка плана-графика внедрения...',
      'Расчет финансовой выгоды (ROI)...'
    ];

    // Имитация прогресса по этапам
    for (let i = 0; i < stages.length; i++) {
      setLoadingStage(stages[i]);
      await new Promise(r => setTimeout(r, 1500));
    }

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      if (!response.ok) throw new Error('Ошибка генерации');
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Не удалось сгенерировать агента. Попробуйте снова.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return { loading, result, error, loadingStage, generateAgent, reset };
}
