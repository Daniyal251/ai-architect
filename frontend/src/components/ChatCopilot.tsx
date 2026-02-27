import { useState, useRef, useEffect } from 'react';
import type { AgentResponse, DialogMessage, ImplementationStep } from '../types.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dashboardContext: AgentResponse;
  agentId?: string;
  initialStep?: ImplementationStep | null; // шаг, с которого открыт чат
  initialMessage?: string | null;          // готовое сообщение для отправки
}

const API_URL = '';

export function ChatCopilot({ isOpen, onClose, dashboardContext, agentId, initialStep, initialMessage }: Props) {
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [currentStepContext, setCurrentStepContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const didAutoSend = useRef(false);

  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Когда открывается с конкретным шагом — автоматически отправляем запрос
  useEffect(() => {
    if (isOpen && initialStep && !didAutoSend.current) {
      didAutoSend.current = true;
      const stepMsg = `Помоги выполнить шаг: "${initialStep.task}" (${initialStep.duration})`;
      setCurrentStepContext(stepMsg);
      sendMessage(stepMsg, stepMsg);
    }
    if (isOpen && initialMessage && !initialStep && !didAutoSend.current) {
      didAutoSend.current = true;
      sendMessage(initialMessage, initialMessage);
    }
    if (!isOpen) {
      didAutoSend.current = false;
    }
  }, [isOpen, initialStep, initialMessage]);

  const sendMessage = async (messageText?: string, stepContext?: string) => {
    const messageToSend = messageText || input;
    if (!messageToSend.trim()) return;

    const userMessage: DialogMessage = { role: 'user', content: messageToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setSuggestedActions([]);

    try {
      const url = agentId
        ? `${API_URL}/api/agents/${agentId}/chat`
        : `${API_URL}/api/chat`;

      const currentStep = stepContext || currentStepContext || undefined;

      const body = agentId
        ? JSON.stringify({
            message: messageToSend,
            conversation_history: messages.slice(-10),
            current_step: currentStep,
          })
        : JSON.stringify({
            message: messageToSend,
            dashboard_context: dashboardContext,
            conversation_history: messages.slice(-10),
            current_step: currentStep,
          });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!response.ok) throw new Error('Ошибка чата');

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
      setSuggestedActions(data.suggested_actions || []);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте снова.' },
      ]);
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

  const agentName = dashboardContext.agent_profile.name;
  const hasStep = !!initialStep;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-white/10
                    shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-900/50 to-cyan-900/50">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">
              {hasStep ? '🎯 Помощник по выполнению' : '💬 Помощник'}
            </h3>
            {hasStep ? (
              <p className="text-xs text-cyan-400 mt-0.5 truncate">
                Шаг {initialStep.day}: {initialStep.task}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">
                {agentName} · {agentId ? 'История сохраняется' : 'Помогу довести до конца'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 ml-2 flex-shrink-0">
            ✕
          </button>
        </div>
        {/* Кнопка смены контекста */}
        {currentStepContext && (
          <button
            onClick={() => setCurrentStepContext(null)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-300 transition"
          >
            × Снять фокус с шага
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">👋 Привет!</p>
            <p className="text-sm">
              Я помогу вам <strong className="text-cyan-400">выполнить задачу</strong> шаг за шагом.
              <br />
              Задайте вопрос или нажмите «Помочь выполнить» на любом шаге плана.
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <p className="text-cyan-400 text-xs">Примеры вопросов:</p>
              <button
                onClick={() => sendMessage('С чего мне начать?')}
                className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10
                           rounded-lg text-gray-400 hover:text-gray-200 transition text-xs"
              >
                "С чего мне начать?"
              </button>
              <button
                onClick={() => sendMessage('Что мне нужно купить/найти в первую очередь?')}
                className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10
                           rounded-lg text-gray-400 hover:text-gray-200 transition text-xs"
              >
                "Что нужно купить/найти в первую очередь?"
              </button>
              <button
                onClick={() => sendMessage('Сколько это реально будет стоить?')}
                className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10
                           rounded-lg text-gray-400 hover:text-gray-200 transition text-xs"
              >
                "Сколько это реально будет стоить?"
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <p className="text-xs text-gray-400 mb-2">🎯 Следующие шаги:</p>
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
          placeholder={hasStep ? `Вопрос по шагу ${initialStep?.day}...` : 'Задайте вопрос...'}
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
