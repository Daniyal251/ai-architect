import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { SavedAgentListItem } from '../types.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function MyAgentsPage() {
  const { token, username, logout } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<SavedAgentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = () => {
    setLoading(true);
    fetch(`${API_URL}/api/agents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const deleteAgent = async (id: string) => {
    await fetch(`${API_URL}/api/agents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAgents();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <header className="p-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
          >
            AI Architect
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/new')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg
                         text-sm font-medium hover:opacity-90 transition"
            >
              + Новый агент
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Выйти ({username})
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-8">
        <h2 className="text-3xl font-bold text-white mb-8">Мои агенты</h2>

        {loading ? (
          <div className="text-gray-400 text-center py-20 animate-pulse">Загружаем агентов...</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-6">🤖</p>
            <p className="text-2xl font-bold text-white mb-2">Пока нет агентов</p>
            <p className="text-gray-400 mb-8">
              Создайте первого AI-сотрудника для вашего бизнеса
            </p>
            <button
              onClick={() => navigate('/app/new')}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500
                         rounded-xl font-semibold hover:opacity-90 transition"
            >
              Создать агента
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6
                           hover:border-cyan-500/40 transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{agent.avatar}</div>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600
                               hover:text-red-400 transition text-lg leading-none"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">{agent.name}</h3>
                <p className="text-sm text-cyan-400 mb-3">{agent.role}</p>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{agent.idea}</p>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    {new Date(agent.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <button
                    onClick={() => navigate(`/app/agent/${agent.id}`)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500
                               rounded-lg text-sm font-medium hover:opacity-90 transition"
                  >
                    Открыть →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
