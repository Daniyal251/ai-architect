import { useState } from 'react';
import type { AgentResponse, GenerationProgress, DialogMessage } from '../types.js';

const API_URL = 'http://localhost:8000';

export function useAgentGenerator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dialogMessages, setDialogMessages] = useState<DialogMessage[]>([]);

  const subscribeToProgress = (sessionId: string): Promise<void> => {
    return new Promise((resolve) => {
      const eventSource = new EventSource(`${API_URL}/api/generate/${sessionId}/progress`);
      
      eventSource.onmessage = (event) => {
        const data: GenerationProgress = JSON.parse(event.data);
        setLoadingStage(data.stage);
        
        if (data.completed || data.error) {
          eventSource.close();
          resolve();
        }
      };
      
      eventSource.onerror = () => {
        eventSource.close();
        resolve();
      };
    });
  };

  const generateAgent = async (idea: string, dialogContext?: DialogMessage[]) => {
    console.log('generateAgent called with:', { idea, dialogContext });
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStage('Инициализация...');
    setDialogMessages(dialogContext || []);

    const token = localStorage.getItem('token');

    try {
      const body = dialogContext
        ? {
            original_idea: idea,
            messages: dialogContext,
          }
        : { idea };

      console.log('Sending request to /api/generate:', body);

      // Запускаем генерацию и подписываемся на прогресс одновременно
      const generatePromise = fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dialogContext ? body : { idea }),
      });

      // Ждём первый ответ для получения session_id
      const response = await generatePromise;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Ошибка генерации' }));
        throw new Error(errorData.detail || 'Ошибка генерации');
      }

      const data = await response.json();
      console.log('Generation response:', data);

      // Если есть session_id, подписываемся на SSE прогресс
      if (data.session_id) {
        setSessionId(data.session_id);
        await subscribeToProgress(data.session_id);
      }

      setResult(data);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Не удалось сгенерировать агента. Попробуйте снова.');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setSessionId(null);
    setDialogMessages([]);
  };

  return { loading, result, error, loadingStage, dialogMessages, generateAgent, reset };
}
