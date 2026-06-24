const listeners = new Set();
let online = typeof navigator !== 'undefined' ? navigator.onLine : true;

export function isOnline() {
  return online;
}

export function subscribeNetwork(listener) {
  listeners.add(listener);
  listener(online);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => fn(online));
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true;
    notify();
  });
  window.addEventListener('offline', () => {
    online = false;
    notify();
  });
}

export class NetworkMonitor {
  constructor() {
    this.unsubscribe = null;
  }

  start(onStatusChange) {
    this.unsubscribe = subscribeNetwork(onStatusChange);
    return this.unsubscribe;
  }

  stop() {
    if (this.unsubscribe) this.unsubscribe();
  }

  getStatus() {
    return online ? 'online' : 'offline';
  }
}
