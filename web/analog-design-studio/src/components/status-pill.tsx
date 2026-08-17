import styles from './shell.module.css';

export type PillVariant = 'verified' | 'pass' | 'candidate' | 'coming-soon' | 'fail' | 'offline';

const variantClass: Record<PillVariant, string> = {
  verified: styles.pillVerified,
  pass: styles.pillVerified,
  candidate: styles.pillCandidate,
  'coming-soon': styles.pillSoon,
  fail: styles.pillFail,
  offline: styles.pillSoon,
};

export function StatusPill({ variant, children }: { variant: PillVariant; children: React.ReactNode }) {
  return <span className={`${styles.pill} ${variantClass[variant]}`}>{children}</span>;
}
