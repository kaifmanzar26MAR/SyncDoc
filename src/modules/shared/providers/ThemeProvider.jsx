'use client';

import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { useAppStore } from '@shared/stores/useAppStore';
import { getAntdTheme } from '@shared/theme/antd-theme';

const THEME_STORAGE_KEY = 'syncdoc-theme';

export function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
}

export default function ThemeProvider({ children }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored !== theme) setTheme(stored);
    else applyDocumentTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyDocumentTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ConfigProvider theme={getAntdTheme(theme)}>
      {children}
    </ConfigProvider>
  );
}
