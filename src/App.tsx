/**
 * Main App Component
 * Root application component with authentication and error boundary
 * @module App
 */

import { useEffect, useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, User, LogIn, Moon, Sun } from 'lucide-react';

function App() {
  const [userId, setUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  // Load user ID and dark mode preference from localStorage on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (savedUserId) {
      setUserId(savedUserId);
      setIsAuthenticated(true);
    } else {
      // Show login modal after a brief delay
      setTimeout(() => {
        setShowLoginModal(true);
      }, 100);
    }
    
    // Apply dark mode
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    setIsLoading(false);
  }, []);

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /**
   * Handle login submission
   */
  const handleLogin = () => {
    const trimmedId = loginInput.trim();
    if (trimmedId) {
      setUserId(trimmedId);
      localStorage.setItem('userId', trimmedId);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      setLoginInput('');
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    setUserId('');
    setIsAuthenticated(false);
    localStorage.removeItem('userId');
    localStorage.removeItem('chatSessionId');
    setShowLoginModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Login modal
  if (!isAuthenticated || showLoginModal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Crew Performance Assistant
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your Manning Team ID to continue
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  User ID
                </label>
                <input
                  id="userId"
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleLogin();
                    }
                  }}
                  placeholder="Enter your user ID"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={!loginInput.trim()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                This is a demo application. In production, this would use proper
                authentication.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* User info bar (optional) */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>User: {userId}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface />
      </div>
    </ErrorBoundary>
  );
}

export default App;
