import type { HealthCheck } from '../../hooks/useHealth';
import styles from './HealthIndicator.module.less';

interface Props {
  readonly label: string;
  readonly status: HealthCheck;
}

const CLASS_BY_STATUS: Record<HealthCheck, string> = {
  healthy: styles.healthy,
  unhealthy: styles.unhealthy,
  checking: styles.checking,
};

const TITLE_BY_STATUS: Record<HealthCheck, string> = {
  healthy: 'OK',
  unhealthy: 'Недоступно',
  checking: 'Проверка…',
};

export const HealthIndicator = ({ label, status }: Props) => (
  <div className={styles.root} title={TITLE_BY_STATUS[status]}>
    <span className={`${styles.dot} ${CLASS_BY_STATUS[status]}`} />
    <span className={styles.label}>{label}</span>
  </div>
);
