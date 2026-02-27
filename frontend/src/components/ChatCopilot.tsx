import { useState, useRef, useEffect } from 'react';
import type { AgentResponse, DialogMessage } from '../types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dashboardContext: AgentResponse;
}

const API_URL = 'http://localhost:8000';

export function ChatCopilot({ isOpen, onClose, dashboardContext }: Props) {
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input;
    if (!messageToSend.trim()) return;

    const userMessage: DialogMessage = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setSuggestedActions([]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageToSend,
          dashboard_context: dashboardContext,
          conversation_history: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Ошибка чата');

      const data = await response.json();
      
      const assistantMessage: DialogMessage = { 
        role: 'assistant', 
        content: data.response 
      };
      setMessages(prev => [...prev, assistantMessage]);
      setSuggestedActions(data.suggested_actions || []);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMessage: DialogMessage = { 
        role: 'assistant', 
        content: 'Извините, произошла ошибка. Попробуйте снова.' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-white/10 
                    shadow-2xl transform transition-transform duration-300 ease-in-out
                    flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/50 to-cyan-900/50">
        <div>
          <h3 className="text-lg font-semibold text-white">🤞 Чат-помощник</h3>
          <p className="text-xs text-gray-400">Помогу доработать архитектуру</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition p-2"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 Привет!</p>
            <p className="text-sm">
              Я помогу вам доработать архитектуру агента.<br/>
              Спросите меня о чём угодно!
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-cyan-400">Примеры вопросов:</p>
              <p className="text-gray-500">"Как интегрировать с Telegram?"</p>
              <p className="text-gray-500">"Замени Make.com на Python"</p>
              <p className="text-gray-500">"Распиши шаг 2 подробнее"</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-white/10 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 px-4 py-3 rounded-2xl">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <p className="text-xs text-gray-400 mb-2">💡 Подсказки:</p>
          <div className="space-y-1">
            {suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action)}
                className="block w-full text-left px-3 py-2 text-sm bg-white/5 
                           hover:bg-white/10 rounded-lg text-cyan-400 transition"
              >
                → {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                     text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 
                     focus:ring-1 focus:ring-cyan-500 transition resize-none"
          rows={3}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="mt-2 w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 
                     rounded-xl font-medium text-white hover:opacity-90 transition 
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
