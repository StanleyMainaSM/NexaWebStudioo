import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle top-[5rem] right-3 w-[5.75rem] justify-center px-2 md:top-4 md:right-4 md:w-auto md:justify-start md:px-3.5"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === 'light' ? <Moon aria-hidden="true" className="h-4 w-4" /> : <Sun aria-hidden="true" className="h-4 w-4" />}
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
