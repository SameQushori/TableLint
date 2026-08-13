export const SAMPLE_FILE_NAME = 'tablelint-sample.csv';

export const SAMPLE_CSV = `name,email,joined_at,status
Анна,anna@example.com,2025-01-12,active
Борис,boris.example.com,12/02/2025,active
Анна,anna@example.com,2025-01-12,ACTIVE
,maria@example.com,2025-03-01,pending`;

export function createSampleFile() {
  return new File([SAMPLE_CSV], SAMPLE_FILE_NAME, {
    lastModified: 1_735_689_600_000,
    type: 'text/csv;charset=utf-8',
  });
}
