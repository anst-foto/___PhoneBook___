import { GENERAL_ERROR_KEY, useForm } from '../../hooks/useForm';
import type { FieldErrors } from '../../hooks/useForm';
import { FieldError } from '../FieldError/FieldError';
import styles from './AddItemForm.module.less';

export interface FormValues {
  readonly name: string;
  readonly phone: string;
}

interface Props {
  readonly onSubmit: (values: FormValues) => Promise<FieldErrors | void>;
  readonly disabled?: boolean;
}

const INITIAL: FormValues = { name: '', phone: '' };

const validate = (values: FormValues): FieldErrors => {
  const errors: Record<string, readonly string[]> = {};
  if (values.name.trim() === '') errors.name = ['Имя не может быть пустым.'];
  if (values.phone.trim() === '') errors.phone = ['Телефон не может быть пустым.'];
  return errors;
};

export const AddItemForm = ({ onSubmit, disabled = false }: Props) => {
  const { values, errors, submitting, setField, submit } = useForm({
    initial: INITIAL,
    validate,
    onSubmit,
  });

  const generalErrors = errors[GENERAL_ERROR_KEY];
  const isBusy = disabled || submitting;

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {generalErrors && generalErrors.length > 0 && (
        <div className={styles.generalError} role="alert">
          {generalErrors.join(' ')}
        </div>
      )}

      <div className={styles.field}>
        <label htmlFor="phonebook-name">Имя</label>
        <input
          id="phonebook-name"
          type="text"
          autoComplete="off"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          disabled={isBusy}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        <FieldError messages={errors.name} />
      </div>

      <div className={styles.field}>
        <label htmlFor="phonebook-phone">Телефон</label>
        <input
          id="phonebook-phone"
          type="tel"
          autoComplete="off"
          value={values.phone}
          onChange={(event) => setField('phone', event.target.value)}
          disabled={isBusy}
          aria-invalid={errors.phone ? 'true' : 'false'}
        />
        <FieldError messages={errors.phone} />
      </div>

      <button type="submit" className={styles.submit} disabled={isBusy}>
        {submitting ? 'Добавление…' : 'Добавить'}
      </button>
    </form>
  );
};
