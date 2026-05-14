'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

type ThemeMode = 'system' | 'light' | 'dark';

const modes: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

function applyTheme(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldUseDark);
  document.documentElement.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const saved = (window.localStorage.getItem('phyat-theme') as ThemeMode | null) ?? 'system';
    setMode(saved);
    applyTheme(saved);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystem = () => {
      if ((window.localStorage.getItem('phyat-theme') ?? 'system') === 'system') {
        applyTheme('system');
      }
    };
    media.addEventListener('change', syncSystem);
    return () => media.removeEventListener('change', syncSystem);
  }, []);

  function selectTheme(nextMode: ThemeMode) {
    window.localStorage.setItem('phyat-theme', nextMode);
    setMode(nextMode);
    applyTheme(nextMode);
  }

  function rotateTheme() {
    const currentIndex = modes.findIndex((item) => item.value === mode);
    const nextMode = modes[(currentIndex + 1) % modes.length].value;
    selectTheme(nextMode);
  }

  const activeMode = modes.find((item) => item.value === mode) ?? modes[0];
  const Icon = activeMode.icon;

  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label={`Current theme: ${activeMode.label}. Click to switch theme.`}
      title={`Theme: ${activeMode.label}`}
      onClick={rotateTheme}
    >
      <Icon size={16} />
    </button>
  );
}
