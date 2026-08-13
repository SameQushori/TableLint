import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { Button } from '@shared/ui/Button/Button';
import { Dialog } from '@shared/ui/Dialog/Dialog';
import { Input } from '@shared/ui/Input/Input';
import { Progress } from '@shared/ui/Progress/Progress';

function DialogHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть</Button>
      <Dialog
        description="Проверка диалога"
        onClose={() => setOpen(false)}
        open={open}
        title="Подтверждение"
      >
        <p>Содержимое</p>
      </Dialog>
    </>
  );
}

describe('visual primitives', () => {
  it('renders a native button and respects disabled state', () => {
    render(<Button disabled>Недоступно</Button>);

    expect(screen.getByRole('button', { name: 'Недоступно' })).toBeDisabled();
  });

  it('connects input label and validation message', () => {
    render(<Input error="Заполните поле" label="Название" />);

    const input = screen.getByRole('textbox', { name: 'Название' });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Заполните поле');
  });

  it('exposes bounded progress semantics', () => {
    render(<Progress label="Обработка" value={120} />);

    expect(
      screen.getByRole('progressbar', { name: 'Обработка' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });

  it('opens and closes a dialog with Escape and restores focus', () => {
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Открыть' });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Подтверждение' })).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Закрыть диалог' }),
    ).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps keyboard focus inside an open modal dialog', () => {
    render(
      <Dialog
        description="Проверка focus trap"
        onClose={() => undefined}
        open
        title="Подтверждение"
      >
        <button type="button">Первое действие</button>
        <button type="button">Последнее действие</button>
      </Dialog>,
    );
    const close = screen.getByRole('button', { name: 'Закрыть диалог' });
    const last = screen.getByRole('button', { name: 'Последнее действие' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });
});
