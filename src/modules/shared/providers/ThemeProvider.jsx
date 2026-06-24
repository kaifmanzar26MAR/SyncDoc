'use client';

import { ConfigProvider, theme as antTheme } from 'antd';
import { useAppStore } from '@shared/stores/useAppStore';

export default function ThemeProvider({ children }) {
  const appTheme = useAppStore((s) => s.theme);
  const isDark = appTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
