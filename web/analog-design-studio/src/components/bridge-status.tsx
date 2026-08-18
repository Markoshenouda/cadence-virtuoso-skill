'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CheckCircle2, Loader2, PowerOff, Radio, XCircle } from 'lucide-react';
import styles from './shell.module.css';

export type BridgeState = 'loading' | 'online' | 'offline' | 'disabled';

export function BridgeStatus() {
  const [state, setState] = useState<BridgeState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch('/api/cadence/execute');
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        setMessage(typeof body?.message === 'string' ? body.message : '');
        setState(!body?.enabled ? 'disabled' : body?.reachable ? 'online' : 'offline');
      } catch {
        if (cancelled) return;
        setMessage('Cadence bridge connection attempt failed.');
        setState('offline');
      }
    };
    check();
    const timer = setInterval(check, 45000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const config = {
    online: {
      label: 'CADENCE ONLINE',
      subtext: 'IC6.1.7 Bridge Active',
      className: styles.bridgeOnline,
      icon: <Activity size={13} className={styles.bridgeIconPulse} />,
      dotClass: styles.dotOnline,
    },
    offline: {
      label: 'CADENCE OFFLINE',
      subtext: 'Bridge unreachable',
      className: styles.bridgeOffline,
      icon: <XCircle size={13} />,
      dotClass: styles.dotOffline,
    },
    disabled: {
      label: 'BRIDGE DISABLED',
      subtext: 'Local preview only',
      className: styles.bridgeDisabled,
      icon: <PowerOff size={13} />,
      dotClass: styles.dotDisabled,
    },
    loading: {
      label: 'CONNECTING...',
      subtext: 'Checking Virtuoso host',
      className: styles.bridgeLoading,
      icon: <Loader2 size={13} className={styles.spin} />,
      dotClass: styles.dotLoading,
    },
  }[state];

  return (
    <Link
      href="/cadence"
      title={message ? `${config.label}: ${message}` : config.label}
      className={`${styles.bridgeBadge} ${config.className}`}
    >
      <span className={styles.bridgeIconWrap}>{config.icon}</span>
      <div className={styles.bridgeTextWrap}>
        <span className={styles.bridgeLabel}>{config.label}</span>
      </div>
      <span className={`${styles.bridgeDot} ${config.dotClass}`} />
    </Link>
  );
}
