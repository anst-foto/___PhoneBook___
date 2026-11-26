import styles from './ErrorMessage.module.less';

interface Props {
  readonly message: string;
}

export const ErrorMessage = ({ message }: Props) => (
  <div className={styles.root} role="alert">
    {message}
  </div>
);
