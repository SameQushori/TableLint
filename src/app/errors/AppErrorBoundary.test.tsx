import { render, screen } from '@testing-library/react';

import { AppErrorBoundary } from './AppErrorBoundary';

function BrokenComponent(): never {
  throw new Error('sensitive,row,value');
}

describe('AppErrorBoundary', () => {
  it('shows a privacy-safe recovery state without rendering error details', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'TableLint не смог продолжить',
    );
    expect(screen.queryByText('sensitive,row,value')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Перезагрузить приложение' }),
    ).toBeEnabled();
    consoleError.mockRestore();
  });
});
