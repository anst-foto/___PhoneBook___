import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhoneBookList } from './PhoneBookList';

describe('PhoneBookList', () => {
  it('renders empty state', () => {
    render(<PhoneBookList items={[]} />);
    expect(screen.getByText('Записей пока нет.')).toBeInTheDocument();
  });

  it('renders one row per item', () => {
    render(
      <PhoneBookList
        items={[
          { id: 1, name: 'Ada Lovelace', number: '+1-555-0100' },
          { id: 2, name: 'Alan Turing', number: '+1-555-0101' },
        ]}
      />,
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('+1-555-0101')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
});
