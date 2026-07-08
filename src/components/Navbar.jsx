import { useState } from 'react';
import { ChevronDown, LogIn, LogOut, Moon, Plus, Sun, UserRound } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onHome, onCreate, onRequestAuth }) {
  const { isDark, toggle } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <button onClick={onHome} className="flex items-center gap-2 font-black text-xl text-qblue hover:text-qblue2 transition-colors shrink-0" aria-label="Quizlet home">
          <span className="bg-qblue text-white rounded-md w-8 h-8 flex items-center justify-center text-base font-black">Q</span>
          <span className="dark:text-white hidden sm:inline">Quizlet</span>
        </button>

        <div className="flex items-center gap-2">
          {user && (
            <button onClick={onCreate} className="secondary-button hidden sm:flex">
              <Plus size={17} /> Create
            </button>
          )}
          <button onClick={toggle} className="icon-button" title={isDark ? 'Light mode' : 'Dark mode'} aria-label={isDark ? 'Use light mode' : 'Use dark mode'}>
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen((value) => !value)} className="flex items-center gap-2 h-10 pl-1.5 pr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-expanded={menuOpen}>
                <span className="w-7 h-7 bg-qyellow text-gray-950 rounded-md flex items-center justify-center font-black text-sm">{profile?.displayName?.charAt(0).toUpperCase()}</span>
                <span className="hidden md:block text-sm font-black text-gray-800 dark:text-gray-200 max-w-32 truncate">{profile?.displayName}</span>
                <ChevronDown size={15} className="text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                    <div className="font-black text-gray-900 dark:text-white truncate">{profile?.displayName}</div>
                    <div className="text-xs font-semibold text-gray-500 truncate">{user.isDemo ? 'Local demo mode' : profile?.email}</div>
                  </div>
                  <button onClick={() => { onHome('mine'); setMenuOpen(false); }} className="menu-button"><UserRound size={17} /> My sets</button>
                  <button onClick={() => { onCreate(); setMenuOpen(false); }} className="menu-button sm:hidden"><Plus size={17} /> Create set</button>
                  <button onClick={() => { signOut(); setMenuOpen(false); onHome(); }} className="menu-button text-qred"><LogOut size={17} /> Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => onRequestAuth('signin')} className="primary-button">
              <LogIn size={17} /> <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
