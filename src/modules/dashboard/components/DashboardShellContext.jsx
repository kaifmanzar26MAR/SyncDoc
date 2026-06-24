'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';

const DashboardShellContext = createContext(null);

export function DashboardShellProvider({ children, onRefresh: onRefreshProp }) {
  const refreshRef = useRef(onRefreshProp ?? null);
  const [, setRefreshVersion] = useState(0);

  useEffect(() => {
    refreshRef.current = onRefreshProp ?? refreshRef.current;
    if (onRefreshProp) {
      setRefreshVersion((v) => v + 1);
    }
  }, [onRefreshProp]);

  const registerOnRefresh = useCallback((fn) => {
    refreshRef.current = fn ?? null;
    setRefreshVersion((v) => v + 1);
  }, []);

  const onRefresh = useCallback(async () => {
    const handler = onRefreshProp ?? refreshRef.current;
    if (typeof handler === 'function') {
      await handler();
    }
  }, [onRefreshProp]);

  const hasRefresh = Boolean(onRefreshProp || refreshRef.current);

  const value = useMemo(
    () => ({ registerOnRefresh, onRefresh, hasRefresh }),
    [registerOnRefresh, onRefresh, hasRefresh],
  );

  return (
    <DashboardShellContext.Provider value={value}>{children}</DashboardShellContext.Provider>
  );
}

export function useDashboardShell() {
  const ctx = useContext(DashboardShellContext);
  if (!ctx) {
    throw new Error('useDashboardShell must be used within DashboardShell');
  }
  return ctx;
}

export function useRegisterDashboardRefresh(callback) {
  const { registerOnRefresh } = useDashboardShell();

  useEffect(() => {
    registerOnRefresh(callback);
    return () => registerOnRefresh(null);
  }, [callback, registerOnRefresh]);
}
