import { fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

import { UploadScreen } from '@features/upload/ui/UploadScreen';
import { renderWithApp } from '../../../test/renderWithApp';

function renderUploadScreen() {
  return renderWithApp(
    <Routes>
      <Route path="/" element={<UploadScreen />} />
      <Route path="/setup" element={<h1>CSV готов к настройке</h1>} />
    </Routes>,
  );
}

function fileListWith(file: File): FileList {
  return {
    0: file,
    item: (index: number) => (index === 0 ? file : null),
    length: 1,
    [Symbol.iterator]() {
      return [file].values();
    },
  };
}

describe('UploadScreen', () => {
  it('renders picker requirements and keyboard-accessible file input', () => {
    renderUploadScreen();

    expect(screen.getByLabelText('CSV файл на устройстве')).toHaveAttribute(
      'accept',
      '.csv,text/csv',
    );
    expect(screen.getByText('Размер файла — не больше 50 МБ')).toBeVisible();
  });

  it('shows unsupported and too-large errors', () => {
    renderUploadScreen();
    const input = screen.getByLabelText('CSV файл на устройстве');

    fireEvent.change(input, {
      target: { files: [new File(['test'], 'contacts.txt')] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Выберите файл с расширением .csv.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Выбрать другой' }));
    const largeFile = new File(['test'], 'large.csv');
    Object.defineProperty(largeFile, 'size', {
      configurable: true,
      value: 50 * 1024 * 1024 + 1,
    });
    fireEvent.change(screen.getByLabelText('CSV файл на устройстве'), {
      target: { files: [largeFile] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Файл больше 50 МБ');
  });

  it('handles drag-over and drop', async () => {
    renderUploadScreen();
    const heading = screen.getByRole('heading', {
      name: 'Перетащите CSV сюда',
    });
    const dropzone = heading.parentElement?.parentElement;
    expect(dropzone).not.toBeNull();

    const invalidFile = new File(['test'], 'contacts.doc');
    fireEvent.dragEnter(dropzone as HTMLElement);
    fireEvent.drop(dropzone as HTMLElement, {
      dataTransfer: { files: fileListWith(invalidFile) },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Выберите файл с расширением .csv.',
    );
  });

  it('opens the sample through the same pipeline and enters setup', async () => {
    renderUploadScreen();

    fireEvent.click(
      screen.getByRole('button', { name: 'Использовать пример' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'CSV готов к настройке' }),
    ).toBeVisible();
  });
});
