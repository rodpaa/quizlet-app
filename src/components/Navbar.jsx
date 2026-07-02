import { useTheme } from '../context/ThemeContext';

export default function Navbar({ onHome }) {
  const { isDark, toggle } = useTheme();
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-2 font-black text-xl text-qblue hover:text-qblue2 transition-colors"
        >
          <span className="bg-qblue text-white rounded-lg w-8 h-8 flex items-center justify-center text-base font-black">Q</span>
          <span className="dark:text-white">Quizlet</span>
        </button>
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
