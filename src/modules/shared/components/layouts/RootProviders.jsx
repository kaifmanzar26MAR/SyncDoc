'use client';

import AuthProvider from '@shared/providers/AuthProvider';
import ThemeProvider from '@shared/providers/ThemeProvider';
import GlobalStateProvider from '@shared/providers/GlobalStateProvider';

export default function RootProviders({ children, session }) {
  return (
    <AuthProvider session={session}>
      <ThemeProvider>
        <GlobalStateProvider>{children}</GlobalStateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
