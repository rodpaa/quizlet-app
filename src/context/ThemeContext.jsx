import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Default to light unless user explicitly chose dark
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark';
    applyTheme(dark);
    return dark;
  });

  const toggle = () => {
    setIsDark(prev => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// The hook intentionally shares this module with its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);
