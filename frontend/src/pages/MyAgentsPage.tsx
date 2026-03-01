import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { SavedAgentListItem } from '../types.js';

const API_URL = '';

export function MyAgentsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<SavedAgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchAgents = () => {
    setLoading(true);
    fetch(`${API_URL}/api/agents`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAgents(); }, []);

  const deleteAgent = async (id: string) => {
    setConfirmDelete(null);
    await fetch(`${API_URL}/api/agents/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-950 p-6">
      {/* Confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Удалить агента?</h3>
            <p className="text-gray-400 text-sm mb-5">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/20 transition">
                Отмена
              </button>
              <button onClick={() => deleteAgent(confirmDelete)}
                className="flex-1 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Все агенты</h1>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white
                         placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition w-44"
            />
            <button onClick={() => navigate('/app/new')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg
                         text-sm font-medium hover:opacity-90 transition">
              + Новый
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-20 animate-pulse">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🤖</p>
            <p className="text-xl font-bold text-white mb-2">
              {search ? 'Агенты не найдены' : 'Пока нет агентов'}
            </p>
            <p className="text-gray-400 text-sm mb-6">
              {search ? 'Попробуйте другой запрос' : 'Создайте первого AI-агента'}
            </p>
            {!search && (
              <button onClick={() => navigate('/app/new')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl text-sm font-medium hover:opacity-90 transition">
                Создать агента
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(agent => (
              <div key={agent.id}
                className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition group cursor-pointer"
                onClick={() => navigate(`/app/agent/${agent.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{agent.avatar}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(agent.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition text-sm p-1 rounded"
                    title="Удалить">
                    ✕
                  </button>
                </div>
                <h3 className="font-semibold text-white mb-0.5 truncate">{agent.name}</h3>
                <p className="text-xs text-cyan-400 mb-2 truncate">{agent.role}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{agent.idea}</p>
                <p className="text-xs text-gray-600">
                  {new Date(agent.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
