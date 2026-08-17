'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './shell.module.css';

type BridgeState = 'loading' | 'online' | 'offline' | 'disabled';

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
        setMessage('Bridge status request failed.');
        setState('offline');
      }
    };
    check();
    const timer = setInterval(check, 60000);
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { cancelled = true; clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  const label = state === 'online' ? 'CADENCE BRIDGE ONLINE' : state === 'offline' ? 'CADENCE BRIDGE OFFLINE' : state === 'disabled' ? 'CADENCE BRIDGE DISABLED' : 'CHECKING BRIDGE…';
  return <Link href="/cadence" title={message || label} className={`${styles.bridge} ${state === 'online' ? styles.bridgeOnline : state === 'offline' ? styles.bridgeOffline : styles.bridgeLoading}`}><span className={styles.bridgeDot}/>{label}</Link>;
}
