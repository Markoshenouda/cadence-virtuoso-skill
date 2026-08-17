'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/theme-provider';
import styles from './shell.module.css';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.themeToggle} role="group" aria-label="Theme selection">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
        title="Light Mode"
        aria-label="Light mode"
      >
        <Sun size={13} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
        title="Dark Mode (EDA Workstation)"
        aria-label="Dark mode"
      >
        <Moon size={13} />
      </button>
      <button
        type="button"
        onClick={() => setTheme('system')}
        className={`${styles.themeOption} ${theme === 'system' ? styles.themeOptionActive : ''}`}
        title="System Preference"
        aria-label="System preference"
      >
        <Monitor size={13} />
      </button>
    </div>
  );
}
