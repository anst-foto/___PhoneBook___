import type { PhoneBookItem } from '../../types';
import styles from './PhoneBookList.module.less';

interface Props {
  readonly items: readonly PhoneBookItem[];
}

export const PhoneBookList = ({ items }: Props) => {
  if (items.length === 0) {
    return <p className={styles.empty}>Записей пока нет.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.idCol}>#</th>
          <th>Имя</th>
          <th>Телефон</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td className={styles.idCol}>{item.id}</td>
            <td>{item.name}</td>
            <td className={styles.mono}>{item.number}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
