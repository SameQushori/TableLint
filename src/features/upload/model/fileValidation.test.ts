import { MAX_CSV_BYTES, validateCsvFile } from './fileValidation';

function createSizedFile(name: string, size: number) {
  const file = new File([''], name, { type: 'text/csv' });
  Object.defineProperty(file, 'size', { configurable: true, value: size });
  return file;
}

describe('validateCsvFile', () => {
  it('accepts a CSV regardless of MIME hint', () => {
    const file = new File(['name\nАнна'], 'contacts.CSV', {
      type: 'application/octet-stream',
    });

    expect(validateCsvFile(file)).toEqual({ ok: true });
  });

  it('rejects a non-CSV extension', () => {
    const result = validateCsvFile(new File(['name'], 'contacts.xlsx'));

    expect(result).toMatchObject({ code: 'unsupported', ok: false });
  });

  it('rejects a CSV larger than 50 MB', () => {
    const result = validateCsvFile(
      createSizedFile('contacts.csv', MAX_CSV_BYTES + 1),
    );

    expect(result).toMatchObject({ code: 'too-large', ok: false });
  });
});
