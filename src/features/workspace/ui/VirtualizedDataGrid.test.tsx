import { fireEvent, render, screen } from '@testing-library/react';

import type { ParsedDataset } from '@entities/dataset/model/types';
import type { ValidationIssue } from '@entities/issue/model/types';
import { VirtualizedDataGrid } from '@features/workspace/ui/VirtualizedDataGrid';

const scrollToIndex = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    paddingStart = 0,
  }: {
    count: number;
    estimateSize: (index: number) => number;
    paddingStart?: number;
  }) => ({
    getTotalSize: () => paddingStart + count * estimateSize(0),
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 12) }, (_, index) => ({
        end: paddingStart + (index + 1) * estimateSize(index),
        index,
        key: `row-${index + 1}`,
        lane: 0,
        size: estimateSize(index),
        start: paddingStart + index * estimateSize(index),
      })),
    scrollToIndex,
  }),
}));

function dataset(rows: string[][]): ParsedDataset {
  return {
    columns: [
      { confidence: 1, header: 'name', id: 'column-1', type: 'string' },
      { confidence: 1, header: 'email', id: 'column-2', type: 'email' },
    ],
    delimiter: ',',
    headers: ['name', 'email'],
    previewRows: rows.slice(0, 8),
    rowCount: rows.length,
    rows,
  };
}

const issue: ValidationIssue = {
  columnId: 'column-2',
  columnIndex: 1,
  id: 'column-2:email:row-1',
  message: 'Неверный email',
  originalValue: 'bad',
  rowId: 'row-1',
  rowIndex: 0,
  ruleId: 'column-2:email',
  ruleType: 'email',
  severity: 'error',
  suggestedFix: null,
};

describe('VirtualizedDataGrid', () => {
  beforeEach(() => scrollToIndex.mockClear());

  it('shows loading, error and empty states', () => {
    const { rerender } = render(
      <VirtualizedDataGrid state={{ status: 'loading' }} />,
    );
    expect(screen.getByText('Готовим таблицу')).toBeVisible();

    rerender(
      <VirtualizedDataGrid
        state={{ message: 'Worker завершился с ошибкой.', status: 'error' }}
      />,
    );
    expect(screen.getByText('Worker завершился с ошибкой.')).toBeVisible();

    rerender(
      <VirtualizedDataGrid
        state={{ dataset: dataset([]), issues: [], status: 'ready' }}
      />,
    );
    expect(screen.getByText('Нет строк для отображения')).toBeVisible();
  });

  it('renders a semantic, keyboard reachable grid with issue styling', () => {
    render(
      <VirtualizedDataGrid
        state={{
          dataset: dataset([
            ['Анна', 'bad'],
            ['Борис', 'boris@example.com'],
          ]),
          issues: [issue],
          status: 'ready',
        }}
      />,
    );

    const grid = screen.getByRole('grid', { name: 'Данные CSV' });
    expect(grid).toHaveAttribute('aria-rowcount', '3');
    expect(screen.getByRole('columnheader', { name: 'email' })).toBeVisible();

    const firstCell = screen.getByRole('gridcell', {
      name: 'name, строка 1: Анна',
    });
    const issueCell = screen.getByRole('gridcell', {
      name: /email, строка 1: bad, 1 проблема, ошибка/u,
    });
    expect(firstCell).toHaveAttribute('tabindex', '0');
    expect(issueCell).toHaveAttribute('data-severity', 'error');

    firstCell.focus();
    fireEvent.keyDown(firstCell, { key: 'ArrowRight' });
    expect(issueCell).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the rendered row DOM bounded for a large fixture', () => {
    const rows = Array.from({ length: 10_000 }, (_, index) => [
      `Строка ${index + 1}`,
      `person-${index + 1}@example.com`,
    ]);
    const { container } = render(
      <VirtualizedDataGrid
        state={{ dataset: dataset(rows), issues: [], status: 'ready' }}
      />,
    );

    const renderedRows = container.querySelectorAll('[data-row-index]');
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(50);
  });

  it('shows a dedicated clean dataset state', () => {
    render(
      <VirtualizedDataGrid
        state={{
          dataset: dataset([['Анна', 'anna@example.com']]),
          issues: [],
          status: 'ready',
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Проблем не найдено');
  });

  it('maps filtered rows and selected issues back to source coordinates', () => {
    render(
      <VirtualizedDataGrid
        rowIndices={[1, 3]}
        selectedIssue={{ ...issue, rowId: 'row-4', rowIndex: 3 }}
        state={{
          dataset: dataset([
            ['Анна', 'anna@example.com'],
            ['Борис', 'boris@example.com'],
            ['Вера', 'vera@example.com'],
            ['Глеб', 'bad'],
          ]),
          issues: [{ ...issue, rowId: 'row-4', rowIndex: 3 }],
          status: 'ready',
        }}
      />,
    );

    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '3');
    expect(
      screen.getByRole('gridcell', { name: /строка 4: bad/u }),
    ).toBeVisible();
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'center' });
  });

  it('edits inline from the keyboard without mutating the dataset', () => {
    const source = dataset([['Анна', 'bad']]);
    const onCellEdit = vi.fn();
    render(
      <VirtualizedDataGrid
        onCellEdit={onCellEdit}
        state={{ dataset: source, issues: [issue], status: 'ready' }}
      />,
    );

    fireEvent.keyDown(
      screen.getByRole('gridcell', {
        name: /email, строка 1: bad, 1 проблема, ошибка/u,
      }),
      { key: 'Enter' },
    );
    const editor = screen.getByRole('textbox', {
      name: 'Редактировать email, строка 1',
    });
    fireEvent.change(editor, { target: { value: 'fixed@example.com' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(
      {
        columnIndex: 1,
        header: 'email',
        rowIndex: 0,
        value: 'bad',
      },
      'fixed@example.com',
    );
    expect(source.rows[0]?.[1]).toBe('bad');
  });

  it('cancels inline editing with Escape', () => {
    const onCellEdit = vi.fn();
    render(
      <VirtualizedDataGrid
        onCellEdit={onCellEdit}
        state={{
          dataset: dataset([['Анна', 'bad']]),
          issues: [issue],
          status: 'ready',
        }}
      />,
    );

    const cell = screen.getByRole('gridcell', {
      name: /email, строка 1: bad/u,
    });
    fireEvent.doubleClick(cell);
    const editor = screen.getByRole('textbox', {
      name: 'Редактировать email, строка 1',
    });
    fireEvent.change(editor, { target: { value: 'discarded@example.com' } });
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it('reports the selected cell for the formula bar', () => {
    const onCellSelect = vi.fn();
    render(
      <VirtualizedDataGrid
        onCellSelect={onCellSelect}
        state={{
          dataset: dataset([['Анна', 'anna@example.com']]),
          issues: [],
          status: 'ready',
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('gridcell', {
        name: 'email, строка 1: anna@example.com',
      }),
    );

    expect(onCellSelect).toHaveBeenCalledWith({
      columnIndex: 1,
      header: 'email',
      rowIndex: 0,
      value: 'anna@example.com',
    });
  });

  it('supports page and dataset-boundary keyboard shortcuts with announcements', () => {
    const rows = Array.from({ length: 20 }, (_, index) => [
      `Строка ${index + 1}`,
      `person-${index + 1}@example.com`,
    ]);
    render(
      <VirtualizedDataGrid
        state={{ dataset: dataset(rows), issues: [issue], status: 'ready' }}
      />,
    );

    const firstCell = screen.getByRole('gridcell', {
      name: 'name, строка 1: Строка 1',
    });
    fireEvent.keyDown(firstCell, { key: 'PageDown' });
    expect(scrollToIndex).toHaveBeenCalledWith(10, { align: 'center' });
    expect(screen.getByText('Строка 11, name')).toBeInTheDocument();

    fireEvent.keyDown(firstCell, { ctrlKey: true, key: 'End' });
    expect(scrollToIndex).toHaveBeenCalledWith(19, { align: 'auto' });
    expect(screen.getByText('Строка 20, name')).toBeInTheDocument();
  });
});
