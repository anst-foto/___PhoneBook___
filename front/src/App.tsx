import { useCallback } from 'react';
import { AddItemForm } from './components/AddItemForm/AddItemForm';
import type { FormValues } from './components/AddItemForm/AddItemForm';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import { HealthIndicator } from './components/HealthIndicator/HealthIndicator';
import { PhoneBookList } from './components/PhoneBookList/PhoneBookList';
import { Spinner } from './components/Spinner/Spinner';
import { GENERAL_ERROR_KEY } from './hooks/useForm';
import type { FieldErrors } from './hooks/useForm';
import { useHealth } from './hooks/useHealth';
import { usePhoneBook } from './hooks/usePhoneBook';
import styles from './App.module.less';

export const App = () => {
  const { items, loading, error, adding, add } = usePhoneBook();
  const { api, db } = useHealth();

  const handleSubmit = useCallback(
    async (values: FormValues): Promise<FieldErrors | void> => {
      const outcome = await add(values.name, values.phone);
      if (outcome.ok) return;
      if (outcome.fieldErrors) return outcome.fieldErrors;
      return {
        [GENERAL_ERROR_KEY]: [outcome.generalError ?? 'Неизвестная ошибка'],
      };
    },
    [add],
  );

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>PhoneBook</h1>
        <div className={styles.health}>
          <HealthIndicator label="API" status={api} />
          <HealthIndicator label="DB" status={db} />
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Добавить запись</h2>
        <AddItemForm onSubmit={handleSubmit} disabled={adding} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Записи</h2>
        {loading ? (
          <div className={styles.loading}>
            <Spinner />
            <span>Загрузка…</span>
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <PhoneBookList items={items} />
        )}
      </section>
    </div>
  );
};
