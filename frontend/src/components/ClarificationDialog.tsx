import { useState, useRef, useEffect } from 'react';
import type { DialogMessage, ClarifyResponse } from '../types.js';

interface Props {
  idea: string;
  onComplete: (messages: DialogMessage[]) => void;
  onSkip: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function ClarificationDialog({ idea, onComplete }: Props) {
  const [messages, setMessages] = useState<DialogMessage[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'initial' | 'dialog' | 'complete'>('initial');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem('token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Начальный анализ идеи
  useEffect(() => {
    const analyzeIdea = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/clarify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ idea }),
        });

        const data: ClarifyResponse = await response.json();
        console.log('Clarify response:', data);

        if (data.needs_clarification && data.questions.length > 0) {
          setQuestions(data.questions);
          setStep('dialog');
          // Добавляем первое сообщение с идеей
          setMessages([
            { role: 'user', content: idea },
            { role: 'assistant', content: 'У меня есть несколько уточняющих вопросов:' }
          ]);
        } else {
          // Вопросы не нужны, сразу переходим к генерации
          console.log('No clarification needed, generating...');
          onComplete([
            { role: 'user', content: idea },
            { role: 'assistant', content: data.summary || idea }
          ]);
        }
      } catch (err) {
        console.error('Clarify error:', err);
        // При ошибке сразу переходим к генерации
        onComplete([{ role: 'user', content: idea }]);
      } finally {
        setLoading(false);
      }
    };

    analyzeIdea();
  }, [idea, onComplete, token]);

  const handleAnswerSubmit = (question: string, index: number) => {
    const newMessages: DialogMessage[] = [
      ...messages,
      { role: 'assistant', content: question },
      { role: 'user', content: currentAnswer },
    ];
    console.log('Answer submitted, new messages:', newMessages);
    setMessages(newMessages);
    setCurrentAnswer('');

    // Удаляем отвеченный вопрос
    const remainingQuestions = questions.filter((_, i) => i !== index);
    console.log('Remaining questions:', remainingQuestions);

    if (remainingQuestions.length === 0) {
      setStep('complete');
      console.log('All questions answered, calling onComplete...');
      // Передаем все сообщения включая оригинальную идею
      setTimeout(() => onComplete(newMessages), 500);
    } else {
      setQuestions(remainingQuestions);
    }
  };

  const handleSkipAll = () => {
    onComplete([{ role: 'user', content: idea }]);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-300">Анализирую идею...</p>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
          <p className="text-green-400 text-lg mb-2">✅ Готово!</p>
          <p className="text-gray-300">Перехожу к генерации агента...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Уточнение требований</h3>
          <button
            onClick={handleSkipAll}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            Пропустить вопросы →
          </button>
        </div>

        {/* История сообщений */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100'
                    : 'bg-purple-500/20 border border-purple-500/30 text-purple-100'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Текущий вопрос */}
        {questions.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
              <p className="text-purple-200 font-medium mb-3">
                ❓ {questions[0]}
              </p>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Ваш ответ..."
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                           text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 
                           focus:ring-1 focus:ring-purple-500 transition resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (currentAnswer.trim()) {
                      handleAnswerSubmit(questions[0], 0);
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  if (currentAnswer.trim()) {
                    handleAnswerSubmit(questions[0], 0);
                  }
                }}
                disabled={!currentAnswer.trim()}
                className="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 
                           rounded-lg font-medium text-white hover:opacity-90 transition 
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ответить
              </button>
            </div>
            <p className="text-sm text-gray-400">
              Осталось вопросов: {questions.length - 1}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
