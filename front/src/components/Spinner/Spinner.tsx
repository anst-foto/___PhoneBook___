import styles from './Spinner.module.less';

export const Spinner = () => (
  <span className={styles.spinner} role="status" aria-label="Загрузка" />
);