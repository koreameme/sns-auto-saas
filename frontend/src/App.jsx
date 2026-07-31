import React, { useState, useEffect } from 'react';
import './index.css';
import Dashboard from './pages/Dashboard';
import AuthModal from './pages/AuthModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('saas_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('saas_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('saas_user');
  };

  // If user is not logged in or account is pending approval
  if (!currentUser || currentUser.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
        <header className="px-8 py-5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">⚡</span>
            <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              SNS AutoSaaS Pro
            </span>
          </div>
          {currentUser && (
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 bg-amber-950 text-amber-400 border border-amber-800/40 rounded-full font-semibold">
                ⏳ 승인 대기중
              </span>
              <span className="text-slate-400">{currentUser.email}</span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-semibold"
              >
                로그아웃
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <AuthModal
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        </main>

        <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900">
          © 2026 SNS AutoSaaS Pro. All rights reserved.
        </footer>
      </div>
    );
  }

  // Once logged in, display the brand-new Standalone SaaS Dashboard UI directly!
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Dashboard currentUser={currentUser} onLogout={handleLogout} />
    </div>
  );
}
