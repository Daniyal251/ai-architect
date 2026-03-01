import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { AgentResponse, GenerationProgress, DialogMessage } from '../types.js';

const API_URL = '';

/** Подписывается на SSE и резолвит Promise когда приходит финальный результат */
function waitForResult(
  sessionId: string,
  onStage: (stage: string) => void,
  esRef: React.MutableRefObject<EventSource | null>,
): Promise<AgentResponse> {
  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${API_URL}/api/generate/${sessionId}/progress`);
    esRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data: GenerationProgress & { result?: AgentResponse } = JSON.parse(event.data);

      if (data.stage) onStage(data.stage);

      if (data.error) {
        eventSource.close();
        esRef.current = null;
        reject(new Error(data.stage || 'Ошибка генерации'));
        return;
      }

      if (data.completed && data.result) {
        eventSource.close();
        esRef.current = null;
        resolve(data.result);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      esRef.current = null;
      reject(new Error('Потеряно соединение с сервером'));
    };
  });
}

export function useAgentGenerator() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState('');
  const esRef = useRef<EventSource | null>(null);

  // Закрываем SSE при размонтировании компонента
  useEffect(() => () => { esRef.current?.close(); }, []);

  const generateAgent = async (
    idea: string,
    dialogContext?: DialogMessage[],
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStage('Инициализация...');

    try {
      // idea всегда включаем — Pydantic требует его как обязательное поле
      const body = dialogContext
        ? { idea, original_idea: idea, messages: dialogContext }
        : { idea };

      // 1. Запускаем генерацию — бэкенд возвращает session_id сразу
      const startRes = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({ detail: 'Ошибка запуска генерации' }));
        if (startRes.status === 402) {
          const detail = err.detail || {};
          throw new Error(typeof detail === 'object'
            ? (detail.message || 'Лимит генераций исчерпан')
            : String(detail));
        }
        throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err));
      }

      const { session_id } = await startRes.json();

      // 2. Подписываемся на SSE — получаем прогресс в реальном времени + результат
      const data = await waitForResult(session_id, setLoadingStage, esRef);

      setResult(data);

      // 3. Автосохранение в БД
      try {
        const saveRes = await fetch(`${API_URL}/api/agents/save`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ idea, agent_data: data }),
        });

        if (saveRes.ok) {
          const { id } = await saveRes.json();
          return id;
        }
      } catch {
        // Автосохранение не критично
      }

      return null;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не удалось сгенерировать агента. Попробуйте снова.',
      );
      return null;
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
