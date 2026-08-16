import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function PWAPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('Souvik OS Service Worker registered successfully.');
      }
    },
    onRegisterError(error) {
      console.error('Souvik OS Service Worker registration error:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      className="card card-elevated"
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        right: 'var(--space-4)',
        zIndex: 9999,
        maxWidth: '380px',
        padding: 'var(--space-4) var(--space-5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-4)',
        boxShadow: 'var(--shadow-float)',
        borderColor: 'var(--accent-primary)',
        animation: 'slideUpSpring var(--dur-normal) var(--ease-spring)',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
          Update Available
        </div>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          A new version of Souvik OS is ready to load.
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
        <button
          className="btn btn-primary"
          style={{ minHeight: '32px', padding: '0 var(--space-3)', fontSize: 'var(--font-size-xs)', gap: '4px' }}
          onClick={() => updateServiceWorker(true)}
        >
          <RefreshCw size={12} />
          Update
        </button>
        <button
          className="btn-icon"
          style={{ width: '28px', height: '28px' }}
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
