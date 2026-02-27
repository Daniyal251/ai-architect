import { useState, useEffect } from 'react';
import { Landing } from './components/Landing';
import { LoadingScreen } from './components/LoadingScreen';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { ClarificationDialog } from './components/ClarificationDialog';
import { useAgentGenerator } from './hooks/useAgentGenerator';
import type { DialogMessage } from './types.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [idea, setIdea] = useState('');
  const [showClarification, setShowClarification] = useState(false);
  const [dialogMessages, setDialogMessages] = useState<DialogMessage[]>([]);
  
  const { loading, result, loadingStage, generateAgent, reset } = useAgentGenerator();

  useEffect(() => {
    // Проверяем сохранённый токен
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    if (token && storedUsername) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
  }, []);

  const handleAuthSuccess = (token: string, user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername('');
    reset();
  };

  const handleSubmit = (userIdea: string) => {
    setIdea(userIdea);
    setShowClarification(true);
  };

  const handleClarificationComplete = (messages: DialogMessage[]) => {
    setShowClarification(false);
    setDialogMessages(messages);
    generateAgent(idea, messages);
  };

  const handleSkipClarification = () => {
    setShowClarification(false);
    generateAgent(idea);
  };

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (showClarification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <header className="p-4 border-b border-white/10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              AI Architect
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
            >
              Выйти ({username})
            </button>
          </div>
        </header>
        <ClarificationDialog
          idea={idea}
          onComplete={handleClarificationComplete}
          onSkip={handleSkipClarification}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {loading ? (
        <LoadingScreen stage={loadingStage} />
      ) : result ? (
        <Dashboard data={result} onReset={reset} username={username} onLogout={handleLogout} />
      ) : (
        <Landing onSubmit={handleSubmit} loading={loading} />
      )}
    </div>
  );
}

export default App;
