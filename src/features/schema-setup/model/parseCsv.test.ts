import type { CsvWorkerFailureCode } from '@shared/workers/csvWorkerContract';
import { CsvParseError, detectDelimiter, parseCsvText } from './parseCsv';

describe('detectDelimiter', () => {
  it.each([
    [',', 'name,email\nАнна,anna@example.com'],
    [';', 'name;email\nАнна;anna@example.com'],
    ['\t', 'name\temail\nАнна\tanna@example.com'],
    ['|', 'name|email\nАнна|anna@example.com'],
  ] as const)('detects %s', (delimiter, text) => {
    expect(detectDelimiter(text)).toBe(delimiter);
  });
});

describe('parseCsvText', () => {
  it('parses BOM, quotes and embedded newlines without changing strings', () => {
    const dataset = parseCsvText(
      '\uFEFFname,email,note\r\nАнна,anna@example.com,"две\nстроки"\r\nБорис,boris@example.com,ok',
    );

    expect(dataset.rowCount).toBe(2);
    expect(dataset.headers).toEqual(['name', 'email', 'note']);
    expect(dataset.rows[0]).toEqual([
      'Анна',
      'anna@example.com',
      'две\nстроки',
    ]);
    expect(dataset.columns[1]).toMatchObject({
      confidence: 1,
      type: 'email',
    });
  });

  it.each<readonly [string, CsvWorkerFailureCode]>([
    ['name,,email\nАнна,,a@example.com', 'INVALID_HEADERS'],
    ['name,name\nАнна,A', 'INVALID_HEADERS'],
    ['', 'EMPTY_FILE'],
    ['single header\nsingle value', 'UNSUPPORTED_DELIMITER'],
  ])('rejects invalid CSV %#', (text, code) => {
    expect(() => parseCsvText(text)).toThrowError(
      expect.objectContaining<Partial<CsvParseError>>({ code }),
    );
  });
});
