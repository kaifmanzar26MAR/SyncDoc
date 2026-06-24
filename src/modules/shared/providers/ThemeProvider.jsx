'use client';

import { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { getAntdTheme } from '@shared/theme/antd-theme';

/** Light mode only — Google Docs aesthetic */
export function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeProvider({ children }) {
  useEffect(() => {
    applyDocumentTheme('light');
  }, []);

  return (
    <ConfigProvider theme={getAntdTheme('light')}>
      {children}
    </ConfigProvider>
  );
}
