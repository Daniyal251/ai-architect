import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from '../components/Dashboard';
import type { AgentResponse } from '../types.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AgentPage() {
  const { id } = useParams<{ id: string }>();
  const { token, username, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/api/agents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Агент не найден');
        return r.json();
      })
      .then((agent) => {
          const fr = agent.full_response;
          // Обратная совместимость: старые агенты хранят roi вместо project_metrics
          if (!fr.project_metrics && fr.roi) {
            fr.project_metrics = {
              project_type: 'business',
              key_metrics: [
                { label: 'Экономия времени', value: String(fr.roi.hours_saved), unit: 'часов/мес' },
                { label: 'Экономия средств', value: String(fr.roi.cost_saved), unit: '₽/мес' },
              ],
              resources_needed: [],
            };
          }
          setData(fr);
        })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <p className="text-white text-xl animate-pulse">Загружаем агента...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-6">{error || 'Агент не найден'}</p>
          <button
            onClick={() => navigate('/app/agents')}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-white"
          >
            К списку агентов
          </button>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      data={data}
      agentId={id}
      onReset={() => navigate('/app/new')}
      username={username}
      onLogout={logout}
    />
  );
}
