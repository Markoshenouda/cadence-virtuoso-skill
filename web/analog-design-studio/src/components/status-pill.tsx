import React from 'react';
import { Check, CheckCircle2, Clock, AlertTriangle, XCircle, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './shell.module.css';

export type PillVariant =
  | 'verified'
  | 'pass'
  | 'candidate'
  | 'coming-soon'
  | 'fail'
  | 'offline'
  | 'warning'
  | 'info';

interface StatusPillProps {
  variant: PillVariant;
  children: React.ReactNode;
  showIcon?: boolean;
}

export function StatusPill({ variant, children, showIcon = false }: StatusPillProps) {
  const getIcon = () => {
    switch (variant) {
      case 'verified':
      case 'pass':
        return <ShieldCheck size={11} className={styles.pillIcon} />;
      case 'candidate':
        return <Sparkles size={11} className={styles.pillIcon} />;
      case 'coming-soon':
      case 'offline':
        return <Clock size={11} className={styles.pillIcon} />;
      case 'fail':
        return <XCircle size={11} className={styles.pillIcon} />;
      case 'warning':
        return <AlertTriangle size={11} className={styles.pillIcon} />;
      default:
        return null;
    }
  };

  const variantClass = {
    verified: styles.pillVerified,
    pass: styles.pillPass,
    candidate: styles.pillCandidate,
    'coming-soon': styles.pillSoon,
    fail: styles.pillFail,
    offline: styles.pillOffline,
    warning: styles.pillWarning,
    info: styles.pillInfo,
  }[variant] || styles.pillInfo;

  return (
    <span className={`${styles.pill} ${variantClass}`}>
      {showIcon && getIcon()}
      <span className={styles.pillText}>{children}</span>
    </span>
  );
}
