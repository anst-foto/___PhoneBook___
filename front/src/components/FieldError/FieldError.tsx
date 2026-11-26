import styles from './FieldError.module.less';

interface Props {
  readonly messages: readonly string[] | undefined;
}

export const FieldError = ({ messages }: Props) =>
  messages && messages.length > 0 ? (
    <ul className={styles.list}>
      {messages.map((message) => (
        <li key={message} className={styles.item}>
          {message}
        </li>
      ))}
    </ul>
  ) : null;