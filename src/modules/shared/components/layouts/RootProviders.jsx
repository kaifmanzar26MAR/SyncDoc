'use client';

import AuthProvider from '@shared/providers/AuthProvider';
import ThemeProvider from '@shared/providers/ThemeProvider';
import GlobalStateProvider from '@shared/providers/GlobalStateProvider';
import ClientErrorNotifications from '@shared/components/feedback/ClientErrorNotifications';

export default function RootProviders({ children, session }) {
  return (
    <AuthProvider session={session}>
      <ThemeProvider>
        <GlobalStateProvider>
          <ClientErrorNotifications />
          {children}
        </GlobalStateProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
