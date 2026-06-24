'use client';

import { useEffect, useRef } from 'react';
import { message } from 'antd';
import { formatApiError } from '@shared/utils/format-api-error';

function isBenignRejection(reason) {
  if (!reason) return true;
  if (reason?.name === 'AbortError') return true;
  const text = formatApiError(reason);
  return /saved locally|server unreachable|offline/i.test(text);
}

export default function ClientErrorNotifications() {
  const lastToastAt = useRef(0);

  useEffect(() => {
    const notify = (text) => {
      const now = Date.now();
      if (!text || now - lastToastAt.current < 4000) return;
      lastToastAt.current = now;
      message.warning(text, 4);
    };

    const onRejection = (event) => {
      if (isBenignRejection(event.reason)) {
        event.preventDefault?.();
        return;
      }
      notify(formatApiError(event.reason));
      event.preventDefault?.();
    };

    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  return null;
}
