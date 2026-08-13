export const MAX_CSV_BYTES = 50 * 1024 * 1024;

export type FileGuardResult =
  | { ok: true }
  | { code: 'unsupported'; message: string; ok: false }
  | { code: 'too-large'; message: string; ok: false };

export function validateCsvFile(file: File): FileGuardResult {
  if (!file.name.toLocaleLowerCase().endsWith('.csv')) {
    return {
      code: 'unsupported',
      message: 'Выберите файл с расширением .csv.',
      ok: false,
    };
  }

  if (file.size > MAX_CSV_BYTES) {
    return {
      code: 'too-large',
      message: 'Файл больше 50 МБ. Выберите CSV меньшего размера.',
      ok: false,
    };
  }

  return { ok: true };
}
